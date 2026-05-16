// Server-side transaction limit enforcement. The /api/limits/check route is a UX preview;
// it is NOT a security boundary. Every money-moving handler MUST call enforceLimit before posting.

import connectDB from "@/lib/mongodb";
import TransactionLimit from "@/models/TransactionLimit";
import { audit } from "@/lib/audit";
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
        | "exceeds_daily_transfer_limit"
        | "exceeds_daily_withdrawal_limit"
        | "exceeds_account_daily_limit";
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

  if (!isSameDay(new Date(limits.lastResetDate))) {
    limits.todayTransferred = 0;
    limits.todayWithdrawn = 0;
    limits.lastResetDate = new Date();
    await limits.save();
  }

  if (!limits.limitsEnabled) {
    return { allowed: true, remainingToday: Number.MAX_SAFE_INTEGER, perTxLimit: Number.MAX_SAFE_INTEGER };
  }

  if (opts.amount > limits.maxTransactionAmount) {
    const result: EnforceLimitResult = {
      allowed: false,
      reason: "exceeds_transaction_limit",
      message: `Transaction exceeds per-transaction limit of $${limits.maxTransactionAmount.toLocaleString()}`,
      limit: limits.maxTransactionAmount,
    };
    await audit({
      action: "limits.exceeded",
      actorId: opts.userId,
      actorEmail: opts.actorEmail,
      outcome: "blocked",
      severity: "warning",
      request: opts.request,
      details: { kind: opts.kind, amount: opts.amount, reason: result.reason },
    });
    return result;
  }

  if (opts.kind === "withdrawal") {
    const proposed = limits.todayWithdrawn + opts.amount;
    if (proposed > limits.dailyWithdrawalLimit) {
      const result: EnforceLimitResult = {
        allowed: false,
        reason: "exceeds_daily_withdrawal_limit",
        message: `Would exceed daily withdrawal limit of $${limits.dailyWithdrawalLimit.toLocaleString()}`,
        limit: limits.dailyWithdrawalLimit,
        used: limits.todayWithdrawn,
        remaining: Math.max(0, limits.dailyWithdrawalLimit - limits.todayWithdrawn),
      };
      await audit({
        action: "limits.exceeded",
        actorId: opts.userId,
        actorEmail: opts.actorEmail,
        outcome: "blocked",
        severity: "warning",
        request: opts.request,
        details: { kind: opts.kind, amount: opts.amount, reason: result.reason },
      });
      return result;
    }
  } else {
    const proposed = limits.todayTransferred + opts.amount;
    if (proposed > limits.dailyTransferLimit) {
      const result: EnforceLimitResult = {
        allowed: false,
        reason: "exceeds_daily_transfer_limit",
        message: `Would exceed daily transfer limit of $${limits.dailyTransferLimit.toLocaleString()}`,
        limit: limits.dailyTransferLimit,
        used: limits.todayTransferred,
        remaining: Math.max(0, limits.dailyTransferLimit - limits.todayTransferred),
      };
      await audit({
        action: "limits.exceeded",
        actorId: opts.userId,
        actorEmail: opts.actorEmail,
        outcome: "blocked",
        severity: "warning",
        request: opts.request,
        details: { kind: opts.kind, amount: opts.amount, reason: result.reason },
      });
      return result;
    }

    if (opts.accountType === "checking" && limits.todayTransferred + opts.amount > limits.checkingDailyLimit) {
      const result: EnforceLimitResult = {
        allowed: false,
        reason: "exceeds_account_daily_limit",
        message: `Would exceed checking account daily limit of $${limits.checkingDailyLimit.toLocaleString()}`,
        limit: limits.checkingDailyLimit,
        used: limits.todayTransferred,
        remaining: Math.max(0, limits.checkingDailyLimit - limits.todayTransferred),
      };
      await audit({
        action: "limits.exceeded",
        actorId: opts.userId,
        actorEmail: opts.actorEmail,
        outcome: "blocked",
        severity: "warning",
        request: opts.request,
        details: { kind: opts.kind, amount: opts.amount, reason: result.reason },
      });
      return result;
    }
    if (opts.accountType === "savings" && limits.todayTransferred + opts.amount > limits.savingsDailyLimit) {
      const result: EnforceLimitResult = {
        allowed: false,
        reason: "exceeds_account_daily_limit",
        message: `Would exceed savings account daily limit of $${limits.savingsDailyLimit.toLocaleString()}`,
        limit: limits.savingsDailyLimit,
        used: limits.todayTransferred,
        remaining: Math.max(0, limits.savingsDailyLimit - limits.todayTransferred),
      };
      await audit({
        action: "limits.exceeded",
        actorId: opts.userId,
        actorEmail: opts.actorEmail,
        outcome: "blocked",
        severity: "warning",
        request: opts.request,
        details: { kind: opts.kind, amount: opts.amount, reason: result.reason },
      });
      return result;
    }
  }

  return {
    allowed: true,
    remainingToday:
      opts.kind === "withdrawal"
        ? Math.max(0, limits.dailyWithdrawalLimit - limits.todayWithdrawn)
        : Math.max(0, limits.dailyTransferLimit - limits.todayTransferred),
    perTxLimit: limits.maxTransactionAmount,
  };
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
