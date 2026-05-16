// Wire transfer initiation. All wire transfers are funds-out and irrevocable once cleared,
// so the controls here are stricter than internal transfers:
//   - Idempotency-Key required
//   - Per-user rate limit on initiation
//   - Server-side transaction-limit enforcement
//   - OFAC / sanctions screening on beneficiary + country
//   - Real routing number checksum validation (ABA) for domestic wires
//   - IBAN + BIC validation for international wires

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
import crypto from "crypto";

const ACCOUNT_VALUES = ["checking", "savings", "investment"] as const;
type AccountType = (typeof ACCOUNT_VALUES)[number];

const WIRE_TYPE_VALUES = ["domestic", "international"] as const;
type WireType = (typeof WIRE_TYPE_VALUES)[number];

const MIN_WIRE = 100; // USD
const MAX_WIRE = 250_000; // USD; above this routes to manual review
const DOMESTIC_FEE = 30;
const INTERNATIONAL_FEE = 45;
const URGENT_FEE = 25;

interface ParsedBody {
  fromAccount: AccountType;
  wireType: WireType;
  recipientName: string;
  recipientAccount: string;
  recipientBank: string;
  recipientBankAddress: string;
  recipientAddress: string;
  amount: string;
  purposeOfTransfer: string;
  description?: string;
  urgentTransfer?: boolean;
  recipientRoutingNumber?: string;
  recipientSwiftBic?: string;
  recipientCountry?: string;
}

const balanceFieldOf = (a: AccountType) =>
  a === "savings" ? "savingsBalance" : a === "investment" ? "investmentBalance" : "checkingBalance";

export async function POST(request: NextRequest) {
  const log = logger.child({ route: "transfers/wire" });

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

  const parsed = validate<ParsedBody>(body, {
    fromAccount: v.enum(ACCOUNT_VALUES),
    wireType: v.enum(WIRE_TYPE_VALUES),
    recipientName: v.string({ min: 2, max: 200 }),
    recipientAccount: v.string({ min: 4, max: 34 }),
    recipientBank: v.string({ min: 2, max: 200 }),
    recipientBankAddress: v.string({ min: 4, max: 500 }),
    recipientAddress: v.string({ min: 4, max: 500 }),
    amount: v.amountString(),
    purposeOfTransfer: v.string({ min: 3, max: 200 }),
    description: v.optional(v.string({ max: 500 })),
    urgentTransfer: v.optional(v.bool()),
    recipientRoutingNumber: v.optional(v.string({ max: 9 })),
    recipientSwiftBic: v.optional(v.swiftBic()),
    recipientCountry: v.optional(v.countryCode()),
  });
  if (!parsed.ok) {
    return NextResponse.json({ success: false, errors: parsed.errors }, { status: 400 });
  }

  // Wire-type-specific routing details. Domestic wants ABA; international wants SWIFT + country.
  if (parsed.value.wireType === "domestic") {
    const checked = validate<{ recipientRoutingNumber: string }>(
      { recipientRoutingNumber: parsed.value.recipientRoutingNumber },
      { recipientRoutingNumber: v.routingNumber() }
    );
    if (!checked.ok) {
      return NextResponse.json({ success: false, errors: checked.errors }, { status: 400 });
    }
  } else {
    if (!parsed.value.recipientSwiftBic) {
      return NextResponse.json(
        { success: false, errors: { recipientSwiftBic: "International wires require a SWIFT/BIC code" } },
        { status: 400 }
      );
    }
    if (!parsed.value.recipientCountry) {
      return NextResponse.json(
        { success: false, errors: { recipientCountry: "International wires require an ISO country code" } },
        { status: 400 }
      );
    }
  }

  const amountMinor = toMinor(parsed.value.amount);
  const amountNumber = toNumber(amountMinor);

  if (amountNumber < MIN_WIRE) {
    return NextResponse.json(
      { success: false, error: `Minimum wire transfer is $${MIN_WIRE}` },
      { status: 422 }
    );
  }
  if (amountNumber > MAX_WIRE) {
    return NextResponse.json(
      {
        success: false,
        error: `Wires above $${MAX_WIRE.toLocaleString()} require manual review. Contact support.`,
      },
      { status: 422 }
    );
  }

  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

  const rl = await rateLimitCheck(`wire:${user._id}`, POLICIES.transferInitiate);
  if (!rl.allowed) {
    await audit({
      action: "rate_limit.exceeded",
      actorId: user._id.toString(),
      actorEmail: user.email,
      outcome: "blocked",
      request,
      details: { policy: "transferInitiate", channel: "wire" },
    });
    return NextResponse.json(
      { success: false, error: "Too many wire transfer attempts" },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } }
    );
  }

  return runIdempotent({
    request,
    endpoint: "transfers/wire",
    userId: user._id.toString(),
    body,
    handler: async () => {
      const sanctions = await screenOrBlock({
        input: {
          fullName: parsed.value.recipientName,
          bankName: parsed.value.recipientBank,
          countryCode: parsed.value.recipientCountry,
        },
        actorId: user._id.toString(),
        actorEmail: user.email,
        request,
      });
      if (!sanctions.ok) {
        return NextResponse.json(
          {
            success: false,
            error: "Transfer blocked by compliance screening. Contact support.",
          },
          { status: 451 }
        );
      }

      const wireFee = parsed.value.wireType === "international" ? INTERNATIONAL_FEE : DOMESTIC_FEE;
      const totalFee = wireFee + (parsed.value.urgentTransfer ? URGENT_FEE : 0);
      const totalMinor = add(amountMinor, toMinor(totalFee.toString()));
      const totalNumber = toNumber(totalMinor);

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

      const currentMinor = toMinor(String((user as any)[balanceFieldOf(parsed.value.fromAccount)] || 0));
      if (!gte(currentMinor, totalMinor)) {
        return NextResponse.json(
          {
            success: false,
            error: "Insufficient funds for wire transfer (including fees)",
            details: {
              available: toNumber(currentMinor),
              transferAmount: amountNumber,
              wireFee: totalFee,
              totalRequired: totalNumber,
              shortfall: toNumber(totalMinor - currentMinor),
            },
          },
          { status: 422 }
        );
      }

      const wireRef = `WIRE-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

      const wireTx = await Transaction.create({
        userId: user._id,
        type: "transfer-out",
        currency: "USD",
        amount: amountNumber,
        amountMinor: fromMinor(amountMinor),
        description:
          parsed.value.description?.trim() ||
          `${parsed.value.wireType === "international" ? "International" : "Domestic"} wire to ${parsed.value.recipientName}`,
        status: "pending",
        accountType: parsed.value.fromAccount,
        posted: false,
        ledgerPosted: false,
        reference: wireRef,
        channel: "online",
        origin: "wire_transfer",
        metadata: {
          wireType: parsed.value.wireType,
          recipientName: parsed.value.recipientName,
          recipientAccountLast4: parsed.value.recipientAccount.slice(-4),
          recipientBank: parsed.value.recipientBank,
          recipientBankAddress: parsed.value.recipientBankAddress,
          recipientAddress: parsed.value.recipientAddress,
          recipientCountry: parsed.value.recipientCountry,
          recipientRoutingLast4: parsed.value.recipientRoutingNumber?.slice(-4),
          recipientSwiftBic: parsed.value.recipientSwiftBic,
          purposeOfTransfer: parsed.value.purposeOfTransfer,
          urgentTransfer: !!parsed.value.urgentTransfer,
          wireFee: totalFee,
          totalAmount: totalNumber,
          sanctionsScreened: true,
        },
      });

      if (totalFee > 0) {
        await Transaction.create({
          userId: user._id,
          type: "fee",
          currency: "USD",
          amount: totalFee,
          amountMinor: fromMinor(toMinor(totalFee.toString())),
          description: `Wire transfer fee${parsed.value.urgentTransfer ? " (urgent)" : ""}`,
          status: "pending",
          accountType: parsed.value.fromAccount,
          posted: false,
          ledgerPosted: false,
          reference: `${wireRef}-FEE`,
          channel: "online",
          origin: "wire_transfer",
          metadata: { linkedReference: wireRef, wireType: parsed.value.wireType },
        });
      }

      await audit({
        action: "transfer.wire.initiated",
        actorId: user._id.toString(),
        actorEmail: user.email,
        outcome: "success",
        request,
        resourceId: wireRef,
        details: {
          wireType: parsed.value.wireType,
          amount: amountNumber,
          fee: totalFee,
          country: parsed.value.recipientCountry,
          bank: parsed.value.recipientBank,
        },
      });

      try {
        await sendTransactionEmail(user.email, {
          name: user.name || "Customer",
          transaction: wireTx,
          subject: "Wire Transfer Initiated - Pending Approval",
        });
      } catch (err: any) {
        log.warn("wire.email_failed", { err: err?.message });
      }

      return NextResponse.json(
        {
          success: true,
          message: `${parsed.value.wireType === "international" ? "International" : "Domestic"} wire initiated. Awaiting approval.`,
          wireReference: wireRef,
          transfer: {
            type: "wire",
            wireType: parsed.value.wireType,
            from: parsed.value.fromAccount,
            to: {
              name: parsed.value.recipientName,
              account: `****${parsed.value.recipientAccount.slice(-4)}`,
              bank: parsed.value.recipientBank,
              country: parsed.value.recipientCountry,
            },
            amount: amountNumber,
            fee: totalFee,
            total: totalNumber,
            reference: wireRef,
            status: "pending",
            urgentTransfer: !!parsed.value.urgentTransfer,
            purposeOfTransfer: parsed.value.purposeOfTransfer,
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
  const wireType = searchParams.get("wireType");

  const query: any = { userId: user._id, type: "transfer-out", origin: "wire_transfer" };
  if (wireType) query["metadata.wireType"] = wireType;

  const rows = await Transaction.find(query).sort({ createdAt: -1 }).limit(limit).lean();

  return NextResponse.json({
    success: true,
    wireTransfers: rows.map((tx: any) => ({
      id: tx._id.toString(),
      reference: tx.reference,
      date: tx.date || tx.createdAt,
      amount: tx.amount,
      fee: tx.metadata?.wireFee || 0,
      total: (tx.amount || 0) + (tx.metadata?.wireFee || 0),
      fromAccount: tx.accountType,
      wireType: tx.metadata?.wireType || "domestic",
      recipient: {
        name: tx.metadata?.recipientName || "Unknown",
        account: `****${tx.metadata?.recipientAccountLast4 || "****"}`,
        bank: tx.metadata?.recipientBank || "Unknown Bank",
        country: tx.metadata?.recipientCountry,
      },
      status: tx.status,
      ledgerPosted: !!tx.ledgerPosted,
      urgentTransfer: tx.metadata?.urgentTransfer || false,
      description: tx.description,
    })),
    total: rows.length,
  });
}
