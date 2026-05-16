// Admin approval of a pending transaction.
// Hardening over the previous implementation:
//   - Wrapped in a Mongo session.withTransaction so balance + ledger + tx status either
//     all commit or all roll back. No more "balance updated, status save failed" half-states.
//   - Posts double-entry ledger rows via lib/ledger; user balance is now derived from those rows.
//   - For internal transfer pairs, BOTH legs are posted in the same transaction so a transfer
//     can never be half-approved.
//   - For wire transfers, the linked FEE transaction is posted in the same atomic block.
//   - Every action audit-logged with actor + IP + request id.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction, { isCreditType } from "@/models/Transaction";
import type { TxType, AccountType } from "@/models/Transaction";
import { sendTransactionEmail } from "@/lib/mail";
import { postEntries } from "@/lib/ledger";
import { audit } from "@/lib/audit";
import { recordLimitUsage } from "@/lib/limits";
import { toMinor, fromMinor } from "@/lib/decimal";
import type { MinorUnits } from "@/lib/decimal";
import type { LedgerAccount } from "@/models/LedgerEntry";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "admin/transactions/approve" });

function userAccountFor(a: AccountType): LedgerAccount {
  if (a === "savings") return "user.savings";
  if (a === "investment") return "user.investment";
  return "user.checking";
}

// For a given transaction, return the ledger legs that should be posted.
// The "user side" is always one of user.checking/savings/investment.
// The opposite side depends on origin: external wires hit bank.wire_clearing,
// internal transfers' fees and interest hit bank.fees_income / bank.interest_expense,
// generic deposits/withdrawals hit bank.cash.
function legsFor(tx: any, amount: MinorUnits) {
  const userAccount = userAccountFor(tx.accountType);
  const userSide: "debit" | "credit" = isCreditType(tx.type as TxType) ? "credit" : "debit";
  const otherSide: "debit" | "credit" = userSide === "credit" ? "debit" : "credit";

  let otherAccount: LedgerAccount;
  switch (tx.type as TxType) {
    case "fee":
      otherAccount = "bank.fees_income";
      break;
    case "interest":
      otherAccount = "bank.interest_expense";
      break;
    case "transfer-out":
    case "transfer-in":
      otherAccount = tx.origin === "wire_transfer" ? "bank.wire_clearing" : "bank.suspense";
      break;
    case "adjustment-credit":
    case "adjustment-debit":
      otherAccount = "bank.suspense";
      break;
    case "deposit":
    case "withdraw":
    default:
      otherAccount = "bank.cash";
  }

  return [
    {
      account: userAccount,
      side: userSide,
      amountMinor: amount,
      userId: tx.userId.toString(),
      description: tx.description,
    },
    {
      account: otherAccount,
      side: otherSide,
      amountMinor: amount,
      userId: null,
      description: `Contra: ${tx.description || tx.type}`,
    },
  ];
}

// Find every transaction that must be posted alongside this one as a single atomic unit.
async function findAtomicGroup(tx: any, session: mongoose.ClientSession): Promise<any[]> {
  const group: any[] = [tx];

  // 1. Internal transfers: both legs of the pair.
  if (tx.origin === "internal_transfer" && tx.metadata?.transferGroup) {
    const others = await Transaction.find({
      "metadata.transferGroup": tx.metadata.transferGroup,
      _id: { $ne: tx._id },
    }).session(session);
    group.push(...others);
  } else if (tx.metadata?.linkedReference) {
    // Legacy internal transfer pairs that pre-date the transferGroup field.
    const linked = await Transaction.findOne({
      reference: tx.metadata.linkedReference,
    }).session(session);
    if (linked) group.push(linked);
  }

  // 2. Wire fee transaction is approved alongside the main wire.
  if (tx.origin === "wire_transfer" && tx.type !== "fee") {
    const fee = await Transaction.findOne({
      reference: `${tx.reference}-FEE`,
    }).session(session);
    if (fee) group.push(fee);
  } else if (tx.origin === "wire_transfer" && tx.type === "fee" && tx.metadata?.linkedReference) {
    const main = await Transaction.findOne({
      reference: tx.metadata.linkedReference,
    }).session(session);
    if (main) group.push(main);
  }

  // Dedup by id.
  const seen = new Set<string>();
  return group.filter((t) => {
    const id = t._id.toString();
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !["admin", "superadmin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const sendNotification = body.sendNotification !== false;
  const customMessage = typeof body.customMessage === "string" ? body.customMessage : undefined;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid transaction ID" }, { status: 400 });
  }

  await connectDB();
  // Replica-set/Atlas connections support multi-document transactions; standalone Mongo doesn't.
  // We probe by attempting to start a session — if it throws we fall back to sequential writes.
  const conn = mongoose.connection;
  let supportsTxn = false;
  try {
    const probe = await conn.startSession();
    await probe.endSession();
    supportsTxn = true;
  } catch {
    supportsTxn = false;
  }

  const tx = await Transaction.findById(id);
  if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

  if (tx.status === "approved" || tx.status === "completed" || (tx as any).ledgerPosted) {
    return NextResponse.json(
      {
        error: "Transaction already approved",
        transaction: { _id: tx._id, reference: tx.reference, status: tx.status },
      },
      { status: 409 }
    );
  }

  const dbSession = supportsTxn ? await conn.startSession() : null;

  try {
    const run = async (s: mongoose.ClientSession | null) => {
      const group = await findAtomicGroup(tx, s as mongoose.ClientSession);

      // Pre-flight: every transaction in the group must still be pending and the user
      // must have enough balance on each "out" leg.
      for (const t of group) {
        if (t.status !== "pending" && t.status !== "pending_verification") {
          throw Object.assign(new Error(`Group member ${t.reference} is not pending`), {
            statusCode: 409,
          });
        }
      }

      const userId = tx.userId.toString();
      const user = await User.findById(userId).session(s);
      if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404 });

      // Aggregate net deltas per balance field across the group to check sufficiency.
      const fieldOf = (a: AccountType) =>
        a === "savings" ? "savingsBalance" : a === "investment" ? "investmentBalance" : "checkingBalance";
      const deltas = new Map<string, MinorUnits>();
      for (const t of group) {
        const amt = t.amountMinor ? toMinor(t.amountMinor) : toMinor(String(t.amount));
        const field = fieldOf(t.accountType);
        const sign = isCreditType(t.type as TxType) ? amt : -amt;
        deltas.set(field, (deltas.get(field) || 0n) + sign);
      }
      for (const [field, delta] of deltas) {
        if (delta < 0n) {
          const current = toMinor(String((user as any)[field] || 0));
          if (current + delta < 0n) {
            throw Object.assign(
              new Error(`Insufficient funds on ${field} (need ${fromMinor(-delta)}, have ${fromMinor(current)})`),
              { statusCode: 422 }
            );
          }
        }
      }

      const reviewerId = session.user.id || "admin";
      const reviewerEmail = session.user.email || "admin";

      for (const t of group) {
        const amt = t.amountMinor ? toMinor(t.amountMinor) : toMinor(String(t.amount));
        await postEntries(
          {
            transactionId: t._id.toString(),
            reference: t.reference || `TX-${t._id}`,
            currency: t.currency || "USD",
            legs: legsFor(t, amt),
          },
          s as mongoose.ClientSession
        );

        t.status = "approved" as any;
        t.posted = true;
        (t as any).ledgerPosted = true;
        t.postedAt = new Date();
        t.approvedAt = new Date();
        t.approvedBy = reviewerEmail;
        t.reviewedBy = reviewerId as any;
        t.reviewedAt = new Date();
        if (customMessage && t._id.toString() === id) {
          t.adminNotes = customMessage;
        }
        await t.save({ session: s });
      }
    };

    if (dbSession) {
      await dbSession.withTransaction(async () => {
        await run(dbSession);
      });
    } else {
      log.warn("approve.no_txn_support", { id });
      await run(null);
    }
  } catch (err: any) {
    const status = err?.statusCode || 500;
    await audit({
      action: "transaction.approved",
      actorId: session.user.id || null,
      actorEmail: session.user.email || undefined,
      actorRole: session.user.role,
      outcome: "failure",
      severity: status >= 500 ? "critical" : "warning",
      request,
      resourceId: tx.reference,
      details: { transactionId: id, error: err?.message },
    });
    log.error("approve.failed", { id, err: err?.message });
    return NextResponse.json({ error: err?.message || "Approval failed" }, { status });
  } finally {
    if (dbSession) await dbSession.endSession();
  }

  // Refresh balance + record limit usage + audit + email outside the txn.
  const fresh = await User.findById(tx.userId).lean();
  const balanceField =
    tx.accountType === "savings"
      ? "savingsBalance"
      : tx.accountType === "investment"
        ? "investmentBalance"
        : "checkingBalance";
  const verifiedBalance = Number((fresh as any)?.[balanceField] || 0);

  if (tx.origin === "internal_transfer" || tx.origin === "wire_transfer") {
    try {
      await recordLimitUsage({
        userId: tx.userId.toString(),
        amount: Number(tx.amount) || 0,
        kind: "transfer",
      });
    } catch (err: any) {
      log.warn("approve.record_limit_failed", { err: err?.message });
    }
  }

  await audit({
    action: "transaction.approved",
    actorId: session.user.id || null,
    actorEmail: session.user.email || undefined,
    actorRole: session.user.role,
    targetUserId: tx.userId.toString(),
    outcome: "success",
    request,
    resourceId: tx.reference,
    details: {
      transactionId: id,
      type: tx.type,
      amount: tx.amount,
      accountType: tx.accountType,
      newBalance: verifiedBalance,
    },
  });

  if (sendNotification && fresh) {
    try {
      await sendTransactionEmail((fresh as any).email, {
        name: (fresh as any).name || "Valued Client",
        transaction: {
          _id: tx._id,
          reference: tx.reference,
          type: tx.type,
          amount: tx.amount,
          currency: tx.currency || "USD",
          status: "approved",
          description: tx.description,
          accountType: tx.accountType,
          date: tx.date,
        },
      });
    } catch (err: any) {
      log.warn("approve.email_failed", { err: err?.message });
    }
  }

  return NextResponse.json({
    success: true,
    message: "Transaction approved successfully",
    transaction: {
      _id: tx._id,
      reference: tx.reference,
      type: tx.type,
      amount: tx.amount,
      status: "approved",
      accountType: tx.accountType,
      posted: true,
      ledgerPosted: true,
    },
    balance: {
      field: balanceField,
      current: verifiedBalance,
    },
  });
}
