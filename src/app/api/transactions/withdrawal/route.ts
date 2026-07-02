// src/app/api/transactions/withdrawal/route.ts
// WITHDRAWAL - CREATES PENDING TRANSACTION

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { sendTransactionEmail } from '@/lib/mail';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const { amount, description, accountType = 'checking' } = await request.json();
    
    // ALWAYS POSITIVE AMOUNT
    const withdrawalAmount = Math.abs(Number(amount));
    
    if (!withdrawalAmount || isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid withdrawal amount' }, 
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' }, 
        { status: 404 }
      );
    }

    const balanceField = accountType === 'savings' 
      ? 'savingsBalance' 
      : accountType === 'investment' 
      ? 'investmentBalance' 
      : 'checkingBalance';

    const currentBalance = (user as any)[balanceField] || 0;

    // Check if sufficient funds (just for validation)
    if (withdrawalAmount > currentBalance) {
      return NextResponse.json(
        { 
          error: 'Insufficient funds',
          available: currentBalance,
          requested: withdrawalAmount
        }, 
        { status: 400 }
      );
    }

    // Create PENDING transaction
    const transaction = await Transaction.create({
      userId: user._id,
      type: 'withdraw',
      amount: withdrawalAmount, // POSITIVE
      description: description || 'ATM Withdrawal',
      currency: 'USD',
      status: 'pending', // PENDING - awaits admin approval
      accountType,
      posted: false,
      postedAt: null,
      date: new Date(),
      reference: `WTH-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      channel: 'atm',
      origin: 'user_withdrawal'
    });

    console.log('[Withdrawal] 💾 Transaction created (pending):', transaction._id);

    // ✅ SEND EMAIL
    try {
      await sendTransactionEmail(user.email, {
        name: user.name || 'Customer',
        transaction
      });
      console.log('[Withdrawal] ✅ Email sent');
    } catch (emailError) {
      console.error('[Withdrawal] ❌ Email failed:', emailError);
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Withdrawal initiated. Awaiting admin approval.', 
        transaction: {
          id: transaction._id,
          reference: transaction.reference,
          amount: withdrawalAmount,
          status: 'pending',
          currentBalance: currentBalance
        }
      }, 
      { status: 201 }
    );
    
  } catch (err: any) {
    console.error('[Withdrawal] ❌ Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}