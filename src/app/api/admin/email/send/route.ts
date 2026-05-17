// Admin email composer endpoint. Renders the body through the brand template,
// sends via SMTP, and persists an AdminEmail record for audit + sent-folder.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import AdminEmail, { AdminEmailCategory } from "@/models/AdminEmail";
import { renderEmail } from "@/lib/emailTemplate";
import { sendSimpleEmail } from "@/lib/mail";
import { v, validate } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";

const CATEGORY_VALUES = ["general", "notice", "marketing", "support", "operational"] as const;

interface ComposeBody {
  recipientUserId?: string;
  recipientEmail?: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyIsHtml?: boolean;
  category?: AdminEmailCategory;
  tag?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  senderName?: string;
  senderTitle?: string;
  senderDepartment?: string;
  hideMarketingFooter?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: NextRequest) {
  const log = logger.child({ route: "admin/email/send" });

  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !["admin", "superadmin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = validate<ComposeBody>(body, {
    recipientUserId: v.optional(v.string({ max: 100 })),
    recipientEmail: v.optional(v.email()),
    subject: v.string({ min: 3, max: 400 }),
    body: v.string({ min: 1, max: 50_000 }),
    bodyIsHtml: v.optional(v.bool()),
    category: v.optional(v.enum(CATEGORY_VALUES)),
    tag: v.optional(v.string({ max: 200 })),
    ctaLabel: v.optional(v.string({ max: 80 })),
    ctaUrl: v.optional(v.string({ max: 1024 })),
    senderName: v.optional(v.string({ max: 100 })),
    senderTitle: v.optional(v.string({ max: 100 })),
    senderDepartment: v.optional(v.string({ max: 100 })),
    hideMarketingFooter: v.optional(v.bool()),
  });
  if (!parsed.ok) {
    return NextResponse.json({ errors: parsed.errors }, { status: 400 });
  }

  // CC / BCC are arrays — validate manually.
  const cc = sanitizeEmailList(body.cc);
  const bcc = sanitizeEmailList(body.bcc);
  if (cc === null || bcc === null) {
    return NextResponse.json(
      { errors: { cc: "cc/bcc must be arrays of valid email addresses" } },
      { status: 400 }
    );
  }

  // Resolve recipient
  await connectDB();
  let recipientEmail = parsed.value.recipientEmail?.toLowerCase();
  let recipientUserId: mongoose.Types.ObjectId | null = null;
  let recipientName: string | undefined;

  if (parsed.value.recipientUserId) {
    if (!mongoose.Types.ObjectId.isValid(parsed.value.recipientUserId)) {
      return NextResponse.json({ error: "Invalid recipientUserId" }, { status: 400 });
    }
    const u = await User.findById(parsed.value.recipientUserId).select({ email: 1, name: 1 }).lean();
    if (!u) return NextResponse.json({ error: "Recipient user not found" }, { status: 404 });
    recipientEmail = (u as any).email;
    recipientUserId = new mongoose.Types.ObjectId(parsed.value.recipientUserId);
    recipientName = (u as any).name;
  }

  if (!recipientEmail) {
    return NextResponse.json(
      { errors: { recipientEmail: "Either recipientUserId or recipientEmail is required" } },
      { status: 400 }
    );
  }

  // If only email was supplied, see if we have a matching user to capture the link.
  if (!recipientUserId && recipientEmail) {
    const existing = await User.findOne({ email: recipientEmail }).select({ name: 1 }).lean();
    if (existing) {
      recipientUserId = (existing as any)._id;
      recipientName = (existing as any).name;
    }
  }

  // Render the email through the brand template.
  const rendered = renderEmail({
    recipientName,
    subject: parsed.value.subject,
    body: parsed.value.body,
    bodyIsHtml: !!parsed.value.bodyIsHtml,
    tag: parsed.value.tag,
    cta: parsed.value.ctaLabel && parsed.value.ctaUrl
      ? { label: parsed.value.ctaLabel, url: parsed.value.ctaUrl }
      : undefined,
    senderName: parsed.value.senderName || session.user.name || "The Aldwych Team",
    senderTitle: parsed.value.senderTitle,
    senderDepartment: parsed.value.senderDepartment,
    hideMarketingFooter: !!parsed.value.hideMarketingFooter,
  });

  // Persist FIRST so we have the audit record even if SMTP fails.
  const record = await AdminEmail.create({
    senderId: session.user.id || new mongoose.Types.ObjectId(),
    senderEmail: session.user.email || "admin@aldwychcapital.com",
    senderName: session.user.name || session.user.email || "Admin",
    recipientEmail,
    recipientUserId,
    cc,
    bcc,
    subject: rendered.subject,
    bodyText: rendered.text,
    bodyHtmlPreview: rendered.html.slice(0, 4096),
    category: parsed.value.category || "general",
    status: "queued",
  });

  // Send via the existing transactional SMTP path.
  let sendError: string | undefined;
  let messageId: string | undefined;
  try {
    const result: any = await sendSimpleEmail(
      recipientEmail,
      rendered.subject,
      rendered.text,
      rendered.html
    );
    messageId = result?.messageId || result?.id;
  } catch (err: any) {
    sendError = err?.message || String(err);
    log.warn("admin_email.send_failed", { id: record._id.toString(), err: sendError });
  }

  record.status = sendError ? "failed" : "sent";
  record.sentAt = sendError ? undefined : new Date();
  record.messageId = messageId;
  if (sendError) record.errorReason = sendError;
  await record.save();

  await audit({
    action: "admin.email_sent",
    actorId: session.user.id || null,
    actorEmail: session.user.email || undefined,
    actorRole: session.user.role,
    targetUserId: recipientUserId ? recipientUserId.toString() : null,
    outcome: sendError ? "failure" : "success",
    request,
    resourceId: record._id.toString(),
    details: {
      recipientEmail,
      subject: rendered.subject,
      category: record.category,
      hasCc: cc.length > 0,
      hasBcc: bcc.length > 0,
      hasCta: !!(parsed.value.ctaLabel && parsed.value.ctaUrl),
      error: sendError,
    },
  });

  if (sendError) {
    return NextResponse.json(
      { success: false, error: "Email could not be delivered.", details: sendError, recordId: record._id.toString() },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    email: {
      id: record._id.toString(),
      subject: record.subject,
      recipientEmail: record.recipientEmail,
      sentAt: record.sentAt,
      status: record.status,
      category: record.category,
    },
  });
}

function sanitizeEmailList(raw: any): string[] | null {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v !== "string") return null;
    const s = v.trim().toLowerCase();
    if (!s) continue;
    if (!EMAIL_RE.test(s)) return null;
    out.push(s);
  }
  return out;
}
