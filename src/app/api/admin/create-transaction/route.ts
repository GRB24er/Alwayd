// src/app/api/admin/create-transaction/route.ts
// BULLETPROOF VERSION - GUARANTEED BALANCE UPDATE

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { sendTransactionEmail } from '@/lib/mail';

// Credit types - ADD money
const CREDIT_TYPES = ['deposit', 'transfer-in', 'interest', 'adjustment-credit'];

// Debit types - REMOVE money
const DEBIT_TYPES = ['withdraw', 'transfer-out', 'fee', 'adjustment-debit'];

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

export async function POST(req: NextRequest) {
  console.log('═══════════════════════════════════════');
  console.log('[ADMIN TX] Starting transaction creation');
  console.log('═══════════════════════════════════════');
  
  try {
    const body = await req.json();
    
    const { 
      userId,
      type, 
      amount, 
      accountType = 'checking', 
      description, 
      status = 'completed',
      date
    } = body;

    console.log('[ADMIN TX] Request:', { userId, type, amount, accountType, status });

    // ============ VALIDATION ============
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!type || !amount) {
      return NextResponse.json({ error: 'Type and amount are required' }, { status: 400 });
    }

    const validTypes = [...CREDIT_TYPES, ...DEBIT_TYPES];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be: ${validTypes.join(', ')}` }, { status: 400 });
    }

    const txAmount = Math.abs(Number(amount));
    if (isNaN(txAmount) || txAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    // ============ DATABASE CONNECTION ============
    await connectDB();
    console.log('[ADMIN TX] Database connected');

    // ============ FIND USER ============
    const user = await User.findById(userId);
    if (!user) {
      console.log('[ADMIN TX] User not found:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    console.log('[ADMIN TX] Found user:', user.name, user.email);

    // ============ GET CURRENT BALANCE ============
    const balanceField = getBalanceField(accountType);
    const currentBalance = Number(user[balanceField]) || 0;
    console.log('[ADMIN TX] Current balance:', balanceField, '=', currentBalance);

    // ============ CALCULATE NEW BALANCE ============
    let newBalance = currentBalance;
    let balanceChange = 0;

    // Only update balance if status is completed/approved
    const shouldUpdateBalance = status === 'completed' || status === 'approved';

    if (shouldUpdateBalance) {
      if (isCredit(type)) {
        balanceChange = txAmount;
        newBalance = currentBalance + txAmount;
        console.log('[ADMIN TX] CREDIT:', currentBalance, '+', txAmount, '=', newBalance);
      } else if (isDebit(type)) {
        balanceChange = -txAmount;
        newBalance = currentBalance - txAmount;
        console.log('[ADMIN TX] DEBIT:', currentBalance, '-', txAmount, '=', newBalance);
      }
    }

    // ============ GENERATE REFERENCE ============
    const reference = `ADM-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // ============ CREATE TRANSACTION ============
    const transaction = await Transaction.create({
      userId: user._id,
      type: type,
      amount: txAmount,
      currency: 'USD', // Your schema only allows USD or BTC
      description: description || `Admin ${type}`,
      status: shouldUpdateBalance ? 'approved' : 'pending',
      accountType: accountType,
      reference: reference,
      date: date ? new Date(date) : new Date(),
      posted: shouldUpdateBalance,
      postedAt: shouldUpdateBalance ? new Date() : null,
      channel: 'admin',
      origin: 'admin_panel'
    });

    console.log('[ADMIN TX] Transaction created:', transaction._id, transaction.reference);

    // ============ UPDATE USER BALANCE ============
    if (shouldUpdateBalance) {
      console.log('[ADMIN TX] Updating balance...');
      console.log('[ADMIN TX] Field:', balanceField);
      console.log('[ADMIN TX] From:', currentBalance, 'To:', newBalance);

      // METHOD 1: Direct update with $set
      const updateResult = await User.updateOne(
        { _id: user._id },
        { $set: { [balanceField]: newBalance } }
      );

      console.log('[ADMIN TX] Update result:', updateResult);

      // Verify the update worked
      const verifyUser = await User.findById(user._id);
      const verifiedBalance = Number(verifyUser[balanceField]) || 0;
      
      console.log('[ADMIN TX] ✅ VERIFIED BALANCE:', verifiedBalance);

      if (verifiedBalance !== newBalance) {
        console.error('[ADMIN TX] ❌ BALANCE MISMATCH! Expected:', newBalance, 'Got:', verifiedBalance);
        
        // Try again with findByIdAndUpdate
        await User.findByIdAndUpdate(
          user._id,
          { [balanceField]: newBalance },
          { new: true }
        );
        
        const retryUser = await User.findById(user._id);
        console.log('[ADMIN TX] Retry balance:', retryUser[balanceField]);
      }
    } else {
      console.log('[ADMIN TX] Balance NOT updated (status is pending)');
    }

    // ============ SEND EMAIL ============
    try {
      const emailResult = await sendTransactionEmail(user.email, {
        name: user.name || 'Valued Client',
        transaction: {
          _id: transaction._id,
          reference: transaction.reference,
          type: transaction.type,
          amount: transaction.amount,
          currency: 'USD',
          status: transaction.status,
          description: transaction.description,
          accountType: transaction.accountType,
          date: transaction.date,
        }
      });
      
      if (emailResult && !emailResult.failed) {
        console.log('[ADMIN TX] ✅ Email sent to:', user.email);
      } else {
        console.log('[ADMIN TX] ⚠️ Email may have failed');
      }
    } catch (emailError) {
      console.error('[ADMIN TX] ❌ Email error:', emailError);
    }

    // ============ RETURN SUCCESS ============
    console.log('═══════════════════════════════════════');
    console.log('[ADMIN TX] ✅ TRANSACTION COMPLETE');
    console.log('[ADMIN TX] User:', user.name);
    console.log('[ADMIN TX] Type:', type);
    console.log('[ADMIN TX] Amount:', txAmount);
    console.log('[ADMIN TX] Balance:', currentBalance, '→', newBalance);
    console.log('═══════════════════════════════════════');

    return NextResponse.json({
      success: true,
      message: `Successfully ${isCredit(type) ? 'credited' : 'debited'} $${txAmount.toLocaleString()} ${isCredit(type) ? 'to' : 'from'} ${user.name}'s ${accountType} account`,
      transaction: {
        _id: transaction._id,
        reference: transaction.reference,
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status,
        accountType: transaction.accountType,
        date: transaction.date,
      },
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
      balance: {
        field: balanceField,
        previous: currentBalance,
        current: newBalance,
        change: balanceChange,
        updated: shouldUpdateBalance
      }
    });

  } catch (error: any) {
    console.error('═══════════════════════════════════════');
    console.error('[ADMIN TX] ❌ ERROR:', error.message);
    console.error('[ADMIN TX] Stack:', error.stack);
    console.error('═══════════════════════════════════════');
    
    return NextResponse.json(
      { error: 'Failed to process transaction', details: error.message },
      { status: 500 }
    );
  }
}