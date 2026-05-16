// External transfer — money moves OUT of this bank to another US institution
// via ACH (standard) or FedWire (wire-speed). For SWIFT/international flows
// use /api/transfers/international.
//
// Hardening:
//   - ABA routing checksum validated server-side
//   - Idempotency-Key required
//   - Rate-limited per user
//   - Server-side TransactionLimit enforcement
//   - KYC tier_2 required
//   - Sanctions screen on beneficiary name + bank
//   - All money math via lib/decimal (integer cents)
//   - Audit log on every state change

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { sendTransactionEmail } from "@/lib/mail";
import { runIdempotent } from "@/lib/idempotency";
import { check as rateLimitCheck, POLICIES } from "@/lib/rateLimit";
import { v, validate } from "@/lib/validators";
import { enforceLimit } from "@/lib/limits";
import { screenOrBlock } from "@/lib/sanctions";
import { audit } from "@/lib/audit";
import { toMinor, fromMinor, toNumber, gte, add } from "@/lib/decimal";
import { logger } from "@/lib/logger";
import { canPerformAction } from "@/lib/kyc";

const ACCOUNT_VALUES = ["checking", "savings", "investment"] as const;
const SPEED_VALUES = ["standard", "express", "wire"] as const;
type AccountType = (typeof ACCOUNT_VALUES)[number];
type Speed = (typeof SPEED_VALUES)[number];

const SPEED_FEE: Record<Speed, number> = {
  standard: 0,   // free ACH
  express: 15,   // same-day ACH
  wire: 30,      // FedWire
};

const SPEED_DELIVERY: Record<Speed, string> = {
  standard: "1-3 business days (ACH)",
  express: "Same business day (same-day ACH)",
  wire: "Within hours (FedWire)",
};

const MIN_AMOUNT = 1;
const MAX_AMOUNT_ACH = 100_000;
const MAX_AMOUNT_WIRE = 250_000;

interface Body {
  fromAccount: AccountType;
  recipientName: string;
  recipientAccount: string;
  recipientBank: string;
  recipientRoutingNumber: string;
  recipientAddress?: string;
  amount: string;
  description?: string;
  purpose?: string;
  transferSpeed?: Speed;
}

const balanceFieldOf = (a: AccountType) =>
  a === "savings" ? "savingsBalance" : a === "investment" ? "investmentBalance" : "checkingBalance";

export async function POST(request: NextRequest) {
  const log = logger.child({ route: "transfers/external" });

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = validate<Body>(body, {
    fromAccount: v.enum(ACCOUNT_VALUES),
    recipientName: v.string({ min: 2, max: 200 }),
    recipientAccount: v.string({ min: 4, max: 34, pattern: /^[A-Za-z0-9\-]+$/ }),
    recipientBank: v.string({ min: 2, max: 200 }),
    recipientRoutingNumber: v.routingNumber(),
    recipientAddress: v.optional(v.string({ max: 500 })),
    amount: v.amountString(),
    description: v.optional(v.string({ max: 500 })),
    purpose: v.optional(v.string({ max: 200 })),
    transferSpeed: v.optional(v.enum(SPEED_VALUES)),
  });
  if (!parsed.ok) {
    return NextResponse.json({ success: false, errors: parsed.errors }, { status: 400 });
  }

  const speed: Speed = parsed.value.transferSpeed || "standard";
  const amountMinor = toMinor(parsed.value.amount);
  const amountNumber = toNumber(amountMinor);

  const maxForSpeed = speed === "wire" ? MAX_AMOUNT_WIRE : MAX_AMOUNT_ACH;
  if (amountNumber < MIN_AMOUNT) {
    return NextResponse.json({ success: false, error: `Minimum amount is $${MIN_AMOUNT}` }, { status: 422 });
  }
  if (amountNumber > maxForSpeed) {
    return NextResponse.json(
      {
        success: false,
        error: `${speed === "wire" ? "Wire" : "ACH"} transfers limited to $${maxForSpeed.toLocaleString()}`,
      },
      { status: 422 }
    );
  }

  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

  const gate = await canPerformAction(
    user._id.toString(),
    speed === "wire" ? "domestic_wire" : "domestic_external_transfer"
  );
  if (!gate.allowed) {
    await audit({
      action: "transfer.wire.initiated",
      actorId: user._id.toString(),
      actorEmail: user.email,
      outcome: "blocked",
      severity: "warning",
      request,
      details: {
        reason: "kyc_insufficient",
        required: gate.required,
        current: gate.current,
        speed,
      },
    });
    return NextResponse.json(
      {
        success: false,
        error: gate.reason,
        requiredKycLevel: gate.required,
        currentKycLevel: gate.current,
      },
      { status: 403 }
    );
  }

  const rl = await rateLimitCheck(`ext:${user._id}`, POLICIES.transferInitiate);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many external transfer attempts" },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } }
    );
  }

  return runIdempotent({
    request,
    endpoint: "transfers/external",
    userId: user._id.toString(),
    body,
    handler: async () => {
      const screening = await screenOrBlock({
        input: {
          fullName: parsed.value.recipientName,
          bankName: parsed.value.recipientBank,
          countryCode: "US",
        },
        actorId: user._id.toString(),
        actorEmail: user.email,
        request,
      });
      if (!screening.ok) {
        return NextResponse.json(
          {
            success: false,
            error: "Transfer blocked by compliance screening. Contact support.",
            sanctionsMatches: screening.matches,
          },
          { status: 451 }
        );
      }

      const fee = SPEED_FEE[speed];
      const feeMinor = toMinor(fee.toString());
      const totalMinor = add(amountMinor, feeMinor);
      const totalNumber = toNumber(totalMinor);

      const currentMinor = toMinor(String((user as any)[balanceFieldOf(parsed.value.fromAccount)] || 0));
      if (!gte(currentMinor, totalMinor)) {
        return NextResponse.json(
          {
            success: false,
            error: "Insufficient funds (including fees)",
            details: {
              available: toNumber(currentMinor),
              transferAmount: amountNumber,
              fee,
              totalRequired: totalNumber,
              shortfall: toNumber(totalMinor - currentMinor),
            },
          },
          { status: 422 }
        );
      }

      const limit = await enforceLimit({
        userId: user._id.toString(),
        amount: totalNumber,
        kind: "transfer",
        accountType: parsed.value.fromAccount,
        actorEmail: user.email,
        request,
      });
      if (!limit.allowed) {
        return NextResponse.json(
          { success: false, error: limit.message, reason: limit.reason },
          { status: 422 }
        );
      }

      const ref = `EXT-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

      const tx = await Transaction.create({
        userId: user._id,
        type: "transfer-out",
        currency: "USD",
        amount: amountNumber,
        amountMinor: fromMinor(amountMinor),
        description:
          parsed.value.description?.trim() ||
          `${speed.toUpperCase()} transfer to ${parsed.value.recipientName}`,
        status: "pending",
        accountType: parsed.value.fromAccount,
        posted: false,
        ledgerPosted: false,
        reference: ref,
        channel: "online",
        origin: speed === "wire" ? "wire_transfer" : "external_transfer",
        metadata: {
          rail: speed === "wire" ? "FEDWIRE" : "ACH",
          transferSpeed: speed,
          recipientName: parsed.value.recipientName,
          recipientAccountLast4: parsed.value.recipientAccount.slice(-4),
          recipientBank: parsed.value.recipientBank,
          recipientRoutingNumber: parsed.value.recipientRoutingNumber,
          recipientAddress: parsed.value.recipientAddress,
          purpose: parsed.value.purpose,
          fee,
          totalAmount: totalNumber,
          sanctionsScreened: true,
          sanctionsWarnings: screening.warnings,
        },
      });

      if (fee > 0) {
        await Transaction.create({
          userId: user._id,
          type: "fee",
          currency: "USD",
          amount: fee,
          amountMinor: fromMinor(feeMinor),
          description: `${speed === "wire" ? "Wire" : "Same-day ACH"} fee`,
          status: "pending",
          accountType: parsed.value.fromAccount,
          posted: false,
          ledgerPosted: false,
          reference: `${ref}-FEE`,
          channel: "online",
          origin: speed === "wire" ? "wire_transfer" : "external_transfer",
          metadata: { linkedReference: ref, transferSpeed: speed },
        });
      }

      await audit({
        action: speed === "wire" ? "transfer.wire.initiated" : "transfer.internal.initiated",
        actorId: user._id.toString(),
        actorEmail: user.email,
        outcome: "success",
        request,
        resourceId: ref,
        details: {
          rail: speed === "wire" ? "FEDWIRE" : "ACH",
          amount: amountNumber,
          fee,
          recipientBank: parsed.value.recipientBank,
        },
      });

      try {
        await sendTransactionEmail(user.email, {
          name: user.name || "Customer",
          transaction: tx,
          subject: `${speed === "wire" ? "Wire" : "External"} Transfer Initiated - Pending Approval`,
        });
      } catch (err: any) {
        log.warn("ext.email_failed", { err: err?.message });
      }

      return NextResponse.json(
        {
          success: true,
          message: `Transfer to ${parsed.value.recipientBank} initiated. Awaiting approval.`,
          transferReference: ref,
          transfer: {
            type: "external",
            rail: speed === "wire" ? "FEDWIRE" : "ACH",
            from: parsed.value.fromAccount,
            to: {
              name: parsed.value.recipientName,
              account: `****${parsed.value.recipientAccount.slice(-4)}`,
              bank: parsed.value.recipientBank,
              routingNumber: parsed.value.recipientRoutingNumber,
            },
            amount: amountNumber,
            fee,
            total: totalNumber,
            reference: ref,
            status: "pending",
            transferSpeed: speed,
            estimatedDelivery: SPEED_DELIVERY[speed],
            date: new Date().toISOString(),
          },
        },
        { status: 200 }
      );
    },
  });
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(200, parseInt(searchParams.get("limit") || "50", 10));

  const rows = await Transaction.find({
    userId: user._id,
    type: "transfer-out",
    origin: { $in: ["external_transfer", "wire_transfer"] },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json({
    success: true,
    transfers: rows.map((tx: any) => ({
      id: tx._id.toString(),
      reference: tx.reference,
      date: tx.date || tx.createdAt,
      rail: tx.metadata?.rail || "ACH",
      transferSpeed: tx.metadata?.transferSpeed || "standard",
      amount: tx.amount,
      fee: tx.metadata?.fee || 0,
      total: (tx.amount || 0) + (tx.metadata?.fee || 0),
      fromAccount: tx.accountType,
      recipient: {
        name: tx.metadata?.recipientName || "Unknown",
        account: `****${tx.metadata?.recipientAccountLast4 || "****"}`,
        bank: tx.metadata?.recipientBank || "Unknown Bank",
      },
      status: tx.status,
      ledgerPosted: !!tx.ledgerPosted,
    })),
    total: rows.length,
  });
}
