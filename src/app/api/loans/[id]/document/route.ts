// src/app/api/loans/[id]/document/route.ts
// Generates a professional, enterprise-grade PDF for a loan document.
// Supports type=offer|agreement|disbursement. Watermark, embossed logo,
// official seal, and a verifiable QR code are baked in.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import Loan from '@/models/Loan';
import User from '@/models/User';
import { generateLoanDocument, LoanDocumentType } from '@/lib/loanDocuments';

export const runtime = 'nodejs';

const VALID_TYPES: LoanDocumentType[] = ['offer', 'agreement', 'disbursement'];

function buildBaseUrl(req: NextRequest): string {
  const fromEnv =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  return host ? `${proto}://${host}` : 'https://aldwycheuropeancapital.com';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const typeParam = (searchParams.get('type') || 'agreement').toLowerCase() as LoanDocumentType;
    if (!VALID_TYPES.includes(typeParam)) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }

    await connectDB();

    const currentUser = await User.findById(session.user.id).select('role name email');
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const loan = await Loan.findById(id).populate('userId', 'name email');
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    const isOwner = String(loan.userId._id || loan.userId) === String(session.user.id);
    const isAdmin = currentUser.role === 'admin';
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Gate by status: offer/agreement only available after approval
    if (typeParam !== 'offer' && !['approved', 'disbursed', 'active', 'closed'].includes(loan.status)) {
      return NextResponse.json(
        { error: 'This document is not available until the application is approved.' },
        { status: 409 }
      );
    }
    if (typeParam === 'offer' && !['approved', 'disbursed', 'active', 'closed'].includes(loan.status)) {
      return NextResponse.json(
        { error: 'No offer has been issued for this application yet.' },
        { status: 409 }
      );
    }
    if (typeParam === 'disbursement' && !['disbursed', 'active', 'closed'].includes(loan.status)) {
      return NextResponse.json(
        { error: 'Funds have not yet been disbursed.' },
        { status: 409 }
      );
    }

    const applicant = loan.userId as unknown as { name: string };
    const baseUrl = buildBaseUrl(req);

    const pdf = await generateLoanDocument({
      referenceNumber: loan.referenceNumber,
      documentType: typeParam,
      borrowerName: applicant?.name || 'Borrower',
      loanType: loan.type,
      amount: loan.amount,
      termMonths: loan.term,
      interestRate: loan.interestRate,
      monthlyPayment: loan.monthlyPayment,
      totalRepayable: loan.totalRepayable,
      purpose: loan.purpose,
      issuedAt: loan.approvedAt || loan.applicationDate || new Date(),
      offerExpiry: loan.offerExpiry,
      agreementSignedAt: loan.agreementSignedAt,
      agreementSignature: loan.agreementSignature,
      verificationUrl: `${baseUrl}/verify/${encodeURIComponent(loan.referenceNumber)}`,
    });

    const filename = `Aldwych-${typeParam}-${loan.referenceNumber}.pdf`;

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('GET /api/loans/[id]/document error:', error);
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
  }
}
