// Sliding-window rate limit counter. One row per bucket key, expires automatically.

import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRateLimit extends Document {
  key: string;
  count: number;
  windowStart: Date;
  expiresAt: Date;
}

const RateLimitSchema = new Schema<IRateLimit>(
  {
    key: { type: String, required: true, unique: true, index: true },
    count: { type: Number, default: 0 },
    windowStart: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false }
);

RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RateLimit: Model<IRateLimit> =
  mongoose.models.RateLimit || mongoose.model<IRateLimit>("RateLimit", RateLimitSchema);

export default RateLimit;
