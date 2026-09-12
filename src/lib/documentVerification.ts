// src/lib/documentVerification.ts
// Single source of truth for public document verification (the QR code printed
// on receipts, statements, loan agreements, trust instruments and restriction
// notices).
//
// This lives in a library rather than only in the API route because the
// /verify/[ref] page is a server component: it used to reach its own API over
// HTTP, which meant guessing its own origin from NEXTAUTH_URL and falling back
// to http://localhost:3000. In production that fallback is refused and every
// scan reported "Could not reach verification service." A server component can
// query the database directly, so it does.

import connectDB from "@/lib/mongodb";
import Loan from "@/models/Loan";
import User from "@/models/User";
import AccountRestriction, { ACTION_LABELS, REASON_LABELS } from "@/models/AccountRestriction";
import TrustAccount, { TRUST_STATUS_LABELS } from "@/models/TrustAccount";
import {
  maskName,
  referenceCandidates,
  referenceKind,
  transactionDocumentType,
  type ReferenceKind,
} from "@/lib/verificationReferences";

export { maskName, referenceCandidates, referenceKind, transactionDocumentType };
export type { ReferenceKind };

export const ISSUER = "Aldwych European Capital";
export const ISSUER_ESTABLISHED = "1897";

export interface VerificationResult {
  verified: boolean;
  error?: string;
  issuer?: string;
  issuerEstablished?: string;
  referenceNumber?: string;
  documentType?: string;
  status?: string;
  amount?: number;
  currency?: string;
  verifiedAt?: string;
  borrower?: string;
  loanType?: string;
  termMonths?: number;
  interestRate?: number;
  monthlyPayment?: number;
  issuedAt?: string | Date | null;
  offerExpiry?: string | Date | null;
  agreementSignedAt?: string | Date | null;
  customer?: string;
  receiptNumber?: string;
  action?: string;
  accountType?: string;
  initiatedAt?: string | Date | null;
  settledAt?: string | Date | null;
  reasonCategory?: string;
  effectiveFrom?: string | Date | null;
  effectiveUntil?: string | Date | null;
  liftedAt?: string | Date | null;
  issuedBy?: string;
  issuedByTitle?: string;
  reversedReference?: string;
  trustName?: string;
  settlor?: string;
  beneficiary?: string;
  nature?: string;
  statusLabel?: string;
  nextReleaseDate?: string | null;
}

export interface VerificationOutcome {
  status: number;
  body: VerificationResult;
}

const LOAN_TYPE_LABELS: Record<string, string> = {
  business: "Business Loan",
  contractor: "Contractor Financing",
  sme: "SME Expansion Loan",
  trade: "Trade Finance",
  equipment: "Equipment Financing",
  personal: "Personal Loan",
  mortgage: "Mortgage",
  auto: "Auto Loan",
  student: "Student Loan",
};

const NOT_FOUND = (kind: string): VerificationResult => ({
  verified: false,
  error: `${kind} not found in our registry. This may not be a genuine ${ISSUER} document.`,
});

async function holderName(userId: unknown, fallback: string): Promise<string> {
  if (!userId) return fallback;
  try {
    const user = await User.findById(userId).select("name").lean();
    const name = (user as { name?: string } | null)?.name;
    return name ? maskName(name) : fallback;
  } catch {
    return fallback;
  }
}

async function verifyTransaction(ref: string): Promise<VerificationResult | null> {
  const TransactionModel = (await import("@/models/Transaction")).default;
  const tx = await TransactionModel.findOne({
    reference: { $in: referenceCandidates(ref) },
  }).lean();
  if (!tx) return null;

  const t = tx as Record<string, any>;
  const isTransfer = t.type === "transfer-in" || t.type === "transfer-out";
  const settled = t.status === "completed" || t.status === "approved";

  return {
    verified: true,
    issuer: ISSUER,
    issuerEstablished: ISSUER_ESTABLISHED,
    referenceNumber: t.reference,
    receiptNumber: isTransfer ? `RCP-${t.reference}` : undefined,
    documentType: transactionDocumentType(ref, t.type),
    status: settled ? "completed" : t.status,
    customer: await holderName(t.userId, "Verified Holder"),
    action: /^REV-/i.test(ref) ? "reversal" : t.type,
    amount: t.amount,
    currency: t.currency || "USD",
    accountType: t.accountType,
    initiatedAt: t.date || t.createdAt || null,
    settledAt: settled ? t.postedAt || t.approvedAt || null : null,
    issuedAt: t.postedAt || t.createdAt || null,
    reversedReference: t.metadata?.originalReference,
    verifiedAt: new Date().toISOString(),
  };
}

async function verifyRestriction(ref: string): Promise<VerificationResult | null> {
  const restriction = await AccountRestriction.findOne({ referenceNumber: ref }).lean();
  if (!restriction) return null;
  const r = restriction as Record<string, any>;
  return {
    verified: true,
    issuer: ISSUER,
    issuerEstablished: ISSUER_ESTABLISHED,
    referenceNumber: r.referenceNumber,
    documentType: `${ACTION_LABELS[r.action as keyof typeof ACTION_LABELS]} Notice`,
    status: r.status,
    customer: await holderName(r.userId, "Verified Holder"),
    reasonCategory: REASON_LABELS[r.reasonCategory as keyof typeof REASON_LABELS],
    action: r.action,
    effectiveFrom: r.effectiveFrom,
    effectiveUntil: r.effectiveUntil,
    liftedAt: r.liftedAt,
    issuedBy: r.issuedByName,
    issuedByTitle: r.issuedByTitle,
    verifiedAt: new Date().toISOString(),
  };
}

async function verifyTrust(ref: string): Promise<VerificationResult | null> {
  const trust = await TrustAccount.findOne({ referenceNumber: ref }).lean();
  if (!trust) return null;
  const t = trust as Record<string, any>;
  const nextRelease = (t.distributions || [])
    .filter((d: any) => d.status === "scheduled" && d.triggerDate)
    .map((d: any) => new Date(d.triggerDate))
    .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];
  return {
    verified: true,
    issuer: ISSUER,
    issuerEstablished: ISSUER_ESTABLISHED,
    referenceNumber: t.referenceNumber,
    documentType: "Inheritance Trust Instrument",
    status: t.status,
    statusLabel: TRUST_STATUS_LABELS[t.status as keyof typeof TRUST_STATUS_LABELS] || t.status,
    trustName: t.trustName,
    settlor: t.settlorName ? maskName(t.settlorName) : "Verified Settlor",
    beneficiary: t.beneficiaryName ? maskName(t.beneficiaryName) : "Verified Beneficiary",
    nature: t.revocable ? "Revocable" : "Irrevocable",
    amount: t.principalAmount,
    currency: t.currency || "USD",
    issuedAt: t.fundedAt || t.createdAt || null,
    nextReleaseDate: nextRelease ? nextRelease.toISOString() : null,
    verifiedAt: new Date().toISOString(),
  };
}

async function verifyLoan(ref: string): Promise<VerificationResult | null> {
  const loan = await Loan.findOne({ referenceNumber: ref }).lean();
  if (!loan) return null;
  const l = loan as Record<string, any>;
  return {
    verified: true,
    issuer: ISSUER,
    issuerEstablished: ISSUER_ESTABLISHED,
    referenceNumber: l.referenceNumber,
    documentType:
      l.status === "approved"
        ? "Loan Facility Offer"
        : l.status === "disbursed" || l.status === "active"
          ? "Loan Facility Agreement (Executed)"
          : "Loan Application Record",
    status: l.status,
    borrower: await holderName(l.userId, "Verified Borrower"),
    loanType: LOAN_TYPE_LABELS[l.type] || l.type,
    amount: l.amount,
    currency: l.currency || "EUR",
    termMonths: l.term,
    interestRate: l.interestRate,
    monthlyPayment: l.monthlyPayment,
    issuedAt: l.approvedAt || l.applicationDate || null,
    offerExpiry: l.offerExpiry,
    agreementSignedAt: l.agreementSignedAt,
    verifiedAt: new Date().toISOString(),
  };
}

const LOOKUPS: Record<Exclude<ReferenceKind, "unknown">, (ref: string) => Promise<VerificationResult | null>> = {
  restriction: verifyRestriction,
  trust: verifyTrust,
  transaction: verifyTransaction,
  loan: verifyLoan,
};

// Search the registry the prefix points at first, then every other registry.
// Returns the HTTP status the API route should use alongside the payload.
export async function verifyDocument(ref: string): Promise<VerificationOutcome> {
  const reference = String(ref || "").trim();
  if (!reference) {
    return { status: 400, body: { verified: false, error: "Missing reference" } };
  }

  await connectDB();

  const kind = referenceKind(reference);
  const order: Array<Exclude<ReferenceKind, "unknown">> = ["restriction", "trust", "transaction", "loan"];
  if (kind !== "unknown") {
    order.splice(order.indexOf(kind), 1);
    order.unshift(kind);
  }

  for (const registry of order) {
    const hit = await LOOKUPS[registry](reference);
    if (hit) return { status: 200, body: hit };
  }

  const label = kind === "trust" ? "Trust" : "Document";
  return { status: 404, body: NOT_FOUND(label) };
}
