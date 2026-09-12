// src/app/api/statements/send-manual/route.ts
// Admin-initiated statement send: no customer request needed. The admin
// statements console has always had a "Send Manual Statement" form pointing
// here, but the route did not exist — the fetch 404'd, response.json() threw on
// the HTML error page, and the UI just said "Failed to send statement".
//
// A Statement record is written for every send so the console's history and
// its pending/sent/failed counts stay truthful.

import { NextRequest, NextResponse } from "next/server";
import Statement from "@/models/Statement";
import User from "@/models/User";
import { sendSimpleEmail } from "@/lib/mail";
import { requireAdmin } from "@/lib/statementAuth";
import { buildStatement, type StatementAccountType } from "@/lib/statementEmail";
import { audit } from "@/lib/audit";

const ACCOUNT_TYPES: StatementAccountType[] = ["checking", "savings", "investment"];

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let statementId: string | null = null;
  try {
    const gate = await requireAdmin();
    if (!gate.ok) {
      return NextResponse.json({ success: false, error: gate.error }, { status: gate.status });
    }

    const body = await request.json().catch(() => ({}));
    // The console's field is labelled "User Email" and typed email, so accept an
    // address here as well as an id.
    const identifier = String(body.userEmail || body.userId || body.email || "").trim();
    const accountType = String(body.accountType || "checking") as StatementAccountType;
    const startRaw = body.startDate;
    const endRaw = body.endDate;

    if (!identifier) {
      return NextResponse.json({ success: false, error: "A customer email or id is required" }, { status: 400 });
    }
    if (!ACCOUNT_TYPES.includes(accountType)) {
      return NextResponse.json({ success: false, error: "Unknown account type" }, { status: 400 });
    }
    if (!startRaw || !endRaw) {
      return NextResponse.json({ success: false, error: "A start and end date are required" }, { status: 400 });
    }

    const startDate = new Date(startRaw);
    // Include the whole of the end day, not just its first instant.
    const endDate = new Date(endRaw);
    endDate.setHours(23, 59, 59, 999);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ success: false, error: "Those dates could not be read" }, { status: 400 });
    }
    if (startDate > endDate) {
      return NextResponse.json({ success: false, error: "The start date is after the end date" }, { status: 400 });
    }

    const query = identifier.includes("@")
      ? { email: identifier.toLowerCase() }
      : { _id: identifier };
    const customer: any = await User.findOne(query as any).catch(() => null);
    if (!customer) {
      return NextResponse.json(
        { success: false, error: `No customer found for "${identifier}"` },
        { status: 404 }
      );
    }

    // Record the send before attempting it, so a failure is visible in the
    // console rather than vanishing.
    const record: any = await Statement.create({
      userId: customer._id,
      accountType,
      startDate,
      endDate,
      status: "pending",
      requestedAt: new Date(),
    });
    statementId = record._id.toString();

    const statement = await buildStatement({ user: customer, accountType, startDate, endDate });

    await sendSimpleEmail(customer.email, statement.subject, statement.text, statement.html);

    record.status = "sent";
    record.sentAt = new Date();
    await record.save();

    await audit({
      action: "admin.statement_sent",
      actorId: gate.admin?._id?.toString(),
      actorEmail: gate.admin?.email,
      outcome: "success",
      request,
      resourceId: statementId ?? undefined,
      details: {
        customer: customer.email,
        accountType,
        statementNumber: statement.statementNumber,
        transactionCount: statement.transactionCount,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Statement ${statement.statementNumber} sent to ${customer.email}`,
      statementNumber: statement.statementNumber,
      transactionCount: statement.transactionCount,
    });
  } catch (error: any) {
    console.error("POST /api/statements/send-manual error:", error);
    if (statementId) {
      await Statement.findByIdAndUpdate(statementId, {
        status: "failed",
        errorMessage: String(error?.message || error).slice(0, 500),
      }).catch(() => {});
    }
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to send statement" },
      { status: 500 }
    );
  }
}
