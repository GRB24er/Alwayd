// src/app/api/user/security/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

// GET - Fetch security settings and activity
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email }).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get security settings (with defaults)
    const securitySettings = {
      twoFactorEnabled: user.twoFactorEnabled || false,
      twoFactorMethod: user.twoFactorMethod || "sms",
      loginAlerts: user.loginAlerts !== false, // default true
      biometricEnabled: user.biometricEnabled || false,
      deviceTrust: user.deviceTrust !== false, // default true
      locationSecurity: user.locationSecurity || false,
      sessionTimeout: user.sessionTimeout || 15, // minutes
      lastPasswordChange: user.lastPasswordChange || user.createdAt,
      trustedDevices: user.trustedDevices || []
    };

    // Calculate security score
    let score = 50; // Base score
    if (securitySettings.twoFactorEnabled) score += 20;
    if (securitySettings.loginAlerts) score += 10;
    if (securitySettings.biometricEnabled) score += 10;
    if (securitySettings.locationSecurity) score += 10;
    
    // Check password age (reduce score if old)
    const passwordAge = Date.now() - new Date(securitySettings.lastPasswordChange).getTime();
    const daysSinceChange = passwordAge / (1000 * 60 * 60 * 24);
    if (daysSinceChange > 90) score -= 10;

    // Get recent security activity (mock for now, can be enhanced with activity logging)
    const recentActivity = user.securityActivity || [];

    return NextResponse.json({
      success: true,
      security: {
        ...securitySettings,
        score: Math.min(100, Math.max(0, score)),
        passwordAgeDays: Math.floor(daysSinceChange)
      },
      recentActivity
    });

  } catch (error: any) {
    console.error("Security fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch security settings" },
      { status: 500 }
    );
  }
}

// PUT - Update security settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      twoFactorEnabled,
      twoFactorMethod,
      loginAlerts,
      biometricEnabled,
      deviceTrust,
      locationSecurity,
      sessionTimeout
    } = body;

    await connectDB();

    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update security settings
    if (typeof twoFactorEnabled === "boolean") user.twoFactorEnabled = twoFactorEnabled;
    if (twoFactorMethod) user.twoFactorMethod = twoFactorMethod;
    if (typeof loginAlerts === "boolean") user.loginAlerts = loginAlerts;
    if (typeof biometricEnabled === "boolean") user.biometricEnabled = biometricEnabled;
    if (typeof deviceTrust === "boolean") user.deviceTrust = deviceTrust;
    if (typeof locationSecurity === "boolean") user.locationSecurity = locationSecurity;
    if (sessionTimeout) user.sessionTimeout = sessionTimeout;

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Security settings updated"
    });

  } catch (error: any) {
    console.error("Security update error:", error);
    return NextResponse.json(
      { error: "Failed to update security settings" },
      { status: 500 }
    );
  }
}