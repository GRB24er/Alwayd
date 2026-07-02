// Admin manual debit / credit adjustment. Posts via the double-entry ledger so
// the entry is auditable, balance-correct, and reversible just like any other
// transaction. Generates an official PDF receipt and (optionally) emails the
// customer.

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { postEntries } from "@/lib/ledger";
import { toMinor, fromMinor, toNumber, gte } from "@/lib/decimal";
import { v, validate } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { generateAdjustmentDocument } from "@/lib/adjustmentDocument";
import { renderEmail } from "@/lib/emailTemplate";
import { sendSimpleEmail } from "@/lib/mail";
import type { LedgerAccount } from "@/models/LedgerEntry";
import { verificationUrlFor } from "@/lib/siteUrl";

const ACCOUNT_VALUES = ["checking", "savings", "investment"] as const;
const DIRECTION_VALUES = ["credit", "debit"] as const;
const REASON_VALUES = [
  "fee_refund",
  "fee_charge",
  "interest_payment",
  "interest_correction",
  "promotion_credit",
  "court_ordered_seizure",
  "court_ordered_credit",
  "error_correction",
  "regulatory_adjustment",
  "manual_credit",
  "manual_debit",
  "goodwill_credit",
  "other",
] as const;

const REASON_LABELS: Record<(typeof REASON_VALUES)[number], string> = {
  fee_refund: "Fee Refund",
  fee_charge: "Fee Charge",
  interest_payment: "Interest Payment",
  interest_correction: "Interest Correction",
  promotion_credit: "Promotional Credit",
  court_ordered_seizure: "Court-Ordered Seizure",
  court_ordered_credit: "Court-Ordered Credit",
  error_correction: "Error Correction",
  regulatory_adjustment: "Regulatory Adjustment",
  manual_credit: "Manual Credit",
  manual_debit: "Manual Debit",
  goodwill_credit: "Goodwill Credit",
  other: "Other Adjustment",
};

type AccountType = (typeof ACCOUNT_VALUES)[number];
type Direction = (typeof DIRECTION_VALUES)[number];

interface AdjustBody {
  direction: Direction;
  accountType: AccountType;
  amount: string;
  reasonCategory: (typeof REASON_VALUES)[number];
  reasonNote: string;
  legalBasis?: string;
  issuerTitle?: string;
  notifyCustomer?: boolean;
  allowOverdraft?: boolean;
}

const balanceFieldOf = (a: AccountType): keyof any =>
  a === "savings" ? "savingsBalance" : a === "investment" ? "investmentBalance" : "checkingBalance";
const userAccountFor = (a: AccountType): LedgerAccount =>
  a === "savings" ? "user.savings" : a === "investment" ? "user.investment" : "user.checking";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const log = logger.child({ route: "admin/accounts/adjust" });

  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !["admin", "superadmin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = validate<AdjustBody>(body, {
    direction: v.enum(DIRECTION_VALUES),
    accountType: v.enum(ACCOUNT_VALUES),
    amount: v.amountString(),
    reasonCategory: v.enum(REASON_VALUES),
    reasonNote: v.string({ min: 10, max: 4000 }),
    legalBasis: v.optional(v.string({ max: 1000 })),
    issuerTitle: v.optional(v.string({ max: 100 })),
    notifyCustomer: v.optional(v.bool()),
    allowOverdraft: v.optional(v.bool()),
  });
  if (!parsed.ok) {
    return NextResponse.json({ errors: parsed.errors }, { status: 400 });
  }

  await connectDB();

  const target = await User.findById(userId);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.role === "admin" || target.role === "superadmin") {
    return NextResponse.json(
      { error: "Cannot adjust an administrator account from this endpoint" },
      { status: 403 }
    );
  }

  const amountMinor = toMinor(parsed.value.amount);
  const amountNumber = toNumber(amountMinor);
  const balanceField = balanceFieldOf(parsed.value.accountType);
  const currentMinor = toMinor(String((target as any)[balanceField] || 0));
  const currentNumber = toNumber(currentMinor);

  if (parsed.value.direction === "debit") {
    if (!gte(currentMinor, amountMinor) && !parsed.value.allowOverdraft) {
      return NextResponse.json(
        {
          error: "Insufficient balance for debit adjustment",
          details: {
            available: currentNumber,
            requested: amountNumber,
            shortfall: toNumber(amountMinor - currentMinor),
            hint: "Set allowOverdraft=true to proceed (creates a negative balance).",
          },
        },
        { status: 422 }
      );
    }
  }

  const reference = `ADJ-${yyyymm()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const txType = parsed.value.direction === "credit" ? "adjustment-credit" : "adjustment-debit";

  // 1. Create the Transaction record (already approved — no admin queue for adjustments).
  const tx = await Transaction.create({
    userId: target._id,
    type: txType,
    currency: "USD",
    amount: amountNumber,
    amountMinor: fromMinor(amountMinor),
    description: `${REASON_LABELS[parsed.value.reasonCategory]} (${parsed.value.direction})`,
    status: "approved",
    accountType: parsed.value.accountType,
    posted: false,
    ledgerPosted: false,
    reference,
    channel: "internal",
    origin: "admin_adjustment",
    metadata: {
      reasonCategory: parsed.value.reasonCategory,
      reasonNote: parsed.value.reasonNote,
      legalBasis: parsed.value.legalBasis,
      issuedByEmail: session.user.email,
      issuedByName: session.user.name || session.user.email,
      issuerTitle: parsed.value.issuerTitle || "Operations Officer",
      allowedOverdraft: !!parsed.value.allowOverdraft,
    },
    approvedAt: new Date(),
    approvedBy: session.user.email || "admin",
    reviewedAt: new Date(),
  });

  // 2. Post the double-entry ledger row + mirror the User balance atomically.
  const conn = mongoose.connection;
  let supportsTxn = false;
  try {
    const probe = await conn.startSession();
    await probe.endSession();
    supportsTxn = true;
  } catch {}
  const sess = supportsTxn ? await conn.startSession() : null;

  try {
    const run = async (s: mongoose.ClientSession | null) => {
      await postEntries(
        {
          transactionId: tx._id.toString(),
          reference,
          currency: "USD",
          legs: [
            {
              account: userAccountFor(parsed.value.accountType),
              side: parsed.value.direction === "credit" ? "credit" : "debit",
              amountMinor,
              userId: target._id.toString(),
              description: tx.description,
            },
            {
              account: "bank.suspense",
              side: parsed.value.direction === "credit" ? "debit" : "credit",
              amountMinor,
              userId: null,
              description: `Contra: account adjustment ${reference}`,
            },
          ],
        },
        s as mongoose.ClientSession
      );
      tx.posted = true;
      (tx as any).ledgerPosted = true;
      tx.postedAt = new Date();
      await tx.save({ session: s });
    };
    if (sess) {
      await sess.withTransaction(async () => run(sess));
    } else {
      await run(null);
    }
  } catch (err: any) {
    log.error("adjust.ledger_failed", { err: err?.message, reference });
    return NextResponse.json({ error: err?.message || "Ledger posting failed" }, { status: 500 });
  } finally {
    if (sess) await sess.endSession();
  }

  // 3. Refresh balance for receipt + audit.
  const fresh = await User.findById(target._id).lean();
  const balanceAfter = Number((fresh as any)?.[balanceField as any] || 0);

  // 4. Generate receipt PDF.
  const verificationUrl = verificationUrlFor(reference);
  let pdfBytes: Uint8Array | null = null;
  try {
    pdfBytes = await generateAdjustmentDocument({
      kind: parsed.value.direction === "credit" ? "adjustment_credit" : "adjustment_debit",
      reference,
      amount: amountNumber,
      currency: "USD",
      accountType: parsed.value.accountType,
      balanceBefore: currentNumber,
      balanceAfter,
      reasonCategory: REASON_LABELS[parsed.value.reasonCategory],
      reasonNote: parsed.value.reasonNote,
      legalBasis: parsed.value.legalBasis,
      issuedAt: new Date(),
      issuedByName: session.user.name || session.user.email || "Operations Officer",
      issuedByTitle: parsed.value.issuerTitle || "Operations Officer",
      customer: {
        name: target.name,
        email: target.email,
        accountNumber: target.accountNumber,
      },
      verificationUrl,
    });
  } catch (err: any) {
    log.warn("adjust.pdf_failed", { err: err?.message, reference });
  }

  // 5. Audit log.
  await audit({
    action: "admin.balance_adjustment",
    actorId: session.user.id || null,
    actorEmail: session.user.email || undefined,
    actorRole: session.user.role,
    targetUserId: target._id.toString(),
    outcome: "success",
    severity: "warning",
    resourceId: reference,
    request,
    details: {
      operation: "manual_adjustment",
      direction: parsed.value.direction,
      accountType: parsed.value.accountType,
      amount: amountNumber,
      reasonCategory: parsed.value.reasonCategory,
      balanceBefore: currentNumber,
      balanceAfter,
    },
  });

  // 6. Notify customer (optional).
  if (parsed.value.notifyCustomer !== false) {
    try {
      const intro =
        parsed.value.direction === "credit"
          ? `An amount of $${amountNumber.toLocaleString()} has been credited to your ${parsed.value.accountType} account by Aldwych European Capital.`
          : `An amount of $${amountNumber.toLocaleString()} has been debited from your ${parsed.value.accountType} account by Aldwych European Capital.`;
      const rendered = renderEmail({
        recipientName: target.name,
        subject: `${REASON_LABELS[parsed.value.reasonCategory]} — ${reference}`,
        tag: parsed.value.direction === "credit" ? "Credit posted" : "Debit posted",
        body: `${intro}\n\nReason: ${REASON_LABELS[parsed.value.reasonCategory]}\n\n${parsed.value.reasonNote}\n\nNew ${parsed.value.accountType} balance: $${balanceAfter.toLocaleString()}\n\nDocument reference: ${reference}\n\nIf you believe this entry was posted in error, contact our Operations Office at operations@aldwychcapital.com quoting the reference above. Disputes must be raised within 60 days.`,
        senderName: session.user.name || "Aldwych Operations",
        senderTitle: parsed.value.issuerTitle || "Operations Officer",
        senderDepartment: "Operations Division",
        hideMarketingFooter: true,
      });
      await sendSimpleEmail(target.email, rendered.subject, rendered.text, rendered.html);
    } catch (err: any) {
      log.warn("adjust.email_failed", { err: err?.message, reference });
    }
  }

  return NextResponse.json({
    success: true,
    transaction: {
      id: tx._id.toString(),
      reference,
      type: txType,
      amount: amountNumber,
      accountType: parsed.value.accountType,
      direction: parsed.value.direction,
      reasonCategory: parsed.value.reasonCategory,
      balanceBefore: currentNumber,
      balanceAfter,
      documentUrl: `/api/admin/transactions/${tx._id}/document`,
    },
  });
}

function yyyymm(): string {
  return new Date().toISOString().slice(0, 7).replace("-", "");
}
