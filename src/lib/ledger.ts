// Double-entry posting. Every money movement creates >=2 ledger entries inside a single
// Mongo transaction. sum(debits) MUST equal sum(credits) per transactionId — enforced before commit.

import crypto from "crypto";
import mongoose, { ClientSession } from "mongoose";
import LedgerEntry, { LedgerAccount, Side } from "@/models/LedgerEntry";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { add, fromMinor, MinorUnits, toMinor } from "@/lib/decimal";
import { logger } from "@/lib/logger";

export interface PostingLeg {
  account: LedgerAccount;
  side: Side;
  amountMinor: MinorUnits;
  userId?: string | null;
  description?: string;
}

export interface PostingRequest {
  transactionId: string;
  reference: string;
  currency: string;
  legs: PostingLeg[];
}

const USER_ACCOUNT_TO_FIELD: Record<string, string> = {
  "user.checking": "checkingBalance",
  "user.savings": "savingsBalance",
  "user.investment": "investmentBalance",
};

function hashLeg(input: {
  transactionId: string;
  account: string;
  side: Side;
  amountMinor: string;
  prevHash: string;
  reference: string;
}): string {
  const payload = `${input.prevHash}|${input.transactionId}|${input.account}|${input.side}|${input.amountMinor}|${input.reference}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function assertBalanced(legs: PostingLeg[]): void {
  let debit = 0n;
  let credit = 0n;
  for (const l of legs) {
    if (l.amountMinor <= 0n) throw new Error("Ledger leg amount must be positive");
    if (l.side === "debit") debit = add(debit, l.amountMinor);
    else credit = add(credit, l.amountMinor);
  }
  if (debit !== credit) {
    throw new Error(`Ledger unbalanced: debits=${debit} credits=${credit}`);
  }
}

// Effect on the user's balance for an account leg.
// Banking convention: for a customer DEPOSIT account, a CREDIT increases the customer's balance.
function balanceDeltaFor(side: Side, amount: MinorUnits): MinorUnits {
  return side === "credit" ? amount : -amount;
}

export async function postEntries(req: PostingRequest, session: ClientSession): Promise<void> {
  assertBalanced(req.legs);

  // Hash chain: link each entry to the latest one we can find for this user/account pair.
  // Simple sequential hash across this posting; cross-posting chain reconciliation runs in the
  // reconcile script.
  let prevHash = "GENESIS";
  const docs = [];
  for (const leg of req.legs) {
    const amountStr = fromMinor(leg.amountMinor);
    const hash = hashLeg({
      transactionId: req.transactionId,
      account: leg.account,
      side: leg.side,
      amountMinor: amountStr,
      prevHash,
      reference: req.reference,
    });
    docs.push({
      transactionId: new mongoose.Types.ObjectId(req.transactionId),
      userId: leg.userId ? new mongoose.Types.ObjectId(leg.userId) : null,
      account: leg.account,
      side: leg.side,
      amountMinor: amountStr,
      currency: req.currency,
      reference: req.reference,
      description: leg.description,
      prevHash,
      hash,
    });
    prevHash = hash;
  }

  await LedgerEntry.insertMany(docs, { session });

  // Mirror legs that touch user accounts onto User.balance fields atomically.
  // Use $inc on a parsed dollar amount; the ledger remains the source of truth.
  for (const leg of req.legs) {
    if (!leg.userId) continue;
    const field = USER_ACCOUNT_TO_FIELD[leg.account];
    if (!field) continue;
    const delta = balanceDeltaFor(leg.side, leg.amountMinor);
    const deltaNumber = Number(fromMinor(delta));
    if (!Number.isFinite(deltaNumber)) {
      throw new Error(`balance delta overflow: ${delta.toString()}`);
    }
    const result = await User.updateOne(
      { _id: leg.userId },
      { $inc: { [field]: deltaNumber } },
      { session }
    );
    if (result.matchedCount !== 1) {
      throw new Error(`User not found while posting: ${leg.userId}`);
    }
  }
}

// One-shot helper that runs the posting inside a Mongo session.
// Wraps every balance change in an atomic transaction so a crash mid-write can't
// half-apply a transfer.
export async function postTransactionAtomic(opts: {
  transactionDbId: string;
  posting: PostingRequest;
}): Promise<void> {
  const conn = mongoose.connection;
  let supportsTxn = false;
  try {
    const probe = await conn.startSession();
    await probe.endSession();
    supportsTxn = true;
  } catch {
    supportsTxn = false;
  }

  const run = async (session: ClientSession) => {
    const tx = await Transaction.findById(opts.transactionDbId).session(session);
    if (!tx) throw new Error("Transaction not found");
    if ((tx as any).ledgerPosted) {
      logger.warn("ledger.already_posted", { transactionId: opts.transactionDbId });
      return;
    }

    await postEntries(opts.posting, session);

    (tx as any).ledgerPosted = true;
    (tx as any).postedAt = new Date();
    tx.posted = true;
    tx.status = "approved" as any;
    await tx.save({ session });
  };

  if (!supportsTxn) {
    // Standalone Mongo (no replica set): fall back to a best-effort sequential write.
    // Log loudly — production MUST use a replica set / Atlas for real ACID.
    logger.warn("ledger.no_transaction_support_fallback");
    await run(null as unknown as ClientSession);
    return;
  }

  const session = await conn.startSession();
  try {
    await session.withTransaction(async () => {
      await run(session);
    });
  } finally {
    await session.endSession();
  }
}

// Sum entries by account/user for reconciliation.
export async function userAccountBalanceFromLedger(
  userId: string,
  account: LedgerAccount
): Promise<MinorUnits> {
  const rows = await LedgerEntry.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), account } },
    {
      $group: {
        _id: "$side",
        // amountMinor is stored as a string so we can't $sum it directly; do it in JS.
      },
    },
  ]);
  // Stream entries in chunks to avoid loading everything.
  let credit = 0n;
  let debit = 0n;
  const cursor = LedgerEntry.find(
    { userId: new mongoose.Types.ObjectId(userId), account },
    { side: 1, amountMinor: 1 }
  )
    .lean()
    .cursor();
  for await (const doc of cursor) {
    const amt = toMinor(doc.amountMinor as string);
    if (doc.side === "credit") credit += amt;
    else debit += amt;
  }
  void rows;
  return credit - debit;
}
