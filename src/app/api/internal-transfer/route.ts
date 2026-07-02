// src/app/api/internal-transfer/route.ts
// DECOMMISSIONED — superseded by /api/transfers/internal, which carries the
// hardened pipeline (rate limiting, idempotency, account-status checks, audit).
import { NextResponse } from 'next/server';

function gone() {
  return NextResponse.json(
    { success: false, error: 'This endpoint has moved. Use /api/transfers/internal.' },
    { status: 410 }
  );
}

export async function POST() {
  return gone();
}

export async function GET() {
  return gone();
}
