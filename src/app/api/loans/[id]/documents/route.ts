// src/app/api/loans/[id]/documents/route.ts
// POST: borrower uploads a supporting document against a loan
//       application. Accepts multipart/form-data with `file` and `key`.
// GET:  list documents on this loan (owner or admin).

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import Loan from '@/models/Loan';
import User from '@/models/User';
import LoanDocumentFile from '@/models/LoanDocumentFile';
import { writeAudit } from '@/lib/audit';

export const runtime = 'nodejs';
// Allow up to 10MB request bodies (Next 15 default is generous, but be explicit).
export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);
const ACCEPTED_KEYS = new Set([
  'id_document',
  'proof_of_address',
  'bank_statements',
  'financial_statements',
  'business_registration',
  'business_plan',
  'other',
]);

function humanSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

async function assertAccess(loanId: string, userId: string) {
  const user = await User.findById(userId).select('role name email');
  if (!user) throw new Error('UNAUTHORIZED');
  const loan = await Loan.findById(loanId);
  if (!loan) throw new Error('NOT_FOUND');
  const isOwner = String(loan.userId) === String(userId);
  const isAdmin = user.role === 'admin';
  if (!isOwner && !isAdmin) throw new Error('FORBIDDEN');
  return { user, loan, isOwner, isAdmin };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    await connectDB();
    try {
      await assertAccess(id, String(session.user.id));
    } catch (e: any) {
      const msg = e?.message || 'FORBIDDEN';
      const status = msg === 'NOT_FOUND' ? 404 : msg === 'UNAUTHORIZED' ? 401 : 403;
      return NextResponse.json({ error: msg }, { status });
    }

    const files = await LoanDocumentFile.find({ loanId: id })
      .select('_id key name mimeType size uploadedAt')
      .sort({ uploadedAt: -1 })
      .lean();

    return NextResponse.json({ success: true, files });
  } catch (error) {
    console.error('GET /api/loans/[id]/documents error:', error);
    return NextResponse.json({ error: 'Failed to list documents' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;

    await connectDB();
    let access;
    try {
      access = await assertAccess(id, String(session.user.id));
    } catch (e: any) {
      const msg = e?.message || 'FORBIDDEN';
      const status = msg === 'NOT_FOUND' ? 404 : msg === 'UNAUTHORIZED' ? 401 : 403;
      return NextResponse.json({ error: msg }, { status });
    }
    const { user, loan } = access;

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const file = form.get('file');
    const key = String(form.get('key') || 'other').toLowerCase();

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 });
    }
    if (!ACCEPTED_KEYS.has(key)) {
      return NextResponse.json({ error: 'Unsupported document type' }, { status: 400 });
    }
    if (file.size <= 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 413 });
    }
    if (!ACCEPTED_MIME.has(file.type || '')) {
      return NextResponse.json(
        { error: 'Only PDF, JPG, JPEG, and PNG files are accepted' },
        { status: 415 }
      );
    }

    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const filename = (file as any).name || `document-${Date.now()}`;

    const stored = await LoanDocumentFile.create({
      loanId: loan._id,
      ownerId: loan.userId,
      key,
      name: String(filename).slice(0, 200),
      mimeType: file.type,
      size: file.size,
      data: buffer,
    });

    // Append the metadata entry to the loan document for fast lookups.
    if (!Array.isArray(loan.documents)) loan.documents = [];
    loan.documents.push({
      key,
      name: stored.name,
      size: humanSize(stored.size),
      url: `/api/loans/${String(loan._id)}/documents/${String(stored._id)}`,
      uploadedAt: stored.uploadedAt,
    });
    await loan.save();

    await writeAudit({
      event: 'loan.message.sent', // closest existing event type for document attach
      actorId: String(session.user.id),
      actorRole: user.role === 'admin' ? 'admin' : 'user',
      actorEmail: user.email,
      subjectId: String(loan._id),
      subjectType: 'document',
      reference: loan.referenceNumber,
      payload: { fileId: String(stored._id), name: stored.name, key, size: stored.size, mimeType: stored.mimeType },
      request: req,
    });

    return NextResponse.json({
      success: true,
      file: {
        _id: String(stored._id),
        key: stored.key,
        name: stored.name,
        mimeType: stored.mimeType,
        size: stored.size,
        sizeHuman: humanSize(stored.size),
        uploadedAt: stored.uploadedAt,
        url: `/api/loans/${String(loan._id)}/documents/${String(stored._id)}`,
      },
    });
  } catch (error) {
    console.error('POST /api/loans/[id]/documents error:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}
