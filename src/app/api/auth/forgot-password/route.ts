// src/app/api/auth/forgot-password/route.ts
// Public endpoint: emails a 6-digit password-reset code.
// Always returns success so account existence cannot be probed.

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { createOTP, OTPType } from "@/lib/otpService";
import { check as rateCheck, ipFromHeaders, POLICIES } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";

const GENERIC_RESPONSE = {
  success: true,
  message:
    "If an account exists for this email, a verification code has been sent.",
  expiresIn: 600,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").toLowerCase().trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "A valid email address is required" },
        { status: 400 }
      );
    }

    // Rate-limit per IP and per email to prevent code-spamming.
    const ip = ipFromHeaders(request.headers);
    const [ipLimit, emailLimit] = await Promise.all([
      rateCheck(`pwreset:ip:${ip}`, POLICIES.otpRequest),
      rateCheck(`pwreset:email:${email}`, POLICIES.otpRequest),
    ]);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retryAfter = Math.max(
        ipLimit.retryAfterSeconds,
        emailLimit.retryAfterSeconds
      );
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    await connectDB();
    const user = await User.findOne({ email });

    // Unknown email: return the same generic success (no enumeration).
    if (!user) {
      await audit({
        action: "auth.password_reset_requested",
        actorEmail: email,
        outcome: "failure",
        details: { reason: "unknown_email", ip },
        request,
      });
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const result = await createOTP(
      user._id.toString(),
      user.email,
      OTPType.PASSWORD_RESET,
      { channel: "web", ip },
      user.phone
    );

    if (!result.success) {
      console.error("[Forgot Password] createOTP failed:", result.error);
      // Still return generic success — the client cannot distinguish.
      return NextResponse.json(GENERIC_RESPONSE);
    }

    await audit({
      action: "auth.password_reset_requested",
      actorId: user._id.toString(),
      actorEmail: user.email,
      outcome: "success",
      details: { channel: "web", ip },
      request,
    });

    return NextResponse.json({
      ...GENERIC_RESPONSE,
      // Only expose the code in development builds for testing.
      ...(process.env.NODE_ENV === "development" && { code: result.code }),
    });
  } catch (error) {
    console.error("[Forgot Password] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    );
  }
}
