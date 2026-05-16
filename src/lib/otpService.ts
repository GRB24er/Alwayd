// OTP service. Backed by Mongo TTL — survives restarts and works under horizontal scale.
// Codes are stored hashed; the cleartext is sent by email and never persisted.
//
// API is backward-compatible with the previous in-memory implementation so existing
// callers (auth, secure transfers, etc.) keep working without changes.

import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import Otp, { OtpPurpose } from "@/models/Otp";
import { sendOTPEmail } from "./mail";
import { logger } from "@/lib/logger";

const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 10,
  MAX_ATTEMPTS: 3,
  RESEND_COOLDOWN_SECONDS: 60,
  BLOCK_DURATION_MINUTES: 30,
};

// Backward-compatible enum so existing `OTPType.TRANSFER` callers continue to compile.
export enum OTPType {
  LOGIN = "login",
  TRANSFER = "transfer",
  PROFILE_UPDATE = "profile_update",
  CARD_APPLICATION = "card_application",
  PASSWORD_RESET = "password_reset",
  TRANSACTION_APPROVAL = "transaction_approval",
}

function hash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function generateOTPCode(length = OTP_CONFIG.LENGTH): string {
  // Use crypto.randomInt for unbiased uniform distribution; not Math.random.
  let code = "";
  for (let i = 0; i < length; i++) code += crypto.randomInt(0, 10).toString();
  return code;
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createOTP(
  userId: string,
  email: string,
  type: OtpPurpose,
  metadata?: Record<string, any>,
  phone?: string
): Promise<{ success: boolean; code?: string; token?: string; error?: string }> {
  void phone;
  try {
    await connectDB();

    // Cooldown: refuse to issue a fresh code if the last unconsumed one is younger than X seconds.
    const recent = await Otp.findOne({ userId, purpose: type, consumed: false })
      .sort({ createdAt: -1 })
      .lean();
    if (recent && recent.expiresAt > new Date()) {
      const ageSec = (Date.now() - new Date(recent.createdAt).getTime()) / 1000;
      if (ageSec < OTP_CONFIG.RESEND_COOLDOWN_SECONDS) {
        const wait = Math.ceil(OTP_CONFIG.RESEND_COOLDOWN_SECONDS - ageSec);
        return { success: false, error: `Please wait ${wait}s before requesting a new code.` };
      }
    }

    // Brute-force lockout: too many failed attempts across all recent OTPs for this user+purpose.
    const recentFailWindow = new Date(Date.now() - OTP_CONFIG.BLOCK_DURATION_MINUTES * 60_000);
    const failures = await Otp.countDocuments({
      userId,
      purpose: type,
      lastAttemptAt: { $gte: recentFailWindow },
      attempts: { $gte: OTP_CONFIG.MAX_ATTEMPTS },
    });
    if (failures >= 3) {
      return {
        success: false,
        error: `Too many failed attempts. Try again in ${OTP_CONFIG.BLOCK_DURATION_MINUTES} minutes.`,
      };
    }

    // Invalidate previous unconsumed codes for the same (user, purpose) so only one is active.
    await Otp.updateMany(
      { userId, purpose: type, consumed: false },
      { $set: { consumed: true, consumedAt: new Date() } }
    );

    const code = generateOTPCode();
    const token = generateSecureToken();

    await Otp.create({
      userId,
      email,
      purpose: type,
      codeHash: hash(code),
      tokenHash: hash(token),
      attempts: 0,
      consumed: false,
      metadata,
      expiresAt: new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60_000),
    });

    try {
      await sendOTPEmail(email, code, type, OTP_CONFIG.EXPIRY_MINUTES);
    } catch (err: any) {
      logger.error("otp.email_failed", { err: err?.message, email });
    }

    logger.info("otp.created", { userId, purpose: type });
    return {
      success: true,
      code: process.env.NODE_ENV === "development" ? code : undefined,
      token,
    };
  } catch (err: any) {
    logger.error("otp.create_failed", { err: err?.message });
    return { success: false, error: "Failed to generate verification code" };
  }
}

export async function verifyOTP(
  userId: string,
  code: string,
  type: OtpPurpose
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectDB();

    const record = await Otp.findOne({ userId, purpose: type, consumed: false }).sort({ createdAt: -1 });
    if (!record) return { success: false, error: "No verification code found. Please request a new one." };

    if (record.expiresAt < new Date()) {
      record.consumed = true;
      record.consumedAt = new Date();
      await record.save();
      return { success: false, error: "Verification code has expired." };
    }

    record.attempts += 1;
    record.lastAttemptAt = new Date();

    const match = record.codeHash === hash(code);
    if (!match) {
      if (record.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
        record.consumed = true;
        record.consumedAt = new Date();
        await record.save();
        return {
          success: false,
          error: `Too many failed attempts. Account temporarily blocked for ${OTP_CONFIG.BLOCK_DURATION_MINUTES} minutes.`,
        };
      }
      await record.save();
      const remaining = OTP_CONFIG.MAX_ATTEMPTS - record.attempts;
      return { success: false, error: `Invalid code. ${remaining} attempt(s) remaining.` };
    }

    record.consumed = true;
    record.consumedAt = new Date();
    await record.save();
    logger.info("otp.verified", { userId, purpose: type });
    return { success: true };
  } catch (err: any) {
    logger.error("otp.verify_failed", { err: err?.message });
    return { success: false, error: "Verification failed" };
  }
}

export async function verifyOTPToken(
  token: string
): Promise<{ success: boolean; userId?: string; type?: OtpPurpose; error?: string }> {
  try {
    await connectDB();
    const record = await Otp.findOne({ tokenHash: hash(token), consumed: false });
    if (!record) return { success: false, error: "Invalid or expired verification link." };
    if (record.expiresAt < new Date()) {
      record.consumed = true;
      record.consumedAt = new Date();
      await record.save();
      return { success: false, error: "Verification link has expired." };
    }
    record.consumed = true;
    record.consumedAt = new Date();
    await record.save();
    return { success: true, userId: record.userId.toString(), type: record.purpose };
  } catch (err: any) {
    logger.error("otp.verify_token_failed", { err: err?.message });
    return { success: false, error: "Verification failed" };
  }
}

// No-op stubs preserved for backward compatibility with old callers.
export function cleanupExpiredOTPs(): void {
  // Mongo TTL index handles this now.
}

export function getOTPForTesting(): string | null {
  return null;
}
