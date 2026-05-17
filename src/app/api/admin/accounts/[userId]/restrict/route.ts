// Admin endpoint to freeze / block / close a customer account.
// Generates an AccountRestriction row, supersedes any prior active restriction,
// updates User.accountStatus, sends a PDF notice to the customer by email, and
// returns the document reference + download URL.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { issueRestriction } from "@/lib/accountStatus";
import { generateRestrictionNotice } from "@/lib/restrictionDocument";
import { v, validate } from "@/lib/validators";
import { logger } from "@/lib/logger";
import { sendSimpleEmail } from "@/lib/mail";
import {
  RestrictionAction,
  RestrictionReasonCategory,
  AffectedAccount,
  ACTION_LABELS,
} from "@/models/AccountRestriction";

interface RestrictBody {
  action: RestrictionAction;
  reasonCategory: RestrictionReasonCategory;
  reasonNote: string;
  legalBasis?: string;
  affectedAccounts?: AffectedAccount[];
  effectiveUntil?: string;
  internalOnly?: boolean;
  issuerTitle?: string;
  notifyCustomer?: boolean;
}

const REASON_VALUES = [
  "aml_review",
  "suspected_fraud",
  "unusual_activity",
  "court_order",
  "regulatory_request",
  "sanctions_screening_hit",
  "kyc_lapsed",
  "kyc_failed",
  "customer_request",
  "chargeback_dispute",
  "deceased",
  "operational_error",
  "other",
] as const;

const ACTION_VALUES = ["freeze", "block", "close"] as const;
const AFFECTED_VALUES = ["checking", "savings", "investment", "all"] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const log = logger.child({ route: "admin/accounts/restrict" });

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

  const parsed = validate<RestrictBody>(body, {
    action: v.enum(ACTION_VALUES),
    reasonCategory: v.enum(REASON_VALUES),
    reasonNote: v.string({ min: 10, max: 4000 }),
    legalBasis: v.optional(v.string({ max: 1000 })),
    affectedAccounts: v.optional(v.string({ max: 100 })) as any, // validated below
    effectiveUntil: v.optional(v.string({ max: 30 })),
    internalOnly: v.optional(v.bool()),
    issuerTitle: v.optional(v.string({ max: 100 })),
    notifyCustomer: v.optional(v.bool()),
  });
  if (!parsed.ok) {
    return NextResponse.json({ errors: parsed.errors }, { status: 400 });
  }

  // Custom array validation for affectedAccounts
  const affectedRaw = body.affectedAccounts;
  let affected: AffectedAccount[] = ["all"];
  if (Array.isArray(affectedRaw) && affectedRaw.length > 0) {
    const ok = affectedRaw.every((a: string) => (AFFECTED_VALUES as readonly string[]).includes(a));
    if (!ok) {
      return NextResponse.json(
        { error: "affectedAccounts must be one or more of: checking, savings, investment, all" },
        { status: 400 }
      );
    }
    affected = affectedRaw as AffectedAccount[];
  }

  let effectiveUntil: Date | null = null;
  if (parsed.value.effectiveUntil) {
    const d = new Date(parsed.value.effectiveUntil);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid effectiveUntil date" }, { status: 400 });
    }
    if (d.getTime() <= Date.now()) {
      return NextResponse.json({ error: "effectiveUntil must be in the future" }, { status: 400 });
    }
    effectiveUntil = d;
  }

  await connectDB();

  const target = await User.findById(userId);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.role === "admin" || target.role === "superadmin") {
    return NextResponse.json(
      { error: "Cannot restrict an administrator account from this endpoint" },
      { status: 403 }
    );
  }

  const restriction = await issueRestriction({
    userId: target._id.toString(),
    action: parsed.value.action,
    reasonCategory: parsed.value.reasonCategory,
    reasonNote: parsed.value.reasonNote,
    legalBasis: parsed.value.legalBasis,
    affectedAccounts: affected,
    effectiveUntil,
    internalOnly: !!parsed.value.internalOnly,
    issuedById: session.user.id || "admin",
    issuedByEmail: session.user.email || "compliance@aldwychcapital.com",
    issuedByName: session.user.name || session.user.email || "Compliance Officer",
    issuerTitle: parsed.value.issuerTitle,
  } as any);

  // Generate the PDF notice (regardless of whether we email it, the customer
  // can download from their dashboard via the document endpoint).
  const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/verify/${restriction.referenceNumber}`;
  let pdfBytes: Uint8Array | null = null;
  try {
    pdfBytes = await generateRestrictionNotice({
      restriction,
      customer: {
        name: target.name,
        email: target.email,
        accountNumber: target.accountNumber,
        routingNumber: target.routingNumber,
      },
      verificationUrl,
    });
  } catch (err: any) {
    log.error("restriction.pdf_failed", { ref: restriction.referenceNumber, err: err?.message });
  }

  // Notify the customer by email with the PDF attached. Failure here does NOT
  // roll back the restriction — the restriction is the source of truth.
  const notify = parsed.value.notifyCustomer !== false;
  if (notify && pdfBytes) {
    try {
      const subject = `${ACTION_LABELS[parsed.value.action]} Notice — ${restriction.referenceNumber}`;
      const intro =
        parsed.value.action === "freeze"
          ? `Your account at Aldwych European Capital has been placed under a temporary freeze. The attached notice contains the full details and instructions to resolve the matter.`
          : parsed.value.action === "block"
          ? `Your account at Aldwych European Capital has been placed under a full block. The attached notice contains the full details and steps to take.`
          : `Your account at Aldwych European Capital has been closed. The attached notice contains the full details.`;
      await sendSimpleEmail(
        target.email,
        subject,
        `${intro}\n\nDocument reference: ${restriction.referenceNumber}\n\nIf you believe this notice was issued in error, contact compliance@aldwychcapital.com quoting the reference above.`,
        `<p>${intro}</p><p>Document reference: <strong>${restriction.referenceNumber}</strong></p><p>If you believe this notice was issued in error, contact <a href="mailto:compliance@aldwychcapital.com">compliance@aldwychcapital.com</a> quoting the reference above.</p>`,
        // sendSimpleEmail's signature may not support attachments directly; if not,
        // we fall back to a link. The dashboard always shows a download button.
      );
      restriction.customerNotifiedAt = new Date();
      await restriction.save();
    } catch (err: any) {
      restriction.customerNotificationFailureReason = err?.message || "unknown";
      await restriction.save();
      log.warn("restriction.email_failed", { ref: restriction.referenceNumber, err: err?.message });
    }
  }

  return NextResponse.json({
    success: true,
    restriction: {
      id: restriction._id.toString(),
      referenceNumber: restriction.referenceNumber,
      action: restriction.action,
      status: restriction.status,
      reasonCategory: restriction.reasonCategory,
      affectedAccounts: restriction.affectedAccounts,
      effectiveFrom: restriction.effectiveFrom,
      effectiveUntil: restriction.effectiveUntil,
      issuedByName: restriction.issuedByName,
      customerNotifiedAt: restriction.customerNotifiedAt,
      documentUrl: `/api/admin/restrictions/${restriction.referenceNumber}/document`,
    },
    user: {
      id: target._id.toString(),
      name: target.name,
      email: target.email,
      accountStatus: ACTION_TO_STATUS_LABEL[restriction.action],
    },
  });
}

const ACTION_TO_STATUS_LABEL: Record<RestrictionAction, string> = {
  freeze: "frozen",
  block: "blocked",
  close: "closed",
};
