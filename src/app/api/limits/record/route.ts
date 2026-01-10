// src/app/api/limits/record/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import TransactionLimit from '@/models/TransactionLimit';

const authOptions = {
  secret: '21b0133285c83665020046259b56217a7a787f1c9dd59fefe496f93dbba6deb2',
};

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const { amount, type } = await req.json();

    let limits = await TransactionLimit.findOne({ userId: user._id });
    
    if (!limits) {
      limits = await TransactionLimit.create({ userId: user._id });
    }

    // Update usage based on transaction type
    if (type === 'transfer' || type === 'external') {
      limits.todayTransferred += amount;
    } else if (type === 'withdrawal') {
      limits.todayWithdrawn += amount;
    }

    await limits.save();

    return NextResponse.json({
      success: true,
      message: 'Transaction recorded',
      remaining: limits.dailyTransferLimit - limits.todayTransferred
    });

  } catch (error: any) {
    console.error('❌ Record transaction error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record transaction' },
      { status: 500 }
    );
  }
}