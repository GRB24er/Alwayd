import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import User from '@/models/User';
import { requireAdmin } from '@/lib/adminGuard';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin.ok) return admin.response;

    await connectDB();
    const { id: userId } = await context.params;

    const body = await req.json().catch(() => ({}));
    let { amount, currency = 'USD', date, description, accountType = 'checking' } = body || {};

    if (amount == null || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Valid `amount` > 0 required' }, { status: 400 });
    }
    amount = Number(amount);
    if (!['USD', 'BTC'].includes(currency)) {
      return NextResponse.json({ error: 'currency must be USD or BTC' }, { status: 400 });
    }
    if (!['checking', 'savings', 'investment'].includes(String(accountType))) {
      return NextResponse.json({ error: 'accountType must be checking|savings|investment' }, { status: 400 });
    }

    const user = await User.findById(userId).lean();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // ALWAYS create as PENDING; balances move only on Approve
    const txn = await Transaction.create({
      userId,
      type: 'withdraw',
      currency,
      amount,
      date: date ? new Date(date) : new Date(),
      description: description || 'Bank debit',
      status: 'pending',
      posted: false,
      postedAt: null,
      accountType,
      channel: 'internal',
      origin: 'bank_adjustment',
    });

    return NextResponse.json({ success: true, transaction: txn });
  } catch (err: any) {
    console.error('Admin withdraw error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to create admin withdrawal' }, { status: 500 });
  }
}
