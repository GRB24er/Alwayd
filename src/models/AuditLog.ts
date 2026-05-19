// src/models/AuditLog.ts
// Append-only audit trail. Every privileged action on a regulated
// resource (loan, KYC, statement, transfer, etc.) writes a row so we
// can answer "who did what, when, from where".

import mongoose, { Document, Schema, Types } from 'mongoose';

export type AuditEventType =
  | 'loan.application.submitted'
  | 'loan.application.under_review'
  | 'loan.application.approved'
  | 'loan.application.rejected'
  | 'loan.offer.signed'
  | 'loan.disbursed'
  | 'loan.closed'
  | 'loan.message.sent'
  | 'admin.user.role_changed'
  | 'admin.user.verified'
  | 'security.login.success'
  | 'security.login.failed'
  | 'security.password.reset';

export interface IAuditLog extends Document {
  event: AuditEventType;
  actorId?: Types.ObjectId | null;
  actorRole?: 'user' | 'admin' | 'system';
  actorEmail?: string;
  subjectId?: Types.ObjectId | null;
  subjectType?: 'loan' | 'user' | 'transaction' | 'document';
  reference?: string;
  ip?: string;
  userAgent?: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    event: { type: String, required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    actorRole: { type: String, enum: ['user', 'admin', 'system'], default: 'system' },
    actorEmail: { type: String },
    subjectId: { type: Schema.Types.ObjectId, index: true },
    subjectType: { type: String, enum: ['loan', 'user', 'transaction', 'document'], index: true },
    reference: { type: String, index: true },
    ip: { type: String },
    userAgent: { type: String },
    payload: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ subjectType: 1, subjectId: 1, createdAt: -1 });

const AuditLog =
  (mongoose.models.AuditLog as mongoose.Model<IAuditLog>) ||
  mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
