// src/app/api/verify/[ref]/route.ts
// Public verification endpoint — looks up a loan document by reference
// number and reports its authenticity. Returns minimal information
// (no PII beyond first name + initial) to anyone scanning the QR code.

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Loan from '@/models/Loan';
import User from '@/models/User';
import AccountRestriction, { ACTION_LABELS, REASON_LABELS } from '@/models/AccountRestriction';
import TrustAccount, { TRUST_STATUS_LABELS } from '@/models/TrustAccount';

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

    // Adjustment receipts (ADJ-) and reversal notices (REV-) are stored on the
    // Transaction collection and lookups are O(1) on an indexed reference.
    if (/^(ADJ|REV)-/.test(ref)) {
      const tx = await (await import("@/models/Transaction")).default.findOne({ referenceNumber: ref } as any).lean();
      // referenceNumber on Transaction is stored under `reference` — adjust the query.
      const txByRef = tx || await (await import("@/models/Transaction")).default.findOne({ reference: ref }).lean();
      if (txByRef) {
        const t = txByRef as any;
        const user = await User.findById(t.userId).select("name").lean();
        const isReversal = ref.startsWith("REV-");
        return NextResponse.json({
          verified: true,
          issuer: "Aldwych European Capital",
          issuerEstablished: "1897",
          referenceNumber: t.reference,
          documentType: isReversal ? "Transaction Reversal Notice" : "Account Adjustment Receipt",
          status: t.status,
          customer: user ? maskName((user as any).name) : "Verified Holder",
          action: isReversal ? "reversal" : t.type,
          amount: t.amount,
          currency: t.currency || "USD",
          accountType: t.accountType,
          issuedAt: t.postedAt || t.createdAt,
          reversedReference: t.metadata?.originalReference,
          verifiedAt: new Date().toISOString(),
        });
      }
    }

    // Funds transfer receipts carry the underlying transfer reference
    // (WIRE-/IWR-/EXT-/INT-/TXN-…). Report enough to authenticate the document
    // without disclosing beneficiary details to whoever scanned it.
    if (/^(WIRE|IWR|EXT|INT|TXN)-/i.test(ref)) {
      const TransactionModel = (await import("@/models/Transaction")).default;
      const tx = await TransactionModel.findOne({
        reference: { $in: [ref, `${ref}-OUT`] },
        type: { $in: ["transfer-in", "transfer-out"] },
      }).lean();
      if (tx) {
        const t = tx as any;
        const user = await User.findById(t.userId).select("name").lean();
        const settled = t.status === "completed" || t.status === "approved";
        return NextResponse.json({
          verified: true,
          issuer: "Aldwych European Capital",
          issuerEstablished: "1897",
          referenceNumber: t.reference,
          receiptNumber: `RCP-${t.reference}`,
          documentType: "Funds Transfer Receipt",
          status: settled ? "completed" : t.status,
          customer: user ? maskName((user as any).name) : "Verified Holder",
          action: t.type,
          amount: t.amount,
          currency: t.currency || "USD",
          accountType: t.accountType,
          initiatedAt: t.date || t.createdAt,
          settledAt: settled ? t.postedAt || t.approvedAt || null : null,
          verifiedAt: new Date().toISOString(),
        });
      }
      // Fall through — the prefix may belong to another registry.
    }

    // Account restriction notices have references like FRZ-/BLK-/CLS-… so try
    // them first; restriction lookups are O(1) on an indexed field.
    if (/^(FRZ|BLK|CLS)-/.test(ref)) {
      const restriction = await AccountRestriction.findOne({ referenceNumber: ref }).lean();
      if (restriction) {
        const r = restriction as any;
        const user = await User.findById(r.userId).select('name').lean();
        return NextResponse.json({
          verified: true,
          issuer: 'Aldwych European Capital',
          issuerEstablished: '1897',
          referenceNumber: r.referenceNumber,
          documentType: ACTION_LABELS[r.action as keyof typeof ACTION_LABELS] + ' Notice',
          status: r.status,
          customer: user ? maskName((user as any).name) : 'Verified Holder',
          reasonCategory: REASON_LABELS[r.reasonCategory as keyof typeof REASON_LABELS],
          action: r.action,
          effectiveFrom: r.effectiveFrom,
          effectiveUntil: r.effectiveUntil,
          liftedAt: r.liftedAt,
          issuedBy: r.issuedByName,
          issuedByTitle: r.issuedByTitle,
          verifiedAt: new Date().toISOString(),
        });
      }
      // Fall through to loan lookup in case the prefix is unrelated.
    }

    // Trust references (TRB-…) resolve against the TrustAccount registry.
    // We disclose enough to authenticate the instrument without exposing full
    // beneficiary/settlor identities to whoever scanned the code.
    if (/^TRB-/i.test(ref)) {
      const trust = await TrustAccount.findOne({ referenceNumber: ref }).lean();
      if (trust) {
        const t = trust as any;
        const nextRelease = (t.distributions || [])
          .filter((d: any) => d.status === 'scheduled' && d.triggerDate)
          .map((d: any) => new Date(d.triggerDate))
          .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];
        return NextResponse.json({
          verified: true,
          issuer: 'Aldwych European Capital',
          issuerEstablished: '1897',
          referenceNumber: t.referenceNumber,
          documentType: 'Inheritance Trust Instrument',
          status: t.status,
          statusLabel: TRUST_STATUS_LABELS[t.status as keyof typeof TRUST_STATUS_LABELS] || t.status,
          trustName: t.trustName,
          settlor: t.settlorName ? maskName(t.settlorName) : 'Verified Settlor',
          beneficiary: t.beneficiaryName ? maskName(t.beneficiaryName) : 'Verified Beneficiary',
          nature: t.revocable ? 'Revocable' : 'Irrevocable',
          amount: t.principalAmount,
          currency: t.currency || 'EUR',
          issuedAt: t.fundedAt || t.createdAt,
          nextReleaseDate: nextRelease ? nextRelease.toISOString() : null,
          verifiedAt: new Date().toISOString(),
        });
      }
      return NextResponse.json(
        { verified: false, error: 'Trust not found in our registry. This may not be a genuine Aldwych European Capital document.' },
        { status: 404 }
      );
    }

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
