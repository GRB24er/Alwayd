// src/app/api/auth/otp/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { createOTP, OTPType } from '@/lib/otpService';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, metadata } = body;

    // Map action to OTP type
    const otpTypeMap: { [key: string]: OTPType } = {
      'login': OTPType.LOGIN,
      'transfer': OTPType.TRANSFER,
      'large_transfer': OTPType.TRANSFER,
      'profile_update': OTPType.PROFILE_UPDATE,
      'card_application': OTPType.CARD_APPLICATION,
      'password_reset': OTPType.PASSWORD_RESET,
      'transaction_approval': OTPType.TRANSACTION_APPROVAL
    };

    const otpType = otpTypeMap[action] || OTPType.TRANSFER;

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create OTP
    const result = await createOTP(
      user._id.toString(),
      user.email,
      otpType,
      metadata,
      user.phone
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send OTP' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
      expiresIn: 600, // 10 minutes in seconds
      // Only send code in development
      ...(process.env.NODE_ENV === 'development' && { code: result.code })
    });

  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}
