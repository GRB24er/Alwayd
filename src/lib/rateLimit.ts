// Fixed-window rate limiter backed by Mongo (so it works across serverless instances).
// Returns remaining and reset; throws nothing — caller decides whether to block.

import connectDB from "@/lib/mongodb";
import RateLimit from "@/models/RateLimit";
import { logger } from "@/lib/logger";

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
}

export async function check(rawKey: string, cfg: RateLimitConfig): Promise<RateLimitResult> {
  await connectDB();

  const now = Date.now();
  const bucket = Math.floor(now / cfg.windowMs);
  const key = `${rawKey}:${bucket}`;
  const windowStart = new Date(bucket * cfg.windowMs);
  const expiresAt = new Date(windowStart.getTime() + cfg.windowMs * 2);

  try {
    const doc = await RateLimit.findOneAndUpdate(
      { key },
      {
        $inc: { count: 1 },
        $setOnInsert: { windowStart, expiresAt },
      },
      { upsert: true, new: true }
    );

    const count = doc.count;
    const remaining = Math.max(0, cfg.limit - count);
    const resetAt = new Date(windowStart.getTime() + cfg.windowMs);
    const retryAfterSeconds = Math.max(0, Math.ceil((resetAt.getTime() - now) / 1000));

    return {
      allowed: count <= cfg.limit,
      remaining,
      resetAt,
      retryAfterSeconds,
    };
  } catch (err: any) {
    // Fail open on Mongo errors so a counter outage doesn't take down auth.
    logger.error("rate_limit.error", { err: err?.message, key: rawKey });
    return {
      allowed: true,
      remaining: cfg.limit,
      resetAt: new Date(now + cfg.windowMs),
      retryAfterSeconds: 0,
    };
  }
}

export function ipFromHeaders(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip") || "unknown";
}

// Common policies.
export const POLICIES = {
  authLogin: { limit: 10, windowMs: 15 * 60 * 1000 }, // 10 / 15 min per IP
  authRegister: { limit: 5, windowMs: 60 * 60 * 1000 }, // 5 / hour per IP
  otpRequest: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 / 15 min per user
  otpVerify: { limit: 10, windowMs: 15 * 60 * 1000 }, // 10 / 15 min per user
  transferInitiate: { limit: 30, windowMs: 60 * 60 * 1000 }, // 30 / hour per user
  verificationAttempt: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 / 15 min per user
  passwordReset: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 / hour per IP
} as const;
