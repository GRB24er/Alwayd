// src/app/api/limits/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import TransactionLimit from '@/models/TransactionLimit';

const authOptions = {
  secret: '21b0133285c83665020046259b56217a7a787f1c9dd59fefe496f93dbba6deb2',
};

// Helper to check if date is today
function isToday(date: Date): boolean {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

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

    const { amount, type, accountType } = await req.json();

    // Get or create limits for user
    let limits = await TransactionLimit.findOne({ userId: user._id });
    
    if (!limits) {
      // Create default limits for new user
      limits = await TransactionLimit.create({
        userId: user._id,
        dailyTransferLimit: 10000,
        dailyWithdrawalLimit: 5000,
        maxTransactionAmount: 25000,
        checkingDailyLimit: 10000,
        savingsDailyLimit: 5000,
        todayTransferred: 0,
        todayWithdrawn: 0,
        lastResetDate: new Date(),
        limitsEnabled: true,
        customLimits: false
      });
    }

    // Reset daily limits if it's a new day
    if (!isToday(new Date(limits.lastResetDate))) {
      limits.todayTransferred = 0;
      limits.todayWithdrawn = 0;
      limits.lastResetDate = new Date();
      await limits.save();
    }

    // Check if limits are enabled
    if (!limits.limitsEnabled) {
      return NextResponse.json({
        success: true,
        allowed: true,
        message: 'Limits disabled for this account'
      });
    }

    // All checks passed
    return NextResponse.json({
      success: true,
      allowed: true,
      limits: {
        dailyTransferLimit: limits.dailyTransferLimit,
        maxTransactionAmount: limits.maxTransactionAmount,
        todayUsed: limits.todayTransferred,
        remainingToday: limits.dailyTransferLimit - limits.todayTransferred,
        accountLimit: accountType === 'checking' ? limits.checkingDailyLimit : limits.savingsDailyLimit
      }
    });

  } catch (error: any) {
    console.error('❌ Limit check error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check limits' },
      { status: 500 }
    );
  }
}

// GET user's current limits
export async function GET(req: NextRequest) {
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

    let limits = await TransactionLimit.findOne({ userId: user._id });
    
    if (!limits) {
      limits = await TransactionLimit.create({
        userId: user._id
      });
    }

    // Reset if new day
    if (!isToday(new Date(limits.lastResetDate))) {
      limits.todayTransferred = 0;
      limits.todayWithdrawn = 0;
      limits.lastResetDate = new Date();
      await limits.save();
    }

    return NextResponse.json({
      success: true,
      limits: {
        dailyTransferLimit: limits.dailyTransferLimit,
        dailyWithdrawalLimit: limits.dailyWithdrawalLimit,
        maxTransactionAmount: limits.maxTransactionAmount,
        checkingDailyLimit: limits.checkingDailyLimit,
        savingsDailyLimit: limits.savingsDailyLimit,
        todayTransferred: limits.todayTransferred,
        todayWithdrawn: limits.todayWithdrawn,
        remainingToday: limits.dailyTransferLimit - limits.todayTransferred,
        limitsEnabled: limits.limitsEnabled,
        customLimits: limits.customLimits
      }
    });

  } catch (error: any) {
    console.error('❌ Get limits error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get limits' },
      { status: 500 }
    );
  }
}