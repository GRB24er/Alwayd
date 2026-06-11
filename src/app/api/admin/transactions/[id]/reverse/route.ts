// Admin reversal of a posted transaction. Rather than mutate or delete the
// original (which would break the ledger), we post a CONTRA-entry — same
// amount, opposite direction — referencing the original. Both records remain
// permanently in the ledger; the customer's balance reflects the net.

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction, { isCreditType } from "@/models/Transaction";
import { postEntries } from "@/lib/ledger";
import { toMinor, fromMinor, toNumber } from "@/lib/decimal";
import { v, validate } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { generateAdjustmentDocument } from "@/lib/adjustmentDocument";
import { renderEmail } from "@/lib/emailTemplate";
import { sendSimpleEmail } from "@/lib/mail";
import type { LedgerAccount } from "@/models/LedgerEntry";
import { verificationUrlFor } from "@/lib/siteUrl";

interface ReverseBody {
  reason: string;
  reasonCategory?: string;
  issuerTitle?: string;
  notifyCustomer?: boolean;
}

const userAccountFor = (a: string): LedgerAccount =>
  a === "savings" ? "user.savings" : a === "investment" ? "user.investment" : "user.checking";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = logger.child({ route: "admin/transactions/reverse" });

  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !["admin", "superadmin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid transaction id" }, { status: 400 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = validate<ReverseBody>(body, {
    reason: v.string({ min: 10, max: 4000 }),
    reasonCategory: v.optional(v.string({ max: 100 })),
    issuerTitle: v.optional(v.string({ max: 100 })),
    notifyCustomer: v.optional(v.bool()),
  });
  if (!parsed.ok) {
    return NextResponse.json({ errors: parsed.errors }, { status: 400 });
  }

  await connectDB();

  const original = await Transaction.findById(id);
  if (!original) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

  if (original.status !== "approved" && original.status !== "completed") {
    return NextResponse.json(
      { error: `Cannot reverse a transaction in status "${original.status}"; only approved/completed entries can be reversed.` },
      { status: 422 }
    );
  }
  if (!(original as any).ledgerPosted) {
    return NextResponse.json(
      { error: "Original transaction has no ledger entries; nothing to reverse." },
      { status: 422 }
    );
  }
  if ((original as any).reversedAt) {
    return NextResponse.json(
      {
        error: "Transaction has already been reversed",
        reversedByReference: (original as any).reversedByReference,
      },
      { status: 409 }
    );
  }
  if ((original as any).reversalOf) {
    return NextResponse.json(
      { error: "Cannot reverse a reversal. Issue a new adjustment instead." },
      { status: 422 }
    );
  }

  const target = await User.findById(original.userId);
  if (!target) return NextResponse.json({ error: "User on transaction no longer exists" }, { status: 404 });

  const accountType = (original.accountType as "checking" | "savings" | "investment") || "checking";
  const balanceField =
    accountType === "savings" ? "savingsBalance" : accountType === "investment" ? "investmentBalance" : "checkingBalance";
  const balanceBefore = Number((target as any)[balanceField] || 0);

  const amountMinor = (original as any).amountMinor
    ? toMinor((original as any).amountMinor as string)
    : toMinor(String(original.amount));
  const amountNumber = toNumber(amountMinor);

  // The contra entry: if original was a credit to the user, reversal is a debit
  // (and vice-versa). For paired internal transfers, the admin should reverse
  // BOTH legs separately — we don't auto-cascade here because the two legs may
  // be reversed for different reasons, and we want each reversal to carry its
  // own audit + notice.
  const originalSide: "credit" | "debit" = isCreditType(original.type as any) ? "credit" : "debit";
  const contraSide: "credit" | "debit" = originalSide === "credit" ? "debit" : "credit";
  const reversalType = contraSide === "credit" ? "adjustment-credit" : "adjustment-debit";

  const reversalRef = `REV-${yyyymm()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  // 1. Create the reversal transaction record.
  const reversal = await Transaction.create({
    userId: target._id,
    type: reversalType,
    currency: original.currency || "USD",
    amount: amountNumber,
    amountMinor: fromMinor(amountMinor),
    description: `Reversal of ${original.reference || original._id} — ${parsed.value.reason.slice(0, 80)}`,
    status: "approved",
    accountType,
    posted: false,
    ledgerPosted: false,
    reference: reversalRef,
    channel: "admin",
    origin: "reversal",
    reversalOf: original._id,
    metadata: {
      originalTransactionId: original._id.toString(),
      originalReference: original.reference,
      originalType: original.type,
      originalDate: original.date || original.createdAt,
      originalAmount: original.amount,
      originalDescription: original.description,
      reversalReason: parsed.value.reason,
      reasonCategory: parsed.value.reasonCategory || "error_correction",
      issuedByEmail: session.user.email,
      issuedByName: session.user.name || session.user.email,
      issuerTitle: parsed.value.issuerTitle || "Operations Officer",
    },
    approvedAt: new Date(),
    approvedBy: session.user.email || "admin",
    reviewedAt: new Date(),
  });

  // 2. Post the contra ledger entries inside a session.
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
          transactionId: reversal._id.toString(),
          reference: reversalRef,
          currency: original.currency || "USD",
          legs: [
            {
              account: userAccountFor(accountType),
              side: contraSide,
              amountMinor,
              userId: target._id.toString(),
              description: `Reversal of ${original.reference}`,
            },
            {
              account: "bank.suspense",
              side: originalSide,
              amountMinor,
              userId: null,
              description: `Contra: reversal ${reversalRef}`,
            },
          ],
        },
        s as mongoose.ClientSession
      );

      reversal.posted = true;
      (reversal as any).ledgerPosted = true;
      reversal.postedAt = new Date();
      await reversal.save({ session: s });

      // Mark the ORIGINAL as reversed (preserving its data).
      (original as any).reversedAt = new Date();
      (original as any).reversedBy = session.user.email || "admin";
      (original as any).reversedByReference = reversalRef;
      (original as any).reversalReason = parsed.value.reason;
      await original.save({ session: s });
    };
    if (sess) {
      await sess.withTransaction(async () => run(sess));
    } else {
      await run(null);
    }
  } catch (err: any) {
    log.error("reverse.ledger_failed", { err: err?.message, reversalRef });
    return NextResponse.json({ error: err?.message || "Reversal posting failed" }, { status: 500 });
  } finally {
    if (sess) await sess.endSession();
  }

  // 3. Read back the user's balance for the receipt.
  const fresh = await User.findById(target._id).lean();
  const balanceAfter = Number((fresh as any)?.[balanceField] || 0);

  // 4. Generate the reversal notice PDF.
  let pdfBytes: Uint8Array | null = null;
  try {
    pdfBytes = await generateAdjustmentDocument({
      kind: "reversal",
      reference: reversalRef,
      amount: amountNumber,
      currency: original.currency || "USD",
      accountType,
      balanceBefore,
      balanceAfter,
      reasonCategory: parsed.value.reasonCategory || "Error Correction",
      reasonNote: parsed.value.reason,
      issuedAt: new Date(),
      issuedByName: session.user.name || session.user.email || "Operations Officer",
      issuedByTitle: parsed.value.issuerTitle || "Operations Officer",
      reversedReference: original.reference,
      reversedAt: new Date(),
      reversedDescription: original.description,
      reversedOriginalDate: (original.date as Date) || (original.createdAt as Date),
      customer: {
        name: target.name,
        email: target.email,
        accountNumber: target.accountNumber,
      },
      verificationUrl: verificationUrlFor(reversalRef),
    });
  } catch (err: any) {
    log.warn("reverse.pdf_failed", { err: err?.message, reversalRef });
  }

  // 5. Audit log.
  await audit({
    action: "transaction.reversed",
    actorId: session.user.id || null,
    actorEmail: session.user.email || undefined,
    actorRole: session.user.role,
    targetUserId: target._id.toString(),
    outcome: "success",
    severity: "warning",
    resourceId: reversalRef,
    request,
    details: {
      reversalReference: reversalRef,
      originalReference: original.reference,
      originalId: original._id.toString(),
      amount: amountNumber,
      accountType,
      contraSide,
      reason: parsed.value.reason,
    },
  });

  // 6. Notify customer (optional).
  if (parsed.value.notifyCustomer !== false) {
    try {
      const rendered = renderEmail({
        recipientName: target.name,
        subject: `Transaction Reversal — ${reversalRef}`,
        tag: "Reversal posted",
        body: `A previously posted transaction on your ${accountType} account has been reversed by Aldwych European Capital.\n\nOriginal transaction: ${original.reference}\nOriginal description: ${original.description || "—"}\nAmount reversed: $${amountNumber.toLocaleString()}\nReversal reference: ${reversalRef}\n\nReason for reversal: ${parsed.value.reason}\n\nYour new ${accountType} balance is $${balanceAfter.toLocaleString()}.\n\nThe original transaction record is preserved in our ledger; you may continue to see it in your transaction history alongside the reversal entry. If you have any questions, contact our Operations Office at operations@aldwychcapital.com.`,
        senderName: session.user.name || "Aldwych Operations",
        senderTitle: parsed.value.issuerTitle || "Operations Officer",
        senderDepartment: "Operations Division",
        hideMarketingFooter: true,
      });
      await sendSimpleEmail(target.email, rendered.subject, rendered.text, rendered.html);
    } catch (err: any) {
      log.warn("reverse.email_failed", { err: err?.message, reversalRef });
    }
  }

  return NextResponse.json({
    success: true,
    reversal: {
      id: reversal._id.toString(),
      reference: reversalRef,
      reversesReference: original.reference,
      reversesId: original._id.toString(),
      amount: amountNumber,
      accountType,
      balanceBefore,
      balanceAfter,
      documentUrl: `/api/admin/transactions/${reversal._id}/document`,
    },
  });
}

function yyyymm(): string {
  return new Date().toISOString().slice(0, 7).replace("-", "");
}
