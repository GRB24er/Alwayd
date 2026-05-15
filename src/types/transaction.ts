// src/models/Transaction.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export type TxStatus =
  | "pending"
  | "approved"                 // admin uses this; UI shows “Completed”
  | "rejected"
  | "completed"                // legacy alias; treated as cleared
  | "pending_verification";

export type TxType =
  | "deposit"
  | "withdraw"
  | "transfer-in"
  | "transfer-out"
  | "fee"
  | "interest"
  | "adjustment-credit"
  | "adjustment-debit";

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  reference?: string;
  type: TxType;
  currency: string;
  amount: number; // positive; sign implied by type
  description?: string;
  status: TxStatus;
  date: Date;
  accountType: "checking" | "savings" | "investment";
  posted: boolean;
  postedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  channel?: string;
  origin?: string;
  editedDateByAdmin?: boolean;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reference: { type: String, index: true },
    type: {
      type: String,
      enum: [
        "deposit",
        "withdraw",
        "transfer-in",
        "transfer-out",
        "fee",
        "interest",
        "adjustment-credit",
        "adjustment-debit",
      ],
      required: true,
      index: true,
    },
    currency: { type: String, default: "USD" },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed", "pending_verification"],
      default: "pending",
      index: true,
    },
    date: { type: Date, default: () => new Date(), index: true },
    accountType: {
      type: String,
      enum: ["checking", "savings", "investment"],
      default: "checking",
      index: true,
    },
    posted: { type: Boolean, default: false, index: true },
    postedAt: { type: Date, default: null },
    channel: { type: String },
    origin: { type: String },
    editedDateByAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ---- helpers (no User import) ----
function isCredit(t: TxType) {
  return t === "deposit" || t === "transfer-in" || t === "interest" || t === "adjustment-credit";
}
function isDebit(t: TxType) {
  return t === "withdraw" || t === "transfer-out" || t === "fee" || t === "adjustment-debit";
}
function isCleared(s: TxStatus) {
  return s === "approved" || s === "completed";
}
function balanceKey(acct: ITransaction["accountType"]) {
  return acct === "savings"
    ? "savingsBalance"
    : acct === "investment"
    ? "investmentBalance"
    : "checkingBalance";
}

const USERS_COLLECTION = "users"; // adjust if your collection name differs

async function applyBalanceEffectOnce(doc: ITransaction) {
  if (doc.posted || !isCleared(doc.status)) return;

  const key = balanceKey(doc.accountType);
  const delta = isCredit(doc.type) ? doc.amount : isDebit(doc.type) ? -doc.amount : 0;

  if (delta !== 0) {
    const col = mongoose.connection.collection(USERS_COLLECTION);
    await col.updateOne(
      { _id: new mongoose.Types.ObjectId(doc.userId) },
      { $inc: { [key]: delta } }
    );
  }
  doc.posted = true;
  doc.postedAt = new Date();
}

// Post-save hook
TransactionSchema.post("save", async function (doc) {
  try {
    await applyBalanceEffectOnce(doc as ITransaction);
  } catch (e) {
    console.error("Transaction post-save apply failed:", e);
  }
});

// Post findOneAndUpdate hook (e.g., admin approve/reject)
TransactionSchema.post("findOneAndUpdate", async function (res) {
  try {
    if (!res) return;
    await applyBalanceEffectOnce(res as unknown as ITransaction);
  } catch (e) {
    console.error("Transaction post-findOneAndUpdate apply failed:", e);
  }
});

// Ensure fresh model in dev when file changes
const modelName = "Transaction";
if (mongoose.models[modelName]) {
  // @ts-ignore
  delete mongoose.models[modelName];
}

const Transaction: Model<ITransaction> =
  mongoose.models[modelName] || mongoose.model<ITransaction>(modelName, TransactionSchema);

export default Transaction;
