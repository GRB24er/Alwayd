import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import TrustAccount from '@/models/TrustAccount';
import { cancelTrust } from '@/lib/trustEngine';

export const runtime = 'nodejs';

// GET - a single trust the caller is party to (settlor or beneficiary)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    await connectDB();

    const trust = await TrustAccount.findById(id).lean();
    if (!trust) {
      return NextResponse.json({ error: 'Trust not found' }, { status: 404 });
    }
    const uid = String(session.user.id);
    const isParty =
      String(trust.settlorUserId) === uid ||
      (trust.beneficiaryUserId && String(trust.beneficiaryUserId) === uid);
    if (!isParty) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, trust });
  } catch (error) {
    console.error('GET /api/trusts/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch trust' }, { status: 500 });
  }
}

// PATCH - settlor cancels a revocable trust (returns remaining principal)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    await connectDB();
    const trust = await TrustAccount.findById(id);
    if (!trust) {
      return NextResponse.json({ error: 'Trust not found' }, { status: 404 });
    }
    if (String(trust.settlorUserId) !== String(session.user.id)) {
      return NextResponse.json({ error: 'Only the settlor can modify this trust' }, { status: 403 });
    }

    if (action === 'cancel') {
      try {
        await cancelTrust(trust, body?.reason ? String(body.reason).slice(0, 1000) : 'Cancelled by settlor');
      } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Unable to cancel trust' }, { status: 400 });
      }
      return NextResponse.json({ success: true, trust });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('PATCH /api/trusts/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update trust' }, { status: 500 });
  }
}
