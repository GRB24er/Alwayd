import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import TrustAccount from '@/models/TrustAccount';
import { requireAdmin } from '@/lib/adminGuard';
import { runTrustDistributions } from '@/lib/trustEngine';

export const runtime = 'nodejs';

// GET - all trusts, for the trustee/admin console. Optional ?status= filter.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    await connectDB();
    const status = request.nextUrl.searchParams.get('status');
    const query = status ? { status } : {};
    const trusts = await TrustAccount.find(query).sort({ createdAt: -1 }).limit(500).lean();

    const totals = trusts.reduce(
      (acc, t) => {
        acc.count += 1;
        acc.held += Number(t.heldBalance || 0);
        acc.principal += Number(t.principalAmount || 0);
        return acc;
      },
      { count: 0, held: 0, principal: 0 }
    );

    return NextResponse.json({ success: true, trusts, totals });
  } catch (error) {
    console.error('GET /api/admin/trusts error:', error);
    return NextResponse.json({ error: 'Failed to fetch trusts' }, { status: 500 });
  }
}

// POST - manually trigger the maturity engine (release any due tranches now).
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const summary = await runTrustDistributions();
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('POST /api/admin/trusts error:', error);
    return NextResponse.json({ error: 'Failed to run distributions' }, { status: 500 });
  }
}
