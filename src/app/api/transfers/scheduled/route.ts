// FILE: src/app/api/transfers/scheduled/route.ts
// COMPLETE FIXED VERSION - WITH EMAIL

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import mongoose from "mongoose";
import { sendTransactionEmail } from "@/lib/mail";

const scheduledTransferSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  fromAccount: { type: String, enum: ['checking', 'savings', 'investment'], required: true },
  toAccount: { type: String, required: true },
  toAccountType: { type: String, enum: ['internal', 'external'], required: true },
  amount: { type: Number, required: true, min: 0.01 },
  frequency: { type: String, enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually'], required: true },
  startDate: { type: Date, required: true },
  endDate: Date,
  nextExecutionDate: { type: Date, required: true },
  lastExecutionDate: Date,
  status: { type: String, enum: ['active', 'paused', 'completed', 'cancelled'], default: 'active' },
  executedCount: { type: Number, default: 0 },
  totalTransferred: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  memo: String,
  externalAccountDetails: {
    bankName: String,
    accountNumber: String,
    routingNumber: String,
    accountHolderName: String
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ScheduledTransfer = mongoose.models.ScheduledTransfer || 
  mongoose.model('ScheduledTransfer', scheduledTransferSchema);

function calculateNextExecutionDate(startDate: Date, frequency: string): Date {
  const nextDate = new Date(startDate);
  
  switch(frequency) {
    case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
    case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
    case 'biweekly': nextDate.setDate(nextDate.getDate() + 14); break;
    case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
    case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
    case 'annually': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
  }
  
  return nextDate;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const scheduledTransfers = await ScheduledTransfer.find({
      userId: user._id
    }).sort({ createdAt: -1 });

    let monthlyTotal = 0;
    scheduledTransfers.forEach(transfer => {
      if (transfer.status === 'active') {
        switch(transfer.frequency) {
          case 'daily': monthlyTotal += transfer.amount * 30; break;
          case 'weekly': monthlyTotal += transfer.amount * 4; break;
          case 'biweekly': monthlyTotal += transfer.amount * 2; break;
          case 'monthly': monthlyTotal += transfer.amount; break;
          case 'quarterly': monthlyTotal += transfer.amount / 3; break;
          case 'annually': monthlyTotal += transfer.amount / 12; break;
        }
      }
    });

    return NextResponse.json({
      success: true,
      transfers: scheduledTransfers,
      summary: {
        active: scheduledTransfers.filter(t => t.status === 'active').length,
        paused: scheduledTransfers.filter(t => t.status === 'paused').length,
        monthlyTotal,
        totalTransferred: scheduledTransfers.reduce((sum, t) => sum + t.totalTransferred, 0)
      }
    });

  } catch (error: any) {
    console.error('Get scheduled transfers error:', error);
    return NextResponse.json(
      { error: "Failed to fetch scheduled transfers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      fromAccount,
      toAccount,
      amount,
      frequency,
      startDate,
      endDate,
      memo,
      externalAccountDetails
    } = body;

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ALWAYS POSITIVE AMOUNT
    const transferAmount = Math.abs(parseFloat(amount));
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    const balanceField = fromAccount === 'savings' 
      ? 'savingsBalance' 
      : fromAccount === 'investment' 
      ? 'investmentBalance' 
      : 'checkingBalance';
    
    const currentBalance = (user as any)[balanceField] || 0;
    
    if (transferAmount > currentBalance) {
      return NextResponse.json(
        { 
          error: "Insufficient funds",
          required: transferAmount,
          available: currentBalance
        },
        { status: 400 }
      );
    }

    const nextExecutionDate = calculateNextExecutionDate(new Date(startDate), frequency);
    const isInternal = ['checking', 'savings', 'investment'].includes(toAccount);

    const scheduledTransfer = new ScheduledTransfer({
      userId: user._id,
      name,
      fromAccount,
      toAccount,
      toAccountType: isInternal ? 'internal' : 'external',
      amount: transferAmount,
      frequency,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      nextExecutionDate,
      status: 'active',
      memo,
      externalAccountDetails: !isInternal ? externalAccountDetails : undefined
    });

    await scheduledTransfer.save();

    // ✅ SEND EMAIL
    try {
      await sendTransactionEmail(user.email, {
        name: user.name || 'Customer',
        transaction: {
          _id: scheduledTransfer._id,
          type: 'scheduled-transfer',
          description: `Scheduled transfer "${name}" created (${frequency})`,
          amount: transferAmount,
          status: 'active',
          date: new Date(startDate),
          reference: scheduledTransfer._id.toString(),
          currency: 'USD',
          accountType: fromAccount,
          posted: false
        } as any
      });
      console.log('✅ Scheduled transfer email sent');
    } catch (emailError) {
      console.error('❌ Email failed:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Scheduled transfer created",
      transfer: scheduledTransfer
    });

  } catch (error: any) {
    console.error('Create scheduled transfer error:', error);
    return NextResponse.json(
      { error: "Failed to create scheduled transfer" },
      { status: 500 }
    );
  }
}