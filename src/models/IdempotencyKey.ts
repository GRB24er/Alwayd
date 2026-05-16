// Stores idempotency keys so retried POSTs return the same response instead of double-charging.
// Key is hashed with the request body fingerprint; mismatched bodies are rejected.

import mongoose, { Document, Model, Schema } from "mongoose";

export interface IIdempotencyKey extends Document {
  key: string;
  userId: mongoose.Types.ObjectId | null;
  endpoint: string;
  requestHash: string;
  statusCode?: number;
  responseBody?: any;
  status: "in_flight" | "completed" | "failed";
  expiresAt: Date;
  createdAt: Date;
  completedAt?: Date;
}

const IdempotencyKeySchema = new Schema<IIdempotencyKey>(
  {
    key: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true, default: null },
    endpoint: { type: String, required: true },
    requestHash: { type: String, required: true },
    statusCode: { type: Number },
    responseBody: { type: Schema.Types.Mixed },
    status: { type: String, enum: ["in_flight", "completed", "failed"], default: "in_flight" },
    expiresAt: { type: Date, required: true },
    completedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

IdempotencyKeySchema.index({ key: 1, endpoint: 1 }, { unique: true });
IdempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const IdempotencyKey: Model<IIdempotencyKey> =
  mongoose.models.IdempotencyKey ||
  mongoose.model<IIdempotencyKey>("IdempotencyKey", IdempotencyKeySchema);

export default IdempotencyKey;
