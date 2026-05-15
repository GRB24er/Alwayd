// src/app/api/statements/request/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Statement from '@/models/Statement';
import User from '@/models/User';

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

    const { startDate, endDate, accountType } = await req.json();

    if (!startDate || !endDate || !accountType) {
      return NextResponse.json(
        { success: false, error: 'Start date, end date, and account type are required' },
        { status: 400 }
      );
    }

    // Create statement request
    const statement = await Statement.create({
      userId: user._id,
      accountType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: 'pending',
      requestedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      data: statement,
      message: 'Statement request submitted. You will receive an email shortly.'
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Statement request error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to request statement' },
      { status: 500 }
    );
  }
}