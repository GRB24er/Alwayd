// src/app/api/otp/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { verifyOTP, OTPType } from '@/lib/otpService';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { code, type } = body;

    // Validate inputs
    if (!code || !type) {
      return NextResponse.json(
        { error: 'Code and type are required' },
        { status: 400 }
      );
    }

    if (!Object.values(OTPType).includes(type)) {
      return NextResponse.json(
        { error: 'Invalid OTP type' },
        { status: 400 }
      );
    }

    // Get user ID
    const userId = (session.user as any).id || session.user.email;

    // Verify OTP
    const result = await verifyOTP(userId, code, type as OTPType);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Code verified successfully'
    });

  } catch (error: any) {
    console.error('OTP verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}