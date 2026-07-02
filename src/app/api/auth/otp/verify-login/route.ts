// src/app/api/auth/otp/verify-login/route.ts
// Verifies the emailed sign-in code (second factor) and returns a
// short-lived signed proof. The client passes the proof to
// useSession().update({ otpProof }) — the NextAuth jwt callback verifies it
// and marks the session token otpVerified, which the middleware requires
// before any protected page opens.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import jsonwebtoken from 'jsonwebtoken';
import { authOptions } from '@/lib/authOptions';
import { verifyOTP, OTPType } from '@/lib/otpService';
import { AUTH_SECRET } from '@/lib/authSecret';
import { check as rateCheck, ipFromHeaders, POLICIES } from '@/lib/rateLimit';
import { audit } from '@/lib/audit';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || '').trim();
    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    // Rate-limit attempts so the 6-digit code cannot be brute-forced.
    const ip = ipFromHeaders(req.headers);
    const email = session.user.email.toLowerCase();
    const [ipLimit, emailLimit] = await Promise.all([
      rateCheck(`otp-login:ip:${ip}`, POLICIES.authLogin),
      rateCheck(`otp-login:email:${email}`, POLICIES.authLogin),
    ]);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retryAfter = Math.max(
        ipLimit.retryAfterSeconds,
        emailLimit.retryAfterSeconds
      );
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    await connectDB();
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const result = await verifyOTP(user._id.toString(), code, OTPType.LOGIN);
    if (!result.success) {
      await audit({
        action: 'auth.login_otp_failed',
        actorId: user._id.toString(),
        actorEmail: user.email,
        outcome: 'failure',
        details: { reason: result.error || 'invalid_code', ip },
        request: req,
      });
      return NextResponse.json(
        { error: result.error || 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // Short-lived, single-purpose proof bound to this user.
    const proof = jsonwebtoken.sign({ purpose: 'login-otp' }, AUTH_SECRET, {
      subject: user._id.toString(),
      expiresIn: '5m',
    });

    await audit({
      action: 'auth.login_otp_verified',
      actorId: user._id.toString(),
      actorEmail: user.email,
      outcome: 'success',
      details: { channel: 'web', ip },
      request: req,
    });

    return NextResponse.json({ success: true, proof });
  } catch (error) {
    console.error('[Verify Login OTP] error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
