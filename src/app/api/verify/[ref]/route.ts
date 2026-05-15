// src/app/api/verify/[ref]/route.ts
// Public verification endpoint — looks up a loan document by reference
// number and reports its authenticity. Returns minimal information
// (no PII beyond first name + initial) to anyone scanning the QR code.

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Loan from '@/models/Loan';
import User from '@/models/User';

export const runtime = 'nodejs';

function maskName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}

const LOAN_TYPE_LABELS: Record<string, string> = {
  business: 'Business Loan',
  contractor: 'Contractor Financing',
  sme: 'SME Expansion Loan',
  trade: 'Trade Finance',
  equipment: 'Equipment Financing',
  personal: 'Personal Loan',
  mortgage: 'Mortgage',
  auto: 'Auto Loan',
  student: 'Student Loan',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  try {
    const { ref } = await params;
    if (!ref) {
      return NextResponse.json({ verified: false, error: 'Missing reference' }, { status: 400 });
    }

    await connectDB();
    const loan = await Loan.findOne({ referenceNumber: ref }).lean();
    if (!loan) {
      return NextResponse.json(
        { verified: false, error: 'Document not found in our registry. This may not be a genuine Aldwych European Capital document.' },
        { status: 404 }
      );
    }

    const user = await User.findById((loan as any).userId).select('name').lean();

    return NextResponse.json({
      verified: true,
      issuer: 'Aldwych European Capital',
      issuerEstablished: '1897',
      referenceNumber: (loan as any).referenceNumber,
      documentType: (loan as any).status === 'approved' ? 'Loan Facility Offer'
        : (loan as any).status === 'disbursed' || (loan as any).status === 'active'
          ? 'Loan Facility Agreement (Executed)'
          : 'Loan Application Record',
      status: (loan as any).status,
      borrower: user ? maskName((user as any).name) : 'Verified Borrower',
      loanType: LOAN_TYPE_LABELS[(loan as any).type] || (loan as any).type,
      amount: (loan as any).amount,
      currency: 'EUR',
      termMonths: (loan as any).term,
      interestRate: (loan as any).interestRate,
      monthlyPayment: (loan as any).monthlyPayment,
      issuedAt: (loan as any).approvedAt || (loan as any).applicationDate,
      offerExpiry: (loan as any).offerExpiry,
      agreementSignedAt: (loan as any).agreementSignedAt,
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GET /api/verify/[ref] error:', error);
    return NextResponse.json({ verified: false, error: 'Verification failed' }, { status: 500 });
  }
}
