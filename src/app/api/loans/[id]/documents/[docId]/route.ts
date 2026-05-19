// src/app/api/loans/[id]/documents/[docId]/route.ts
// GET: stream a previously uploaded document back to its owner (or to
// an admin). Returns the original mime type and filename.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import Loan from '@/models/Loan';
import User from '@/models/User';
import LoanDocumentFile from '@/models/LoanDocumentFile';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id, docId } = await params;

    await connectDB();
    const me = await User.findById(session.user.id).select('role');
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const loan = await Loan.findById(id).select('userId referenceNumber');
    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

    const isOwner = String(loan.userId) === String(session.user.id);
    const isAdmin = me.role === 'admin';
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const file = await LoanDocumentFile.findOne({ _id: docId, loanId: id });
    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });

    const safeName = file.name.replace(/[^\w.\-]+/g, '_');

    return new NextResponse(new Uint8Array(file.data), {
      status: 200,
      headers: {
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Content-Length': String(file.size),
        'Content-Disposition': `inline; filename="${safeName}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('GET /api/loans/[id]/documents/[docId] error:', error);
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
  }
}
