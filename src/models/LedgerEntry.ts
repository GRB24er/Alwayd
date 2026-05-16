// Immutable double-entry ledger.
// Every money movement creates >=2 entries; sum(debits) == sum(credits) per transactionId.
// Entries are append-only. Never updated, never deleted.

import mongoose, { Document, Model, Schema } from "mongoose";

export type LedgerAccount =
  | "user.checking"
  | "user.savings"
  | "user.investment"
  | "bank.cash"
  | "bank.fees_income"
  | "bank.interest_expense"
  | "bank.suspense"
  | "bank.wire_clearing"
  | "external.counterparty";

export type Side = "debit" | "credit";

export interface ILedgerEntry extends Document {
  transactionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId | null;
  account: LedgerAccount;
  side: Side;
  amountMinor: string;
  currency: string;
  postedAt: Date;
  reference: string;
  description?: string;
  // Hash chain link to previous entry for tamper evidence
  prevHash?: string;
  hash: string;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    transactionId: { type: Schema.Types.ObjectId, ref: "Transaction", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true, default: null },
    account: { type: String, required: true, index: true },
    side: { type: String, enum: ["debit", "credit"], required: true },
    amountMinor: { type: String, required: true },
    currency: { type: String, required: true, default: "USD" },
    postedAt: { type: Date, default: Date.now, index: true },
    reference: { type: String, required: true, index: true },
    description: { type: String },
    prevHash: { type: String },
    hash: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

LedgerEntrySchema.index({ userId: 1, account: 1, postedAt: -1 });
LedgerEntrySchema.index({ transactionId: 1, side: 1 });

// Hard-block updates and deletes to enforce immutability.
LedgerEntrySchema.pre("findOneAndUpdate", function () {
  throw new Error("LedgerEntry is immutable");
});
LedgerEntrySchema.pre("updateOne", function () {
  throw new Error("LedgerEntry is immutable");
});
LedgerEntrySchema.pre("updateMany", function () {
  throw new Error("LedgerEntry is immutable");
});
LedgerEntrySchema.pre("deleteOne", function () {
  throw new Error("LedgerEntry is immutable");
});
LedgerEntrySchema.pre("deleteMany", function () {
  throw new Error("LedgerEntry is immutable");
});

const LedgerEntry: Model<ILedgerEntry> =
  mongoose.models.LedgerEntry || mongoose.model<ILedgerEntry>("LedgerEntry", LedgerEntrySchema);

export default LedgerEntry;
