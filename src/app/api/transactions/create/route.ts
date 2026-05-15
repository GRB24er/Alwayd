// FILE: src/app/api/admin/create-transaction/route.ts
// FIXED - ADMIN CAN CREATE ANY TRANSACTION (NO BALANCE CHECKS)

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { sendTransactionEmail } from '@/lib/mail';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const { 
      userId,
      type, 
      amount, 
      accountType, 
      description, 
      status = 'completed'
    } = body;

    console.log('Admin transaction request:', { userId, type, amount, accountType, status });

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!type || !amount) {
      return NextResponse.json(
        { error: 'Type and amount are required' },
        { status: 400 }
      );
    }

    await connectDB();
    
    const user = await User.findById(userId);
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

    // Determine if credit or debit
    const isCredit = ['deposit', 'transfer-in', 'interest', 'adjustment-credit'].includes(type);
    
    // ALWAYS POSITIVE AMOUNT
    const transactionAmount = Math.abs(Number(amount));
    
    if (isNaN(transactionAmount) || transactionAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    const balanceChange = isCredit ? transactionAmount : -transactionAmount;
    const newBalance = currentBalance + balanceChange;

    console.log('Balance calculation:', {
      currentBalance,
      transactionAmount,
      balanceChange,
      newBalance,
      isCredit
    });

    // ⚠️ ADMIN OVERRIDE: Allow negative balances
    // Admin can create any transaction regardless of balance
    // Just log a warning if balance goes negative
    if (newBalance < 0) {
      console.warn('⚠️ Admin creating transaction that results in negative balance:', {
        user: user.email,
        accountType,
        newBalance
      });
    }

    const reference = `ADM-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const transaction = await Transaction.create({
      userId: user._id,
      type,
      amount: transactionAmount, // POSITIVE
      description: description || `Admin ${type}`,
      status,
      accountType,
      reference,
      currency: 'USD',
      posted: status === 'completed',
      postedAt: status === 'completed' ? new Date() : null,
      date: new Date(),
      channel: 'admin',
      origin: 'admin_panel'
    });

    console.log('Transaction created:', transaction._id);

    // Update balance ONLY if status is completed
    if (status === 'completed') {
      (user as any)[balanceField] = newBalance;
      await user.save();
      console.log('Balance updated:', { [balanceField]: newBalance });
    }

    // ✅ SEND EMAIL
    try {
      await sendTransactionEmail(user.email, {
        name: user.name || 'Customer',
        transaction
      });
      console.log('✅ Admin transaction email sent to:', user.email);
    } catch (emailError) {
      console.error('❌ Email failed:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${type} of $${transactionAmount}`,
      transaction: {
        _id: transaction._id,
        reference: transaction.reference,
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status,
        accountType: transaction.accountType
      },
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        [balanceField]: newBalance
      },
      balanceChange: {
        previous: currentBalance,
        new: newBalance,
        change: balanceChange
      }
    });

  } catch (error: any) {
    console.error('Admin transaction creation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process transaction',
        details: error.message
      },
      { status: 500 }
    );
  }
}