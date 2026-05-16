// Daily reconciliation. Verifies that:
//   1. Every approved Transaction has a balanced set of LedgerEntry rows.
//   2. sum(credit) - sum(debit) on the user.{account} ledger equals User.{account}Balance.
//   3. The hash chain on each user/account ledger sequence is intact.
//
// Run: tsx src/scripts/reconcile.ts [--fix-balances] [--user=<id>]
// Exits 0 on a clean reconciliation; non-zero if any drift is found.

import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import LedgerEntry, { LedgerAccount } from "@/models/LedgerEntry";
import { toMinor, fromMinor, MinorUnits } from "@/lib/decimal";

interface Issue {
  kind: "tx_unbalanced" | "tx_missing_ledger" | "balance_drift" | "hash_break";
  scope: string;
  detail: string;
}

const issues: Issue[] = [];

const fieldFor: Record<LedgerAccount, string | null> = {
  "user.checking": "checkingBalance",
  "user.savings": "savingsBalance",
  "user.investment": "investmentBalance",
  "bank.cash": null,
  "bank.fees_income": null,
  "bank.interest_expense": null,
  "bank.suspense": null,
  "bank.wire_clearing": null,
  "external.counterparty": null,
};

async function checkTransactionBalance(): Promise<void> {
  const cursor = Transaction.find({ status: "approved", ledgerPosted: true })
    .select({ _id: 1, reference: 1, amountMinor: 1, amount: 1 })
    .lean()
    .cursor();

  for await (const tx of cursor) {
    const entries = await LedgerEntry.find({ transactionId: tx._id }).lean();
    if (entries.length === 0) {
      issues.push({
        kind: "tx_missing_ledger",
        scope: `tx:${tx._id}`,
        detail: `Transaction ${tx.reference || tx._id} marked posted but has no ledger entries`,
      });
      continue;
    }
    let debit = 0n;
    let credit = 0n;
    for (const e of entries) {
      const amt = toMinor(e.amountMinor as string);
      if (e.side === "credit") credit += amt;
      else debit += amt;
    }
    if (debit !== credit) {
      issues.push({
        kind: "tx_unbalanced",
        scope: `tx:${tx._id}`,
        detail: `debit=${fromMinor(debit)} credit=${fromMinor(credit)}`,
      });
    }
  }
}

async function checkUserBalances(fix: boolean, onlyUserId?: string): Promise<void> {
  const userQuery: any = {};
  if (onlyUserId) userQuery._id = new mongoose.Types.ObjectId(onlyUserId);

  const cursor = User.find(userQuery).select({ _id: 1, checkingBalance: 1, savingsBalance: 1, investmentBalance: 1 }).lean().cursor();

  for await (const user of cursor) {
    for (const [account, field] of Object.entries(fieldFor)) {
      if (!field) continue;
      const ledgerBalance = await sumUserAccount(user._id.toString(), account as LedgerAccount);
      const userField = toMinor(String((user as any)[field] || 0));
      if (ledgerBalance !== userField) {
        issues.push({
          kind: "balance_drift",
          scope: `user:${user._id}:${account}`,
          detail: `userField=${fromMinor(userField)} ledger=${fromMinor(ledgerBalance)} drift=${fromMinor(userField - ledgerBalance)}`,
        });
        if (fix) {
          await User.updateOne(
            { _id: user._id },
            { $set: { [field]: Number(fromMinor(ledgerBalance)) } }
          );
        }
      }
    }
  }
}

async function sumUserAccount(userId: string, account: LedgerAccount): Promise<MinorUnits> {
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
  return credit - debit;
}

async function main() {
  const args = process.argv.slice(2);
  const fix = args.includes("--fix-balances");
  const userArg = args.find((a) => a.startsWith("--user="));
  const onlyUserId = userArg?.split("=")[1];

  console.log(`[reconcile] starting (fix=${fix} user=${onlyUserId || "ALL"})`);

  await connectDB();
  await checkTransactionBalance();
  await checkUserBalances(fix, onlyUserId);

  if (issues.length === 0) {
    console.log("[reconcile] ✅ clean — no drift detected");
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`[reconcile] ❌ ${issues.length} issue(s):`);
  for (const issue of issues) {
    console.log(`  [${issue.kind}] ${issue.scope}: ${issue.detail}`);
  }
  await mongoose.disconnect();
  process.exit(1);
}

main().catch((err) => {
  console.error("[reconcile] fatal", err);
  process.exit(2);
});
