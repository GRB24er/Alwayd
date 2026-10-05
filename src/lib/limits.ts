// Server-side transaction limit bookkeeping. Transfers and withdrawals are not capped;
// enforceLimit always allows the transaction and only keeps the daily usage counters current.

import connectDB from "@/lib/mongodb";
import TransactionLimit, { STANDARD_LIMITS } from "@/models/TransactionLimit";
import { NextRequest } from "next/server";

export type LimitKind = "transfer" | "withdrawal";

export interface EnforceLimitOpts {
  userId: string;
  amount: number;
  kind: LimitKind;
  accountType?: "checking" | "savings" | "investment";
  actorEmail?: string;
  request?: NextRequest;
}

export type EnforceLimitResult =
  | { allowed: true; remainingToday: number; perTxLimit: number }
  | {
      allowed: false;
      reason:
        | "exceeds_transaction_limit"
        | "exceeds_daily_withdrawal_limit";
      message: string;
      limit: number;
      used?: number;
      remaining?: number;
    };

function isSameDay(d: Date): boolean {
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

export async function enforceLimit(opts: EnforceLimitOpts): Promise<EnforceLimitResult> {
  await connectDB();

  let limits = await TransactionLimit.findOne({ userId: opts.userId });
  if (!limits) {
    limits = await TransactionLimit.create({ userId: opts.userId });
  }

  // Docs created under older, lower defaults track the current standard
  // limits unless an admin has explicitly customized them.
  if (!limits.customLimits) {
    const drifted =
      limits.dailyTransferLimit !== STANDARD_LIMITS.dailyTransferLimit ||
      limits.dailyWithdrawalLimit !== STANDARD_LIMITS.dailyWithdrawalLimit ||
      limits.maxTransactionAmount !== STANDARD_LIMITS.maxTransactionAmount ||
      limits.checkingDailyLimit !== STANDARD_LIMITS.checkingDailyLimit ||
      limits.savingsDailyLimit !== STANDARD_LIMITS.savingsDailyLimit;
    if (drifted) {
      limits.set({ ...STANDARD_LIMITS });
      await limits.save();
    }
  }

  if (!isSameDay(new Date(limits.lastResetDate))) {
    limits.todayTransferred = 0;
    limits.todayWithdrawn = 0;
    limits.lastResetDate = new Date();
    await limits.save();
  }

  // Transfers and withdrawals are not capped.
  return { allowed: true, remainingToday: Number.MAX_SAFE_INTEGER, perTxLimit: Number.MAX_SAFE_INTEGER };
}

// Call after a successful posting to count the consumed amount toward today's bucket.
export async function recordLimitUsage(opts: {
  userId: string;
  amount: number;
  kind: LimitKind;
}): Promise<void> {
  await connectDB();
  const update =
    opts.kind === "withdrawal"
      ? { $inc: { todayWithdrawn: opts.amount } }
      : { $inc: { todayTransferred: opts.amount } };
  await TransactionLimit.updateOne({ userId: opts.userId }, update, { upsert: true });
}
