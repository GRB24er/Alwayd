// src/app/api/mobile/transactions/route.ts
// COPY THIS ENTIRE FILE TO YOUR WEB PROJECT

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { displayDescription } from '@/lib/channels';

import { AUTH_SECRET } from '@/lib/authSecret';

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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const type = searchParams.get('type');
    const accountType = searchParams.get('accountType');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const query: any = { userId: user._id };

    if (type && type !== 'all') {
      query.type = type;
    }
    if (accountType && accountType !== 'all') {
      query.accountType = accountType;
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search && search.trim()) {
      // Escape regex metacharacters so user input can't alter the pattern.
      const escaped = search.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { description: { $regex: escaped, $options: 'i' } },
        { reference: { $regex: escaped, $options: 'i' } },
        { 'metadata.recipientName': { $regex: escaped, $options: 'i' } },
      ];
    }
    if (from || to) {
      query.date = {};
      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) query.date.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          query.date.$lte = toDate;
        }
      }
      if (Object.keys(query.date).length === 0) delete query.date;
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
        description: displayDescription(tx.description, tx.type),
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
