// src/lib/posting.ts
// Applies an approved Transaction exactly once to User rollups
// and appends to embedded user.transactions with the required shape.

import User from "@/models/User";
import Transaction from "@/models/Transaction";

type Currency = "USD" | "BTC";
type AccountType = "checking" | "savings" | "investment";
type TxType = "deposit" | "send" | "transfer_usd" | "transfer_btc";

// Map Transaction.type → User.embedded type
function mapToEmbeddedType(t: TxType): "deposit" | "withdrawal" | "transfer" | "debit" | "credit" {
  switch (t) {
    case "deposit": return "deposit";
    case "send": return "withdrawal";
    case "transfer_usd":
    case "transfer_btc": return "transfer";
    default: return "deposit";
  }
}

function toNum(v: any) {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

// Signed USD delta for rollup balances the dashboard reads
function deltaUSD(type: TxType, currency: Currency, amount: number) {
  if (currency !== "USD") return 0;
  switch (type) {
    case "deposit": return amount;
    case "send": return -amount;
    case "transfer_usd": return -amount;
    default: return 0;
  }
}

export async function postTransactionOnce(txId: string, reviewerId?: string) {
  const tx: any = await Transaction.findById(txId);
  if (!tx) throw new Error("Transaction not found");
  if (tx.posted) return { alreadyPosted: true };

  const user: any = await User.findById(tx.userId);
  if (!user) throw new Error("User not found for transaction");

  const acct: AccountType = (tx.accountType as AccountType) || "checking";
  const dUSD = deltaUSD(tx.type, tx.currency, toNum(tx.amount));

  // Ensure numeric rollups exist
  if (typeof user.balance !== "number") user.balance = 0;
  if (typeof user.savingsBalance !== "number") user.savingsBalance = 0;
  if (typeof user.investmentBalance !== "number") user.investmentBalance = 0;

  // Read before/compute after (USD only, which is what your dashboard uses)
  const before =
    acct === "savings" ? user.savingsBalance :
    acct === "investment" ? user.investmentBalance :
    user.balance;

  const after = before + dUSD;

  if (acct === "savings")      user.savingsBalance    = after;
  else if (acct === "investment") user.investmentBalance = after;
  else                           user.balance          = after;

  // Append to embedded user.transactions in your exact schema
  user.transactions = Array.isArray(user.transactions) ? user.transactions : [];

  const exists = user.transactions.some((t: any) => String(t._id || t.id) === String(tx._id));
  if (!exists) {
    user.transactions.push({
      _id: tx._id,                                        // helps de-dupe
      type: mapToEmbeddedType(tx.type),                   // 'deposit' | 'withdrawal' | 'transfer' | ...
      amount: toNum(tx.amount),
      description: tx.description || "",
      date: tx.date || tx.createdAt,
      balanceAfter: after,                                // ✅ required by your schema
      relatedUser: null,
    });
  } else {
    const ref = user.transactions.find((t: any) => String(t._id || t.id) === String(tx._id));
    if (ref && ref.balanceAfter === undefined) ref.balanceAfter = after;
  }

  await user.save();

  // Mark as posted so it can't double-apply
  tx.posted = true;
  tx.postedAt = new Date();
  tx.reviewedAt = tx.reviewedAt || new Date();
  if (reviewerId) tx.reviewedBy = reviewerId as any;
  await tx.save();

  return { posted: true, after, accountType: acct };
}
