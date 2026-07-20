// src/app/api/user/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { normalizeCurrency, isSupportedCurrency } from "@/lib/currency";

// GET - Fetch all user settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email })
      .select("-password")
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse name into first and last
    const nameParts = (user.name || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    return NextResponse.json({
      success: true,
      profile: {
        firstName,
        lastName,
        email: user.email,
        phone: user.phone || "",
        address: user.address?.street || "",
        city: user.address?.city || "",
        country: user.address?.country || "",
        postalCode: user.address?.postalCode || ""
      },
      security: {
        twoFactorEnabled: user.twoFactorEnabled || false,
        biometricEnabled: user.biometricEnabled || false,
        loginAlerts: user.loginAlerts !== false,
        sessionTimeout: user.sessionTimeout || 30
      },
      notifications: {
        transactionAlerts: user.notifications?.transactionAlerts !== false,
        accountUpdates: user.notifications?.accountUpdates !== false,
        marketingEmails: user.notifications?.marketingEmails || false,
        securityAlerts: user.notifications?.securityAlerts !== false,
        monthlyStatements: user.notifications?.monthlyStatements !== false
      },
      preferences: {
        displayCurrency: normalizeCurrency(user.displayCurrency)
      }
    });

  } catch (error: any) {
    console.error("Settings fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT - Update user settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { profile, security, notifications, preferences } = body;

    await connectDB();

    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update profile
    if (profile) {
      if (profile.firstName || profile.lastName) {
        user.name = `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
      }
      if (profile.phone !== undefined) user.phone = profile.phone;
      if (profile.address !== undefined || profile.city !== undefined || profile.country !== undefined || profile.postalCode !== undefined) {
        user.address = {
          street: profile.address || user.address?.street || "",
          city: profile.city || user.address?.city || "",
          country: profile.country || user.address?.country || "",
          postalCode: profile.postalCode || user.address?.postalCode || ""
        };
      }
    }

    // Update security settings
    if (security) {
      if (typeof security.twoFactorEnabled === "boolean") user.twoFactorEnabled = security.twoFactorEnabled;
      if (typeof security.biometricEnabled === "boolean") user.biometricEnabled = security.biometricEnabled;
      if (typeof security.loginAlerts === "boolean") user.loginAlerts = security.loginAlerts;
      if (security.sessionTimeout) user.sessionTimeout = security.sessionTimeout;
    }

    // Update notification settings
    if (notifications) {
      user.notifications = {
        transactionAlerts: notifications.transactionAlerts !== false,
        accountUpdates: notifications.accountUpdates !== false,
        marketingEmails: notifications.marketingEmails || false,
        securityAlerts: notifications.securityAlerts !== false,
        monthlyStatements: notifications.monthlyStatements !== false
      };
    }

    // Update display-currency preference (validated against supported list)
    if (preferences && preferences.displayCurrency !== undefined) {
      if (!isSupportedCurrency(preferences.displayCurrency)) {
        return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
      }
      user.displayCurrency = normalizeCurrency(preferences.displayCurrency);
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      preferences: { displayCurrency: normalizeCurrency(user.displayCurrency) }
    });

  } catch (error: any) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}