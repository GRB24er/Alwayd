// src/app/api/otp/request/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { createOTP, OTPType } from '@/lib/otpService';

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
    const { type, metadata } = body;

    // Validate OTP type
    if (!type || !Object.values(OTPType).includes(type)) {
      return NextResponse.json(
        { error: 'Invalid OTP type' },
        { status: 400 }
      );
    }

    // Get user email from session
    const email = session.user.email;
    const userId = (session.user as any).id || session.user.email;

    // Create OTP
    const result = await createOTP(
      userId,
      email,
      type as OTPType,
      {
        ...metadata,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
      // In dev mode, return the code for testing
      ...(process.env.NODE_ENV === 'development' && { code: result.code })
    });

  } catch (error: any) {
    console.error('OTP request error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}