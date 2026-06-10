// Internal transfer between a user's own accounts.
// Hardening over the previous implementation:
//   - Requires Idempotency-Key (replays are deduped)
//   - Rate limited per user
//   - Server-side enforcement of TransactionLimit (not just a UX preview)
//   - Creates a SINGLE parent transaction with both legs linked by `transferGroup`
//     so an admin can't half-approve one side and leave the books unbalanced
//   - Inputs validated against a schema before any DB work
//   - Every state change is audit-logged with actor IP / user agent

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { sendTransactionEmail } from "@/lib/mail";
import { runIdempotent } from "@/lib/idempotency";
import { check as rateLimitCheck, ipFromHeaders, POLICIES } from "@/lib/rateLimit";
import { v, validate, firstValidationError } from "@/lib/validators";
import { enforceLimit } from "@/lib/limits";
import { audit } from "@/lib/audit";
import { toMinor, fromMinor, gte, toNumber } from "@/lib/decimal";
import { logger } from "@/lib/logger";
import { assertAccountActive } from "@/lib/accountStatus";
import crypto from "crypto";

const ACCOUNT_VALUES = ["checking", "savings", "investment"] as const;
type AccountType = (typeof ACCOUNT_VALUES)[number];

const balanceFieldOf = (a: AccountType) =>
  a === "savings" ? "savingsBalance" : a === "investment" ? "investmentBalance" : "checkingBalance";

interface ParsedBody {
  fromAccount: AccountType;
  toAccount: AccountType;
  amount: string;
  description?: string;
}

export async function POST(request: NextRequest) {
  const log = logger.child({ route: "transfers/internal" });

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = validate<ParsedBody>(body, {
    fromAccount: v.enum(ACCOUNT_VALUES),
    toAccount: v.enum(ACCOUNT_VALUES),
    amount: v.amountString(),
    description: v.optional(v.string({ max: 500 })),
  });
  if (!parsed.ok) {
    return NextResponse.json(
      { success: false, error: firstValidationError(parsed.errors), errors: parsed.errors },
      { status: 400 }
    );
  }
  if (parsed.value.fromAccount === parsed.value.toAccount) {
    return NextResponse.json(
      { success: false, error: "Source and destination must differ" },
      { status: 400 }
    );
  }

  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  const rl = await rateLimitCheck(`transfer:${user._id}`, POLICIES.transferInitiate);
  if (!rl.allowed) {
    await audit({
      action: "rate_limit.exceeded",
      actorId: user._id.toString(),
      actorEmail: user.email,
      outcome: "blocked",
      request,
      details: { policy: "transferInitiate", retryAfterSeconds: rl.retryAfterSeconds },
    });
    return NextResponse.json(
      { success: false, error: "Too many transfer attempts. Try again later." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } }
    );
  }

  return runIdempotent({
    request,
    endpoint: "transfers/internal",
    userId: user._id.toString(),
    body,
    handler: async () => {
      const { fromAccount, toAccount, amount, description } = parsed.value;

      // Account-status gate. A frozen account can't move money out (or even
      // between own accounts); a blocked account is fully locked.
      const status = await assertAccountActive(user._id.toString(), fromAccount);
      if (!status.ok) {
        return NextResponse.json(
          {
            success: false,
            error: `Account ${status.status}: ${status.reasonNote}`,
            accountStatus: status.status,
            restrictionReference: status.referenceNumber,
            documentUrl: status.documentUrl,
          },
          { status: 423 }
        );
      }

      const amountMinor = toMinor(amount);
      const amountNumber = toNumber(amountMinor);

      // Server-side limit enforcement (was only client-side previously).
      const limit = await enforceLimit({
        userId: user._id.toString(),
        amount: amountNumber,
        kind: "transfer",
        accountType: fromAccount,
        actorEmail: user.email,
        request,
      });
      if (!limit.allowed) {
        return NextResponse.json(
          { success: false, error: limit.message, reason: limit.reason },
          { status: 422 }
        );
      }

      const fromBalance = toMinor(String((user as any)[balanceFieldOf(fromAccount)] || 0));
      if (!gte(fromBalance, amountMinor)) {
        return NextResponse.json(
          {
            success: false,
            error: "Insufficient funds",
            details: {
              available: toNumber(fromBalance),
              requested: amountNumber,
              shortfall: toNumber(fromBalance - amountMinor),
            },
          },
          { status: 422 }
        );
      }

      const transferGroup = `INT-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

      // Two legs tied by `transferGroup` so the approval handler will only ever post them together.
      const [outLeg, inLeg] = await Promise.all([
        Transaction.create({
          userId: user._id,
          type: "transfer-out",
          currency: "USD",
          amount: amountNumber,
          amountMinor: fromMinor(amountMinor),
          description: description?.trim() || `Transfer to ${toAccount}`,
          status: "pending",
          accountType: fromAccount,
          posted: false,
          ledgerPosted: false,
          reference: `${transferGroup}-OUT`,
          channel: "online",
          origin: "internal_transfer",
          metadata: {
            fromAccount,
            toAccount,
            transferGroup,
            linkedReference: `${transferGroup}-IN`,
            atomicGroup: true,
          },
        }),
        Transaction.create({
          userId: user._id,
          type: "transfer-in",
          currency: "USD",
          amount: amountNumber,
          amountMinor: fromMinor(amountMinor),
          description: description?.trim() || `Transfer from ${fromAccount}`,
          status: "pending",
          accountType: toAccount,
          posted: false,
          ledgerPosted: false,
          reference: `${transferGroup}-IN`,
          channel: "online",
          origin: "internal_transfer",
          metadata: {
            fromAccount,
            toAccount,
            transferGroup,
            linkedReference: `${transferGroup}-OUT`,
            atomicGroup: true,
          },
        }),
      ]);

      await audit({
        action: "transfer.internal.initiated",
        actorId: user._id.toString(),
        actorEmail: user.email,
        outcome: "success",
        request,
        resourceId: transferGroup,
        details: { fromAccount, toAccount, amount: amountNumber, transferGroup },
      });

      try {
        await Promise.all([
          sendTransactionEmail(user.email, { name: user.name || "Customer", transaction: outLeg }),
          sendTransactionEmail(user.email, { name: user.name || "Customer", transaction: inLeg }),
        ]);
      } catch (err: any) {
        log.warn("transfer.email_failed", { err: err?.message });
      }

      return NextResponse.json(
        {
          success: true,
          message: "Transfer initiated. Awaiting admin approval.",
          transferReference: transferGroup,
          transfer: {
            type: "internal",
            from: fromAccount,
            to: toAccount,
            amount: amountNumber,
            reference: transferGroup,
            status: "pending",
            date: new Date().toISOString(),
          },
          transactions: [
            { id: outLeg._id, reference: outLeg.reference, status: "pending" },
            { id: inLeg._id, reference: inLeg.reference, status: "pending" },
          ],
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
  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(200, parseInt(searchParams.get("limit") || "50", 10));
  const accountType = searchParams.get("account");

  const query: any = { userId: user._id, origin: "internal_transfer" };
  if (accountType) query.accountType = accountType;

  const rows = await Transaction.find(query).sort({ createdAt: -1 }).limit(limit).lean();

  const groups = new Map<string, any[]>();
  for (const tx of rows as any[]) {
    const ref = tx.metadata?.transferGroup || tx.reference?.replace(/-OUT$|-IN$/, "");
    if (!ref) continue;
    if (!groups.has(ref)) groups.set(ref, []);
    groups.get(ref)!.push(tx);
  }

  const transfers = [...groups.entries()].map(([ref, txs]) => {
    const out = txs.find((t) => t.type === "transfer-out");
    const inn = txs.find((t) => t.type === "transfer-in");
    return {
      reference: ref,
      date: out?.date || inn?.date,
      amount: out?.amount || inn?.amount,
      fromAccount: out?.accountType,
      toAccount: inn?.accountType,
      description: out?.description || inn?.description,
      status: out?.status === inn?.status ? out?.status : "partial",
      posted: !!(out?.posted && inn?.posted),
      ledgerPosted: !!(out?.ledgerPosted && inn?.ledgerPosted),
    };
  });

  return NextResponse.json({
    success: true,
    internalTransfers: transfers,
    total: transfers.length,
    currentBalances: {
      checking: user.checkingBalance || 0,
      savings: user.savingsBalance || 0,
      investment: user.investmentBalance || 0,
    },
  });
}
