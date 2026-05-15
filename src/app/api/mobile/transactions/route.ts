// src/app/api/mobile/transactions/route.ts
// COPY THIS ENTIRE FILE TO YOUR WEB PROJECT

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';

// SAME SECRET AS YOUR authOptions.ts
const AUTH_SECRET = 'b3bc4dcf9055e490cef86fd9647fc8acd61d6bbe07dfb85fb6848bfe7f4f3926';

async function verifyMobileToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, AUTH_SECRET) as { userId: string };
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  console.log('[Mobile Transactions] GET request');
  
  try {
    const decoded = await verifyMobileToken(request);
    
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const type = searchParams.get('type');

    const query: any = { userId: user._id };
    
    if (type && type !== 'all') {
      query.type = type;
    }

    const transactions = await Transaction.find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    const total = await Transaction.countDocuments(query);

    const formattedTransactions = (transactions as any[]).map((tx) => {
      let adjustedAmount = tx.amount;
      const isDebit = ['transfer-out', 'withdrawal', 'payment', 'fee', 'charge', 'purchase'].includes(tx.type);
      
      if (tx.origin === 'internal_transfer') {
        if (tx.reference?.includes('-OUT')) {
          adjustedAmount = -Math.abs(tx.amount);
        } else if (tx.reference?.includes('-IN')) {
          adjustedAmount = Math.abs(tx.amount);
        }
      } else if (isDebit) {
        adjustedAmount = -Math.abs(tx.amount);
      } else {
        adjustedAmount = Math.abs(tx.amount);
      }

      return {
        _id: tx._id.toString(),
        reference: tx.reference,
        type: tx.type,
        amount: adjustedAmount,
        rawAmount: tx.amount,
        description: tx.description,
        status: tx.status,
        date: tx.date || tx.createdAt,
        createdAt: tx.createdAt,
        accountType: tx.accountType,
        posted: tx.posted,
        currency: tx.currency || 'USD',
      };
    });

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
      balances: {
        checking: user.checkingBalance || 0,
        savings: user.savingsBalance || 0,
        investment: user.investmentBalance || 0,
      }
    });

  } catch (error: any) {
    console.error('[Mobile Transactions] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
