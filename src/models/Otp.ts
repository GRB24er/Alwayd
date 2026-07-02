// Persistent OTP storage with Mongo TTL. Replaces the in-memory Map that loses state
// on server restart and breaks completely under horizontal scaling.

import mongoose, { Document, Model, Schema } from "mongoose";

export type OtpPurpose =
  | "login"
  | "transfer"
  | "profile_update"
  | "card_application"
  | "password_reset"
  | "transaction_approval";

export interface IOtp extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  purpose: OtpPurpose;
  codeHash: string;
  tokenHash?: string;
  attempts: number;
  consumed: boolean;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
  consumedAt?: Date;
  lastAttemptAt?: Date;
}

const OtpSchema = new Schema<IOtp>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    email: { type: String, required: true, index: true },
    purpose: {
      type: String,
      required: true,
      enum: ["login", "transfer", "profile_update", "card_application", "password_reset", "transaction_approval"],
      index: true,
    },
    codeHash: { type: String, required: true },
    tokenHash: { type: String, index: true },
    attempts: { type: Number, default: 0 },
    consumed: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date },
    lastAttemptAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

OtpSchema.index({ userId: 1, purpose: 1, consumed: 1 });
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Otp: Model<IOtp> = mongoose.models.Otp || mongoose.model<IOtp>("Otp", OtpSchema);
export default Otp;
