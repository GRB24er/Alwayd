// src/lib/otpService.ts - UPDATED VERSION
import crypto from 'crypto';
import { sendOTPEmail } from './mail'; // Use your existing mail service

// OTP Configuration
const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 10,
  MAX_ATTEMPTS: 3,
  RESEND_COOLDOWN_SECONDS: 60,
  BLOCK_DURATION_MINUTES: 30
};

// OTP Types for different actions
export enum OTPType {
  LOGIN = 'login',
  TRANSFER = 'transfer',
  PROFILE_UPDATE = 'profile_update',
  CARD_APPLICATION = 'card_application',
  PASSWORD_RESET = 'password_reset',
  TRANSACTION_APPROVAL = 'transaction_approval'
}

// OTP Storage Interface
interface OTPRecord {
  code: string;
  type: OTPType;
  userId: string;
  email: string;
  phone?: string;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
  metadata?: any;
  createdAt: Date;
  lastAttemptAt?: Date;
  ipAddress?: string;
}

// In-memory storage (replace with MongoDB in production)
const otpStorage = new Map<string, OTPRecord>();
const blockedUsers = new Map<string, Date>();

/**
 * Generate a random OTP code
 */
export function generateOTPCode(length: number = OTP_CONFIG.LENGTH): string {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  
  return otp;
}

/**
 * Generate a secure OTP token for URL-based verification
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create and store OTP
 */
export async function createOTP(
  userId: string,
  email: string,
  type: OTPType,
  metadata?: any,
  phone?: string
): Promise<{ success: boolean; code?: string; token?: string; error?: string }> {
  try {
    // Check if user is blocked
    if (isUserBlocked(userId)) {
      const blockExpiry = blockedUsers.get(userId);
      const minutesLeft = Math.ceil((blockExpiry!.getTime() - Date.now()) / 60000);
      return {
        success: false,
        error: `Too many failed attempts. Please try again in ${minutesLeft} minutes.`
      };
    }

    // Check for existing unexpired OTP
    const existingKey = `${userId}-${type}`;
    const existing = otpStorage.get(existingKey);
    
    if (existing && existing.expiresAt > new Date()) {
      // Check resend cooldown
      const secondsSinceCreated = (Date.now() - existing.createdAt.getTime()) / 1000;
      if (secondsSinceCreated < OTP_CONFIG.RESEND_COOLDOWN_SECONDS) {
        const waitTime = Math.ceil(OTP_CONFIG.RESEND_COOLDOWN_SECONDS - secondsSinceCreated);
        return {
          success: false,
          error: `Please wait ${waitTime} seconds before requesting a new code.`
        };
      }
    }

    // Generate new OTP
    const code = generateOTPCode();
    const token = generateSecureToken();
    
    const otpRecord: OTPRecord = {
      code,
      type,
      userId,
      email,
      phone,
      expiresAt: new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60000),
      attempts: 0,
      verified: false,
      metadata,
      createdAt: new Date(),
      ipAddress: metadata?.ipAddress
    };

    // Store OTP
    otpStorage.set(existingKey, otpRecord);
    
    // Also store by token for URL-based verification
    otpStorage.set(`token-${token}`, otpRecord);

    // Send OTP via email using YOUR existing mail service
    try {
      await sendOTPEmail(email, code, type, OTP_CONFIG.EXPIRY_MINUTES);
      console.log(`[OTP] Code sent to ${email}: ${code}`);
    } catch (emailError) {
      console.error('[OTP] Failed to send email:', emailError);
      // Don't fail - code is still stored
    }

    return {
      success: true,
      code: process.env.NODE_ENV === 'development' ? code : undefined, // Only return code in dev
      token
    };
  } catch (error: any) {
    console.error('[OTP] Failed to create OTP:', error);
    return {
      success: false,
      error: 'Failed to generate verification code'
    };
  }
}

/**
 * Verify OTP code
 */
export async function verifyOTP(
  userId: string,
  code: string,
  type: OTPType
): Promise<{ success: boolean; error?: string }> {
  try {
    const key = `${userId}-${type}`;
    const otpRecord = otpStorage.get(key);

    if (!otpRecord) {
      return {
        success: false,
        error: 'No verification code found. Please request a new one.'
      };
    }

    // Check if already verified
    if (otpRecord.verified) {
      return {
        success: false,
        error: 'This code has already been used.'
      };
    }

    // Check expiry
    if (otpRecord.expiresAt < new Date()) {
      otpStorage.delete(key);
      return {
        success: false,
        error: 'Verification code has expired. Please request a new one.'
      };
    }

    // Update attempt count
    otpRecord.attempts++;
    otpRecord.lastAttemptAt = new Date();

    // Check if code matches
    if (otpRecord.code !== code) {
      // Check max attempts
      if (otpRecord.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
        // Block user
        blockUser(userId);
        otpStorage.delete(key);
        return {
          success: false,
          error: `Too many failed attempts. Account temporarily blocked for ${OTP_CONFIG.BLOCK_DURATION_MINUTES} minutes.`
        };
      }

      const remainingAttempts = OTP_CONFIG.MAX_ATTEMPTS - otpRecord.attempts;
      return {
        success: false,
        error: `Invalid code. ${remainingAttempts} attempt(s) remaining.`
      };
    }

    // Mark as verified
    otpRecord.verified = true;
    otpStorage.delete(key); // Remove after successful verification

    console.log(`[OTP] Code verified successfully for ${userId}`);
    return { success: true };
  } catch (error: any) {
    console.error('[OTP] Failed to verify OTP:', error);
    return {
      success: false,
      error: 'Verification failed'
    };
  }
}

/**
 * Verify OTP token (for URL-based verification)
 */
export async function verifyOTPToken(
  token: string
): Promise<{ success: boolean; userId?: string; type?: OTPType; error?: string }> {
  try {
    const key = `token-${token}`;
    const otpRecord = otpStorage.get(key);

    if (!otpRecord) {
      return {
        success: false,
        error: 'Invalid or expired verification link.'
      };
    }

    // Check expiry
    if (otpRecord.expiresAt < new Date()) {
      otpStorage.delete(key);
      return {
        success: false,
        error: 'Verification link has expired.'
      };
    }

    // Mark as verified
    otpRecord.verified = true;
    otpStorage.delete(key);

    return {
      success: true,
      userId: otpRecord.userId,
      type: otpRecord.type
    };
  } catch (error: any) {
    console.error('[OTP] Failed to verify OTP token:', error);
    return {
      success: false,
      error: 'Verification failed'
    };
  }
}

/**
 * Block user after max failed attempts
 */
function blockUser(userId: string): void {
  const blockUntil = new Date(Date.now() + OTP_CONFIG.BLOCK_DURATION_MINUTES * 60000);
  blockedUsers.set(userId, blockUntil);
  console.log(`[OTP] User ${userId} blocked until ${blockUntil.toISOString()}`);
}

/**
 * Check if user is blocked
 */
function isUserBlocked(userId: string): boolean {
  const blockExpiry = blockedUsers.get(userId);
  
  if (!blockExpiry) return false;
  
  if (blockExpiry > new Date()) {
    return true;
  }
  
  // Unblock if time has passed
  blockedUsers.delete(userId);
  return false;
}

/**
 * Clean up expired OTPs (run periodically)
 */
export function cleanupExpiredOTPs(): void {
  const now = new Date();
  
  for (const [key, record] of otpStorage.entries()) {
    if (record.expiresAt < now) {
      otpStorage.delete(key);
    }
  }
  
  for (const [userId, expiry] of blockedUsers.entries()) {
    if (expiry < now) {
      blockedUsers.delete(userId);
    }
  }
}

/**
 * Get OTP for testing (dev only)
 */
export function getOTPForTesting(userId: string, type: OTPType): string | null {
  if (process.env.NODE_ENV !== 'development') return null;
  
  const key = `${userId}-${type}`;
  const record = otpStorage.get(key);
  return record?.code || null;
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);
}