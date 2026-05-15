// File: src/app/api/user/reports/route.ts

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';

interface FormattedTxn {
  _id:        string;
  type:       string;
  currency:   string;
  amount:     number;
  date:       string;
  description?: string;
}

export async function GET(request: Request) {
  try {
    // 1. Parse & validate dates
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam   = searchParams.get('endDate');
    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: 'startDate and endDate query params are required' },
        { status: 400 }
      );
    }
    const start = new Date(startDateParam);
    const end   = new Date(endDateParam);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format; use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // 2. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Connect to DB & load user
    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 4. Query transactions in date range
    const txns = await Transaction.find({
      user: user._id,
      date: { $gte: start, $lte: end }
    }).sort({ date: -1 });

    // 5. Compute metrics
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    for (const t of txns) {
      if (t.type === 'deposit') {
        totalDeposits += t.amount;
      } else {
        totalWithdrawals += t.amount;
      }
    }
    const netChange = totalDeposits - totalWithdrawals;

    // 6. Format transactions for the client
    const formatted: FormattedTxn[] = txns.map((t: any) => ({
      _id:         t._id.toString(),
      type:        t.type,
      currency:    t.currency,
      amount:      t.amount,
      date:        t.date.toISOString(),
      description: t.description,
    }));

    // 7. Return metrics + data
    return NextResponse.json({
      metrics: {
        totalDeposits,
        totalWithdrawals,
        netChange
      },
      transactions: formatted
    });
  } catch (err) {
    console.error('Reports API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
