// src/app/api/auth/otp/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { verifyOTP, OTPType } from '@/lib/otpService';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { code, action } = body;

    if (!code || !action) {
      return NextResponse.json(
        { error: 'Code and action are required' },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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

    // Verify OTP
    const result = await verifyOTP(
      user._id.toString(),
      code,
      otpType
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Invalid or expired code' },
        { status: 400 }
      );
    }

    // Mark action as verified in session
    // You can store this in a temporary session store or cache
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Store verification for 5 minutes (for completing the action)
    // In production, use Redis or similar
    const verifiedActions = new Map();
    verifiedActions.set(`${user._id}-${action}`, {
      verified: true,
      verifiedAt: new Date(),
      token: verificationToken,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    });

    return NextResponse.json({
      success: true,
      message: 'Verification successful',
      verificationToken, // Use this token to complete the protected action
      expiresIn: 300 // 5 minutes in seconds
    });

  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
