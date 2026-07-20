// src/app/api/cron/trust-distributions/route.ts
// Runs the trust maturity engine on a schedule: releases any distribution
// tranche whose age/date trigger has been reached.
//
// For Vercel Cron, add to vercel.json:
// {
//   "crons": [
//     { "path": "/api/cron/trust-distributions", "schedule": "0 3 * * *" }
//   ]
// }

import { NextRequest, NextResponse } from 'next/server';
import { runTrustDistributions } from '@/lib/trustEngine';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Fail closed: this endpoint moves money, so it is unreachable until
  // CRON_SECRET is configured and presented by the caller.
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await runTrustDistributions();
    return NextResponse.json({
      success: true,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Trust distribution cron error:', error);
    return NextResponse.json(
      { error: 'Failed to run trust distributions', details: error?.message },
      { status: 500 }
    );
  }
}
