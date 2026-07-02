// src/models/TransactionLimit.ts
import mongoose, { Document, Schema } from 'mongoose';

// Standard limits, aligned with the limits advertised across the app
// ($100k/day transfers, $250k Fedwire per-transaction cap). Docs that an admin
// has not customized (customLimits=false) track these values; enforceLimit
// self-heals older docs that were created under lower defaults.
export const STANDARD_LIMITS = {
  dailyTransferLimit: 100_000,
  dailyWithdrawalLimit: 25_000,
  maxTransactionAmount: 250_000,
  checkingDailyLimit: 100_000,
  savingsDailyLimit: 100_000,
} as const;

export interface ITransactionLimit extends Document {
  userId: mongoose.Types.ObjectId;
  
  // Daily limits
  dailyTransferLimit: number;
  dailyWithdrawalLimit: number;
  
  // Per-transaction limits
  maxTransactionAmount: number;
  
  // Account-specific limits
  checkingDailyLimit: number;
  savingsDailyLimit: number;
  
  // Current day usage (resets at midnight)
  todayTransferred: number;
  todayWithdrawn: number;
  lastResetDate: Date;
  
  // Status
  limitsEnabled: boolean;
  customLimits: boolean; // Admin can set custom limits
  
  createdAt: Date;
  updatedAt: Date;
}

const TransactionLimitSchema = new Schema<ITransactionLimit>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  
  // Default limits (can be customized per user)
  dailyTransferLimit: {
    type: Number,
    default: STANDARD_LIMITS.dailyTransferLimit
  },
  dailyWithdrawalLimit: {
    type: Number,
    default: STANDARD_LIMITS.dailyWithdrawalLimit
  },
  maxTransactionAmount: {
    type: Number,
    default: STANDARD_LIMITS.maxTransactionAmount
  },

  // Account-specific
  checkingDailyLimit: {
    type: Number,
    default: STANDARD_LIMITS.checkingDailyLimit
  },
  savingsDailyLimit: {
    type: Number,
    default: STANDARD_LIMITS.savingsDailyLimit
  },
  
  // Daily usage tracking
  todayTransferred: { 
    type: Number, 
    default: 0 
  },
  todayWithdrawn: { 
    type: Number, 
    default: 0 
  },
  lastResetDate: { 
    type: Date, 
    default: Date.now 
  },
  
  // Settings
limitsEnabled: { 
  type: Boolean,   // ✅ CORRECT
  default: true 
},
  customLimits: { 
    type: Boolean, 
    default: false 
  }
}, {
  timestamps: true
});

const TransactionLimit = mongoose.models.TransactionLimit || 
  mongoose.model<ITransactionLimit>('TransactionLimit', TransactionLimitSchema);

export default TransactionLimit;