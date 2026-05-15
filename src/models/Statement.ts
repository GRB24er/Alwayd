// src/models/Statement.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IStatement extends Document {
  userId: mongoose.Types.ObjectId;
  accountType: 'checking' | 'savings' | 'investment';
  startDate: Date;
  endDate: Date;
  status: 'pending' | 'sent' | 'failed';
  requestedAt: Date;
  sentAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StatementSchema = new Schema<IStatement>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  accountType: { 
    type: String, 
    enum: ['checking', 'savings', 'investment'], 
    required: true 
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'sent', 'failed'], 
    default: 'pending' 
  },
  requestedAt: { type: Date, default: Date.now },
  sentAt: { type: Date },
  errorMessage: { type: String }
}, {
  timestamps: true
});

const Statement = mongoose.models.Statement || mongoose.model<IStatement>('Statement', StatementSchema);
export default Statement;