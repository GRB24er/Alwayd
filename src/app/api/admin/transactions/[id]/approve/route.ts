// src/app/api/admin/transactions/[id]/approve/route.ts
// APPROVE TRANSACTION - Updates balance and status

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { sendTransactionEmail } from '@/lib/mail';

// Credit types - ADD money
const CREDIT_TYPES = ['deposit', 'transfer-in', 'interest', 'adjustment-credit', 'refund'];

// Debit types - REMOVE money  
const DEBIT_TYPES = ['withdraw', 'transfer-out', 'fee', 'adjustment-debit', 'payment'];

function isCredit(type: string): boolean {
  return CREDIT_TYPES.includes(type);
}

function isDebit(type: string): boolean {
  return DEBIT_TYPES.includes(type);
}

function getBalanceField(accountType: string): string {
  if (accountType === 'savings') return 'savingsBalance';
  if (accountType === 'investment') return 'investmentBalance';
  return 'checkingBalance';
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('═══════════════════════════════════════');
  console.log('[APPROVE TX] Starting approval process');
  console.log('═══════════════════════════════════════');
  
  try {
    const { id } = params;
    const body = await request.json().catch(() => ({}));
    const { sendNotification = true, customMessage } = body;

    console.log('[APPROVE TX] Transaction ID:', id);

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    await connectDB();

    // Find the transaction
    const transaction = await Transaction.findById(id);
    
    if (!transaction) {
      console.log('[APPROVE TX] ❌ Transaction not found');
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    console.log('[APPROVE TX] Found transaction:', {
      reference: transaction.reference,
      type: transaction.type,
      amount: transaction.amount,
      status: transaction.status,
      accountType: transaction.accountType
    });

    // Check if already approved
    if (transaction.status === 'approved' || transaction.status === 'completed') {
      console.log('[APPROVE TX] ⚠️ Already approved');
      return NextResponse.json({ 
        error: 'Transaction is already approved',
        transaction: {
          _id: transaction._id,
          reference: transaction.reference,
          status: transaction.status
        }
      }, { status: 400 });
    }

    // Find the user
    const user = await User.findById(transaction.userId);
    if (!user) {
      console.log('[APPROVE TX] ❌ User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[APPROVE TX] User:', user.name, user.email);

    // Calculate balance update
    const balanceField = getBalanceField(transaction.accountType);
    const currentBalance = Number(user[balanceField]) || 0;
    const txAmount = Math.abs(Number(transaction.amount));
    
    let newBalance = currentBalance;
    let balanceChange = 0;

    if (isCredit(transaction.type)) {
      balanceChange = txAmount;
      newBalance = currentBalance + txAmount;
      console.log('[APPROVE TX] CREDIT:', currentBalance, '+', txAmount, '=', newBalance);
    } else if (isDebit(transaction.type)) {
      balanceChange = -txAmount;
      newBalance = currentBalance - txAmount;
      console.log('[APPROVE TX] DEBIT:', currentBalance, '-', txAmount, '=', newBalance);
    }

    // Update transaction status
    transaction.status = 'approved';
    transaction.posted = true;
    transaction.postedAt = new Date();
    transaction.approvedAt = new Date();
    transaction.approvedBy = 'admin';
    if (customMessage) {
      transaction.adminNotes = customMessage;
    }
    await transaction.save();

    console.log('[APPROVE TX] ✅ Transaction status updated to approved');

    // Update user balance
    const updateResult = await User.updateOne(
      { _id: user._id },
      { $set: { [balanceField]: newBalance } }
    );

    console.log('[APPROVE TX] 💰 Balance update result:', updateResult);

    // Verify the balance was updated
    const verifiedUser = await User.findById(user._id);
    const verifiedBalance = Number(verifiedUser[balanceField]) || 0;
    console.log('[APPROVE TX] ✅ Verified balance:', verifiedBalance);

    // Send email notification
    if (sendNotification) {
      try {
        await sendTransactionEmail(user.email, {
          name: user.name || 'Valued Client',
          transaction: {
            _id: transaction._id,
            reference: transaction.reference,
            type: transaction.type,
            amount: transaction.amount,
            currency: transaction.currency || 'USD',
            status: 'approved',
            description: transaction.description,
            accountType: transaction.accountType,
            date: transaction.date,
          }
        });
        console.log('[APPROVE TX] ✅ Email sent to:', user.email);
      } catch (emailError) {
        console.error('[APPROVE TX] ⚠️ Email failed:', emailError);
      }
    }

    // Check for linked internal transfer transaction
    if (transaction.origin === 'internal_transfer' && transaction.metadata?.linkedReference) {
      console.log('[APPROVE TX] 🔗 Found linked transaction:', transaction.metadata.linkedReference);
      
      const linkedTx = await Transaction.findOne({ 
        reference: transaction.metadata.linkedReference,
        status: 'pending'
      });
      
      if (linkedTx) {
        console.log('[APPROVE TX] 🔗 Auto-approving linked transaction');
        
        // Calculate linked balance update
        const linkedBalanceField = getBalanceField(linkedTx.accountType);
        const linkedCurrentBalance = Number(verifiedUser[linkedBalanceField]) || 0;
        const linkedAmount = Math.abs(Number(linkedTx.amount));
        
        let linkedNewBalance = linkedCurrentBalance;
        if (isCredit(linkedTx.type)) {
          linkedNewBalance = linkedCurrentBalance + linkedAmount;
        } else if (isDebit(linkedTx.type)) {
          linkedNewBalance = linkedCurrentBalance - linkedAmount;
        }
        
        // Update linked transaction
        linkedTx.status = 'approved';
        linkedTx.posted = true;
        linkedTx.postedAt = new Date();
        linkedTx.approvedAt = new Date();
        linkedTx.approvedBy = 'admin';
        await linkedTx.save();
        
        // Update linked balance
        await User.updateOne(
          { _id: user._id },
          { $set: { [linkedBalanceField]: linkedNewBalance } }
        );
        
        console.log('[APPROVE TX] ✅ Linked transaction approved, balance:', linkedBalanceField, '=', linkedNewBalance);
      }
    }

    console.log('═══════════════════════════════════════');
    console.log('[APPROVE TX] ✅ APPROVAL COMPLETE');
    console.log('[APPROVE TX] Balance:', currentBalance, '→', newBalance);
    console.log('═══════════════════════════════════════');

    return NextResponse.json({
      success: true,
      message: 'Transaction approved successfully',
      transaction: {
        _id: transaction._id,
        reference: transaction.reference,
        type: transaction.type,
        amount: transaction.amount,
        status: 'approved',
        accountType: transaction.accountType,
        posted: true
      },
      balance: {
        field: balanceField,
        previous: currentBalance,
        current: newBalance,
        change: balanceChange
      },
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error: any) {
    console.error('═══════════════════════════════════════');
    console.error('[APPROVE TX] ❌ ERROR:', error.message);
    console.error('═══════════════════════════════════════');
    
    return NextResponse.json(
      { error: 'Failed to approve transaction', details: error.message },
      { status: 500 }
    );
  }
}