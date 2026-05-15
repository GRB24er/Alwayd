import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

function bad(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return bad(401, "Unauthorized");

    await connectDB();

    const user = await User.findById(session.user.id).select("+password");
    if (!user) return bad(404, "User not found");

    const body = await request.json().catch(() => ({} as any));
    const action = String(body?.action || "").toLowerCase();

    // -------- PASSWORD (no current/confirm required) --------
    if (action === "password") {
      const newPassword = String(body?.newPassword || "");
      if (!newPassword || newPassword.length < 8) {
        return bad(400, "New password must be at least 8 characters.");
      }

      user.password = await bcrypt.hash(newPassword, 12);
      await user.save();

      return NextResponse.json(
        { ok: true, message: "Password updated successfully.", requireReauth: true },
        { status: 200 }
      );
    }

    // -------- PROFILE (name + email) --------
    if (action === "profile") {
      const updates: Record<string, any> = {};
      let changed = false;

      if (typeof body?.name === "string" && body.name.trim()) {
        updates.name = body.name.trim();
        changed = true;
      }

      if (typeof body?.email === "string" && body.email.trim()) {
        const email = body.email.trim().toLowerCase();
        const exists = await User.findOne({ email, _id: { $ne: user._id } })
          .select("_id")
          .lean();
        if (exists) return bad(400, "Email address is already in use.");
        updates.email = email;
        changed = true;
      }

      if (!changed) return bad(400, "No valid profile fields were provided.");

      await User.updateOne({ _id: user._id }, { $set: updates });

      return NextResponse.json(
        { ok: true, message: "Profile updated successfully." },
        { status: 200 }
      );
    }

    return bad(400, "Invalid action. Use 'password' or 'profile'.");
  } catch (err) {
    console.error("User update error:", err);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
}
export function POST() {
  return NextResponse.json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
}
export function PATCH() {
  return NextResponse.json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
}
export function DELETE() {
  return NextResponse.json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
}
