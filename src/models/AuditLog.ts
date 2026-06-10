// Immutable audit trail. Every privileged or money-moving action writes here.
// Append-only; queries are read-only.

import mongoose, { Document, Model, Schema } from "mongoose";

export type AuditAction =
  | "auth.login"
  | "auth.login_failed"
  | "auth.logout"
  | "auth.password_change"
  | "auth.mfa_challenge"
  | "auth.mfa_verified"
  | "auth.mfa_failed"
  | "user.register"
  | "user.profile_update"
  | "transfer.internal.initiated"
  | "transfer.internal.posted"
  | "transfer.wire.initiated"
  | "transfer.wire.posted"
  | "transfer.receipt.generated"
  | "transaction.approved"
  | "transaction.rejected"
  | "transaction.posted"
  | "transaction.reversed"
  | "limits.exceeded"
  | "sanctions.blocked"
  | "admin.balance_adjustment"
  | "admin.user_verified"
  | "admin.email_sent"
  | "rate_limit.exceeded"
  | "idempotency.replay";

export type AuditSeverity = "info" | "warning" | "critical";

export interface IAuditLog extends Document {
  action: AuditAction;
  severity: AuditSeverity;
  actorId: mongoose.Types.ObjectId | null;
  actorEmail?: string;
  actorRole?: string;
  targetUserId?: mongoose.Types.ObjectId | null;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  outcome: "success" | "failure" | "blocked";
  details?: Record<string, any>;
  occurredAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, index: true },
    severity: { type: String, enum: ["info", "warning", "critical"], default: "info", index: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    actorEmail: { type: String },
    actorRole: { type: String },
    targetUserId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    resourceId: { type: String, index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    requestId: { type: String, index: true },
    outcome: { type: String, enum: ["success", "failure", "blocked"], required: true, index: true },
    details: { type: Schema.Types.Mixed },
    occurredAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ action: 1, occurredAt: -1 });
AuditLogSchema.index({ actorId: 1, occurredAt: -1 });
AuditLogSchema.index({ severity: 1, occurredAt: -1 });

AuditLogSchema.pre("findOneAndUpdate", function () {
  throw new Error("AuditLog is immutable");
});
AuditLogSchema.pre("updateOne", function () {
  throw new Error("AuditLog is immutable");
});
AuditLogSchema.pre("updateMany", function () {
  throw new Error("AuditLog is immutable");
});
AuditLogSchema.pre("deleteOne", function () {
  throw new Error("AuditLog is immutable");
});
AuditLogSchema.pre("deleteMany", function () {
  throw new Error("AuditLog is immutable");
});

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;
