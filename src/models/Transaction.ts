// src/models/Transaction.ts
// CLEAN VERSION - NO AUTOMATIC BALANCE UPDATES
// Balance updates happen ONLY in admin approve route

import mongoose, { Document, Model, Schema } from 'mongoose';

export type AccountType = 'checking' | 'savings' | 'investment';
export type Currency = 'USD' | 'BTC';
export type TxType = 
  | 'deposit' 
  | 'withdraw' 
  | 'transfer-in' 
  | 'transfer-out' 
  | 'fee' 
  | 'interest' 
  | 'adjustment-credit' 
  | 'adjustment-debit';

export type TxStatus = 
  | 'pending' 
  | 'completed' 
  | 'approved' 
  | 'rejected' 
  | 'pending_verification';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: TxType;
  currency: Currency;
  amount: number;
  date: Date;
  description?: string;
  status: TxStatus;
  reviewedBy?: mongoose.Types.ObjectId | null;
  reviewedAt?: Date | null;
  posted: boolean;
  postedAt?: Date | null;
  accountType: AccountType;
  reference?: string;
  category?: string;
  channel?: string;
  origin?: string;
  metadata?: any;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  adminNotes?: string;
}

const TransactionSchema: Schema<ITransaction> = new mongoose.Schema(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true, 
      index: true 
    },
    type: { 
      type: String, 
      enum: [
        'deposit', 
        'withdraw', 
        'transfer-in', 
        'transfer-out', 
        'fee', 
        'interest', 
        'adjustment-credit', 
        'adjustment-debit'
      ], 
      required: true,
      index: true
    },
    currency: { 
      type: String, 
      enum: ['USD', 'BTC'], 
      required: true, 
      default: 'USD' 
    },
    amount: { 
      type: Number, 
      required: true,
      min: 0
    },
    date: { 
      type: Date, 
      default: () => new Date(),
      index: true
    },
    description: { 
      type: String 
    },
    status: { 
      type: String, 
      enum: ['pending', 'completed', 'approved', 'rejected', 'pending_verification'], 
      default: 'pending', 
      index: true 
    },
    reviewedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      default: null 
    },
    reviewedAt: { 
      type: Date, 
      default: null 
    },
    posted: { 
      type: Boolean, 
      default: false, 
      index: true 
    },
    postedAt: { 
      type: Date, 
      default: null 
    },
    accountType: { 
      type: String, 
      enum: ['checking', 'savings', 'investment'], 
      default: 'checking', 
      index: true 
    },
    reference: { 
      type: String,
      index: true
    },
    category: { 
      type: String 
    },
    channel: { 
      type: String 
    },
    origin: { 
      type: String,
      index: true
    },
    metadata: { 
      type: Schema.Types.Mixed 
    },
    // Admin fields
    approvedBy: { type: String },
    approvedAt: { type: Date },
    rejectedBy: { type: String },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
    adminNotes: { type: String }
  },
  { timestamps: true }
);

// ============================================
// HELPER FUNCTIONS (exported for use elsewhere)
// ============================================

export function isCreditType(type: TxType): boolean {
  return ['deposit', 'transfer-in', 'interest', 'adjustment-credit'].includes(type);
}

export function isDebitType(type: TxType): boolean {
  return ['withdraw', 'transfer-out', 'fee', 'adjustment-debit'].includes(type);
}

export function getBalanceField(accountType: AccountType): string {
  if (accountType === 'savings') return 'savingsBalance';
  if (accountType === 'investment') return 'investmentBalance';
  return 'checkingBalance';
}

// ============================================
// NO AUTOMATIC MIDDLEWARE
// Balance updates are handled explicitly in:
// - /api/admin/transactions/[id]/approve
// - /api/admin/create-transaction (for instant admin transactions)
// ============================================

// ============================================
// INDEXES
// ============================================

TransactionSchema.index({ userId: 1, status: 1 });
TransactionSchema.index({ userId: 1, type: 1 });
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, accountType: 1 });
// `reference` and `origin` already have inline `index: true` on their field definitions

const Transaction: Model<ITransaction> =
  mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;