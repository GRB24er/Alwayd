// src/app/api/trusts/[id]/document/route.ts
// Streams a trustee PDF for a trust. type=deed|certificate|funding_receipt|
// letter_of_wishes|distribution_statement|completion_statement|deed_of_revocation.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import TrustAccount from '@/models/TrustAccount';
import User from '@/models/User';
import {
  generateTrustDocument,
  availableTrustDocuments,
  TrustDocumentType,
} from '@/lib/trustDocuments';
import { buildTrustDocumentData } from '@/lib/trustEngine';

export const runtime = 'nodejs';

const VALID_TYPES: TrustDocumentType[] = [
  'deed',
  'certificate',
  'funding_receipt',
  'letter_of_wishes',
  'distribution_statement',
  'completion_statement',
  'deed_of_revocation',
];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const typeParam = (new URL(req.url).searchParams.get('type') || 'certificate').toLowerCase() as TrustDocumentType;
    if (!VALID_TYPES.includes(typeParam)) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }

    await connectDB();

    const currentUser = await User.findById(session.user.id).select('role');
    const trust = await TrustAccount.findById(id);
    if (!trust) {
      return NextResponse.json({ error: 'Trust not found' }, { status: 404 });
    }

    const uid = String(session.user.id);
    const isSettlor = String(trust.settlorUserId) === uid;
    const isBeneficiary = trust.beneficiaryUserId && String(trust.beneficiaryUserId) === uid;
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
    if (!isSettlor && !isBeneficiary && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Gate documents by the trust's lifecycle state.
    if (!availableTrustDocuments(trust.status).includes(typeParam)) {
      return NextResponse.json(
        { error: 'This document is not available for the trust in its current state.' },
        { status: 409 }
      );
    }

    // For a distribution statement, advise on the most recent released tranche.
    let extra = {};
    if (typeParam === 'distribution_statement') {
      const released = trust.distributions.filter((d) => d.status === 'released');
      const last = released[released.length - 1];
      if (!last) {
        return NextResponse.json({ error: 'No distribution has been released yet.' }, { status: 409 });
      }
      extra = {
        releasedTranche: {
          label: last.label,
          amount: Number(last.releasedAmount || 0),
          releasedAt: last.releasedAt || new Date(),
          remainingBalance: trust.heldBalance,
        },
      };
    }
    if (typeParam === 'deed_of_revocation') {
      extra = { refundAmount: 0 };
    }

    const pdf = await generateTrustDocument(buildTrustDocumentData(trust, typeParam, extra));
    const filename = `Aldwych-${typeParam}-${trust.referenceNumber}.pdf`;

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('GET /api/trusts/[id]/document error:', error);
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
  }
}
