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

    // Status counts (currency-agnostic).
    const statusCounts = trusts.reduce(
      (acc: Record<string, number>, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      },
      {}
    );

    // Money totals grouped by currency — summing mixed currencies would be
    // meaningless, so each currency is reported separately.
    const totalsByCurrency: Record<string, { held: number; principal: number; count: number }> = {};
    for (const t of trusts) {
      const cur = t.currency || 'USD';
      const bucket = (totalsByCurrency[cur] ||= { held: 0, principal: 0, count: 0 });
      bucket.held += Number(t.heldBalance || 0);
      bucket.principal += Number(t.principalAmount || 0);
      bucket.count += 1;
    }

    return NextResponse.json({
      success: true,
      trusts,
      count: trusts.length,
      statusCounts,
      totalsByCurrency,
    });
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
