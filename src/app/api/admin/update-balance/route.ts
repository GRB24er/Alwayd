// FILE: src/app/api/admin/update-balance/route.ts
// COMPLETE FIXED VERSION - WITH EMAIL

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { sendTransactionEmail } from '@/lib/mail';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userId, amount, type, currency = 'USD', description, accountType = 'checking' } = await req.json();

    if (!userId || !amount || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ALWAYS POSITIVE AMOUNT
    const adjustmentAmount = Math.abs(Number(amount));
    const transactionType = type === 'credit' ? 'adjustment-credit' : 'adjustment-debit';

    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const balanceField = accountType === 'savings' 
      ? 'savingsBalance' 
      : accountType === 'investment' 
      ? 'investmentBalance' 
      : 'checkingBalance';

    const currentBalance = (user as any)[balanceField] || 0;
    const isCredit = type === 'credit';
    const newBalance = isCredit 
      ? currentBalance + adjustmentAmount 
      : currentBalance - adjustmentAmount;

    if (!isCredit && newBalance < 0) {
      return NextResponse.json({ 
        error: 'Insufficient funds',
        currentBalance,
        requestedDebit: adjustmentAmount
      }, { status: 400 });
    }

    const transaction = new Transaction({
      userId: user._id,
      type: transactionType,
      amount: adjustmentAmount, // POSITIVE
      description: description || `Admin ${type} adjustment`,
      currency,
      status: 'completed',
      accountType,
      posted: true,
      postedAt: new Date(),
      date: new Date(),
      reference: `ADJ-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      channel: 'admin',
      origin: 'admin_adjustment'
    });

    await transaction.save();

    (user as any)[balanceField] = newBalance;
    await user.save();

    // ✅ SEND EMAIL
    try {
      await sendTransactionEmail(user.email, {
        name: user.name || 'Customer',
        transaction
      });
      console.log('✅ Admin balance adjustment email sent');
    } catch (emailError) {
      console.error('❌ Email failed:', emailError);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Balance ${type} applied`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        [balanceField]: newBalance
      },
      transaction: {
        _id: transaction._id,
        reference: transaction.reference,
        type: transaction.type,
        amount: transaction.amount
      },
      balanceChange: {
        previous: currentBalance,
        new: newBalance,
        change: isCredit ? adjustmentAmount : -adjustmentAmount
      }
    });
    
  } catch (err: any) {
    console.error('Admin balance update error:', err);
    return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
  }
}