// Decommissioned. This legacy endpoint had no authentication and flipped
// transaction status without posting ledger entries, which would desync
// customer balances from the books. The authoritative approval flow is
// /api/admin/transactions/[id]/approve (admin-gated, atomic, double-entry).

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'This endpoint has been retired.' },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    { success: false, error: 'This endpoint has been retired.' },
    { status: 410 }
  );
}
