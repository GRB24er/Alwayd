// Request a one-time passcode. Now rate-limited per user (5 / 15 min) AND per IP (10 / 15 min)
// to prevent SMS/email bombing and credential-stuffing reconnaissance.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { createOTP, OTPType } from '@/lib/otpService';
import { check as rateLimitCheck, ipFromHeaders, POLICIES } from '@/lib/rateLimit';
import { audit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id || session.user.email;
  const ip = ipFromHeaders(req.headers);

  const [rlUser, rlIp] = await Promise.all([
    rateLimitCheck(`otp:user:${userId}`, POLICIES.otpRequest),
    rateLimitCheck(`otp:ip:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 }),
  ]);

  if (!rlUser.allowed || !rlIp.allowed) {
    const retry = Math.max(rlUser.retryAfterSeconds, rlIp.retryAfterSeconds);
    await audit({
      action: 'rate_limit.exceeded',
      actorId: userId,
      actorEmail: session.user.email,
      outcome: 'blocked',
      request: req,
      details: { policy: 'otpRequest', retryAfter: retry },
    });
    return NextResponse.json(
      { error: 'Too many verification code requests. Please wait and try again.' },
      { status: 429, headers: { 'retry-after': String(retry) } }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, metadata } = body || {};
  if (!type || !Object.values(OTPType).includes(type)) {
    return NextResponse.json({ error: 'Invalid OTP type' }, { status: 400 });
  }

  const result = await createOTP(userId, session.user.email, type as OTPType, {
    ...(metadata || {}),
    ipAddress: ip,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await audit({
    action: 'auth.mfa_challenge',
    actorId: userId,
    actorEmail: session.user.email,
    outcome: 'success',
    request: req,
    details: { purpose: type },
  });

  return NextResponse.json({
    success: true,
    message: 'Verification code sent to your email',
    ...(process.env.NODE_ENV === 'development' && { code: result.code }),
  });
}
