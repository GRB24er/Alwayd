// Verify a one-time passcode. Rate-limited per user to prevent code guessing.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { verifyOTP, OTPType } from '@/lib/otpService';
import { check as rateLimitCheck, POLICIES } from '@/lib/rateLimit';
import { audit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id || session.user.email;

  const rl = await rateLimitCheck(`otp_verify:${userId}`, POLICIES.otpVerify);
  if (!rl.allowed) {
    await audit({
      action: 'rate_limit.exceeded',
      actorId: userId,
      actorEmail: session.user.email,
      outcome: 'blocked',
      request: req,
      details: { policy: 'otpVerify' },
    });
    return NextResponse.json(
      { error: 'Too many verification attempts' },
      { status: 429, headers: { 'retry-after': String(rl.retryAfterSeconds) } }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { code, type } = body || {};
  if (!code || !type) {
    return NextResponse.json({ error: 'Code and type are required' }, { status: 400 });
  }
  if (!Object.values(OTPType).includes(type)) {
    return NextResponse.json({ error: 'Invalid OTP type' }, { status: 400 });
  }

  const result = await verifyOTP(userId, code, type as OTPType);
  if (!result.success) {
    await audit({
      action: 'auth.mfa_failed',
      actorId: userId,
      actorEmail: session.user.email,
      outcome: 'failure',
      request: req,
      details: { purpose: type, reason: result.error },
    });
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await audit({
    action: 'auth.mfa_verified',
    actorId: userId,
    actorEmail: session.user.email,
    outcome: 'success',
    request: req,
    details: { purpose: type },
  });

  return NextResponse.json({ success: true, message: 'Code verified successfully' });
}
