// src/app/api/verify/[ref]/route.ts
// Public verification endpoint — resolves a document reference against our
// registries and reports its authenticity. Returns minimal information (no PII
// beyond first name + last initial) to anyone scanning the QR code.
//
// The lookup itself lives in @/lib/documentVerification so the /verify/[ref]
// page can run it in-process instead of calling this route over HTTP.

import { NextRequest, NextResponse } from 'next/server';
import { verifyDocument } from '@/lib/documentVerification';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  try {
    const { ref } = await params;
    const { status, body } = await verifyDocument(ref);
    return NextResponse.json(body, { status });
  } catch (error) {
    console.error('GET /api/verify/[ref] error:', error);
    return NextResponse.json({ verified: false, error: 'Verification failed' }, { status: 500 });
  }
}
