// src/app/api/verify-password/route.ts
// DECOMMISSIONED — unauthenticated password oracle (credential-stuffing risk).
// Use the standard /api/auth or /api/auth/mobile login endpoints instead.
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { valid: false, error: 'This endpoint has been decommissioned for security reasons. Use the login endpoints.' },
    { status: 410 }
  );
}