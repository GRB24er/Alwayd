// src/app/api/auth/reset-password/route.ts
// Public endpoint: completes a password reset with the emailed 6-digit code.

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { verifyOTP, OTPType } from "@/lib/otpService";
import { check as rateCheck, ipFromHeaders, POLICIES } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").toLowerCase().trim();
    const code = String(body?.code || "").trim();
    const newPassword = String(body?.newPassword || "");
    const confirmPassword = String(body?.confirmPassword || "");

    if (!email || !code || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      );
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "Passwords do not match" },
        { status: 400 }
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Rate-limit verification attempts to block code brute-forcing.
    const ip = ipFromHeaders(request.headers);
    const [ipLimit, emailLimit] = await Promise.all([
      rateCheck(`pwreset-verify:ip:${ip}`, POLICIES.authLogin),
      rateCheck(`pwreset-verify:email:${email}`, POLICIES.authLogin),
    ]);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retryAfter = Math.max(
        ipLimit.retryAfterSeconds,
        emailLimit.retryAfterSeconds
      );
      return NextResponse.json(
        {
          success: false,
          error: "Too many attempts. Please try again later.",
        },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    await connectDB();
    const user = await User.findOne({ email }).select("+password");

    // Same error for unknown email and bad code — no enumeration.
    const invalidResponse = () =>
      NextResponse.json(
        { success: false, error: "Invalid or expired verification code" },
        { status: 400 }
      );

    if (!user) return invalidResponse();

    const otpResult = await verifyOTP(
      user._id.toString(),
      code,
      OTPType.PASSWORD_RESET
    );
    if (!otpResult.success) {
      await audit({
        action: "auth.password_reset_failed",
        actorId: user._id.toString(),
        actorEmail: user.email,
        outcome: "failure",
        details: { reason: otpResult.error || "invalid_code", ip },
        request,
      });
      return invalidResponse();
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    await audit({
      action: "auth.password_reset_completed",
      actorId: user._id.toString(),
      actorEmail: user.email,
      outcome: "success",
      severity: "warning",
      details: { channel: "web", ip },
      request,
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now sign in.",
    });
  } catch (error) {
    console.error("[Reset Password] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
