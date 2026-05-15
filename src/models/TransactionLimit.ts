// src/models/TransactionLimit.ts
import mongoose, { Document, Schema } from 'mongoose';

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
    default: 10000 // $10,000 per day
  },
  dailyWithdrawalLimit: { 
    type: Number, 
    default: 5000 // $5,000 per day
  },
  maxTransactionAmount: { 
    type: Number, 
    default: 25000 // $25,000 per transaction
  },
  
  // Account-specific
  checkingDailyLimit: { 
    type: Number, 
    default: 10000 
  },
  savingsDailyLimit: { 
    type: Number, 
    default: 5000 
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