// COPY THIS ENTIRE FILE TO YOUR WEB PROJECT AT:
//   src/app/api/user/change-password/route.ts
// (replaces the existing file)
//
// Change password for a signed-in user. Accepts EITHER:
//   - a NextAuth session cookie (web app), or
//   - a mobile JWT via "Authorization: Bearer <token>" (mobile app)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AUTH_SECRET } from "@/lib/authSecret";
import { audit } from "@/lib/audit";

/**
 * Resolve the caller's email from either auth channel.
 * Returns null when neither a valid session nor a valid Bearer token exists.
 */
async function resolveCallerEmail(request: NextRequest): Promise<string | null> {
  // 1) Mobile: Bearer JWT (same shape as /api/auth/mobile issues)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(authHeader.split(" ")[1], AUTH_SECRET) as {
        userId: string;
        email: string;
      };
      if (decoded?.email) return decoded.email.toLowerCase();
    } catch {
      return null; // A presented-but-invalid token is a hard failure.
    }
  }

  // 2) Web: NextAuth session cookie
  const session = await getServerSession(authOptions);
  if (session?.user?.email) return session.user.email.toLowerCase();

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const callerEmail = await resolveCallerEmail(request);
    if (!callerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "All password fields are required" },
        { status: 400 }
      );
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New passwords do not match" },
        { status: 400 }
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: callerEmail }).select("+password");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      await audit({
        action: "auth.password_change_failed",
        actorId: user._id.toString(),
        actorEmail: user.email,
        outcome: "failure",
        details: { reason: "wrong_current_password" },
        request,
      });
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    await audit({
      action: "auth.password_changed",
      actorId: user._id.toString(),
      actorEmail: user.email,
      outcome: "success",
      severity: "warning",
      details: { channel: request.headers.get("authorization") ? "mobile" : "web" },
      request,
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}
