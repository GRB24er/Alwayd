// src/lib/scheduledTransferExecutor.ts
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { sendTransactionEmail } from '@/lib/mail';

// This service should run as a cron job or scheduled task
// You can use Vercel Cron Jobs, node-cron, or a separate service

interface ScheduledTransferDoc {
  _id: string;
  userId: string;
  name: string;
  fromAccount: string;
  toAccount: string;
  toAccountType: 'internal' | 'external';
  amount: number;
  frequency: string;
  nextExecutionDate: Date;
  lastExecutionDate?: Date;
  endDate?: Date;
  status: string;
  executedCount: number;
  totalTransferred: number;
  failedCount: number;
  memo?: string;
  externalAccountDetails?: {
    bankName: string;
    accountNumber: string;
    routingNumber: string;
    accountHolderName: string;
  };
}

export async function executeScheduledTransfers() {
  console.log('Starting scheduled transfer execution...');
  
  try {
    await connectDB();
    
    // Get the ScheduledTransfer model
    const ScheduledTransfer = mongoose.models.ScheduledTransfer;
    if (!ScheduledTransfer) {
      console.error('ScheduledTransfer model not found');
      return;
    }

    // Find all active transfers due for execution
    const now = new Date();
    const dueTransfers = await ScheduledTransfer.find({
      status: 'active',
      nextExecutionDate: { $lte: now }
    }).populate('userId');

    console.log(`Found ${dueTransfers.length} transfers to execute`);

    for (const transfer of dueTransfers) {
      try {
        await executeTransfer(transfer);
      } catch (error) {
        console.error(`Failed to execute transfer ${transfer._id}:`, error);
        
        // Update failed count
        transfer.failedCount = (transfer.failedCount || 0) + 1;
        
        // Pause transfer if too many failures
        if (transfer.failedCount >= 3) {
          transfer.status = 'paused';
          console.log(`Transfer ${transfer._id} paused due to repeated failures`);
        }
        
        await transfer.save();
      }
    }

    console.log('Scheduled transfer execution completed');
  } catch (error) {
    console.error('Error in scheduled transfer executor:', error);
  }
}

async function executeTransfer(transfer: any) {
  console.log(`Executing transfer: ${transfer.name}`);
  
  const user = await User.findById(transfer.userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Check source account balance
  const balanceField = transfer.fromAccount === 'savings' 
    ? 'savingsBalance' 
    : transfer.fromAccount === 'investment' 
    ? 'investmentBalance' 
    : 'checkingBalance';
  
  const currentBalance = user[balanceField] || 0;
  
  if (transfer.amount > currentBalance) {
    throw new Error('Insufficient funds');
  }

  // Generate reference
  const reference = `SCH-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  if (transfer.toAccountType === 'internal') {
    // Internal transfer between user's accounts
    const toBalanceField = transfer.toAccount === 'savings' 
      ? 'savingsBalance' 
      : transfer.toAccount === 'investment' 
      ? 'investmentBalance' 
      : 'checkingBalance';

    // Create debit transaction
    const debitTx = await Transaction.create({
      userId: user._id,
      type: 'transfer-out',
      currency: 'USD',
      amount: transfer.amount,
      description: `Scheduled transfer: ${transfer.name}`,
      status: 'completed',
      accountType: transfer.fromAccount,
      posted: true,
      postedAt: new Date(),
      reference: `${reference}-OUT`,
      channel: 'scheduled',
      origin: 'scheduled_transfer',
      date: new Date(),
      metadata: {
        scheduledTransferId: transfer._id,
        scheduledTransferName: transfer.name
      }
    });

    // Create credit transaction
    const creditTx = await Transaction.create({
      userId: user._id,
      type: 'transfer-in',
      currency: 'USD',
      amount: transfer.amount,
      description: `Scheduled transfer: ${transfer.name}`,
      status: 'completed',
      accountType: transfer.toAccount,
      posted: true,
      postedAt: new Date(),
      reference: `${reference}-IN`,
      channel: 'scheduled',
      origin: 'scheduled_transfer',
      date: new Date(),
      metadata: {
        scheduledTransferId: transfer._id,
        scheduledTransferName: transfer.name
      }
    });

    // Update user balances
    user[balanceField] = currentBalance - transfer.amount;
    user[toBalanceField] = (user[toBalanceField] || 0) + transfer.amount;
    await user.save();

  } else {
    // External transfer
    const externalTx = await Transaction.create({
      userId: user._id,
      type: 'external-transfer',
      currency: 'USD',
      amount: transfer.amount,
      description: `Scheduled external transfer: ${transfer.name}`,
      status: 'pending', // External transfers need approval
      accountType: transfer.fromAccount,
      posted: false,
      reference: reference,
      channel: 'scheduled',
      origin: 'scheduled_transfer',
      date: new Date(),
      metadata: {
        scheduledTransferId: transfer._id,
        scheduledTransferName: transfer.name,
        externalAccount: transfer.externalAccountDetails
      }
    });

    // Don't deduct balance yet for external transfers (pending approval)
  }

  // Update scheduled transfer record
  transfer.lastExecutionDate = new Date();
  transfer.executedCount = (transfer.executedCount || 0) + 1;
  transfer.totalTransferred = (transfer.totalTransferred || 0) + transfer.amount;

  // Calculate next execution date
  transfer.nextExecutionDate = calculateNextExecutionDate(
    transfer.nextExecutionDate,
    transfer.frequency
  );

  // Check if transfer should be completed
  if (transfer.endDate && transfer.nextExecutionDate > transfer.endDate) {
    transfer.status = 'completed';
    console.log(`Transfer ${transfer._id} completed (reached end date)`);
  }

  await transfer.save();

  // Send notification email
  try {
    await sendTransactionEmail(user.email, {
      name: user.name,
      transaction: {
        type: 'scheduled-transfer',
        description: `Scheduled transfer "${transfer.name}" executed`,
        amount: transfer.amount,
        reference: reference,
        status: 'completed',
        fromAccount: transfer.fromAccount,
        toAccount: transfer.toAccount
      }
    });
  } catch (emailError) {
    console.error('Failed to send email notification:', emailError);
  }

  console.log(`Transfer ${transfer._id} executed successfully`);
}

function calculateNextExecutionDate(currentDate: Date, frequency: string): Date {
  const nextDate = new Date(currentDate);
  
  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'annually':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }
  
  return nextDate;
}

// Export for use in API route or cron job
export default executeScheduledTransfers;