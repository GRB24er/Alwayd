// src/app/api/admin/user/[id]/deposit/route.ts
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import { parseAmount } from "@/lib/amount";
import Transaction from "@/models/Transaction";
import User from "@/models/User";

// Create a PENDING Transaction doc with a professional description ("Bank credit").
// You approve it later; approval flips status to "completed".
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin =
      (session.user as any)?.isAdmin === true ||
      (session.user as any)?.role === "admin" ||
      (session.user as any)?.role === "superadmin";
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { id: userId } = await params;
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Missing user id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({} as any));

    let amount: number;
    try {
      amount = parseAmount(body?.amount);
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e?.message ?? "Invalid amount" }, { status: 400 });
    }

    const currency =
      typeof body?.currency === "string" && body.currency.trim()
        ? String(body.currency).trim().toUpperCase()
        : "USD";

    // Professional label — replaces "Admin deposit"
    const description =
      typeof body?.description === "string" && body.description.trim()
        ? body.description.trim()
        : "Bank credit";

    const accountTypeRaw =
      typeof body?.accountType === "string" ? String(body.accountType).toLowerCase() : "checking";
    const accountType: "checking" | "savings" | "investment" =
      (["checking", "savings", "investment"].includes(accountTypeRaw) ? accountTypeRaw : "checking") as any;

    await connectDB();

    // Ensure user exists
    const user = await User.findById(userId).select("_id");
    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    // Create a Transaction document (pending). Recent will show it immediately.
    const tx = await Transaction.create({
      userId,
      type: "deposit",
      currency,
      amount,
      description,        // "Bank credit"
      date: new Date(),
      status: "pending",
      posted: false,
      postedAt: null,
      accountType,
      // Optional metadata for professionalism/audit:
      channel: "internal",        // created by bank staff/system
      origin: "bank_adjustment",  // internal reason code
    });

    return NextResponse.json(
      { ok: true, message: "Bank credit created (pending).", transaction: tx },
      { status: 201 }
    );
  } catch (err) {
    console.error("Admin deposit error:", err);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}

// 405s
export function GET() {
  return NextResponse.json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
}
export function PUT() {
  return NextResponse.json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
}
export function PATCH() {
  return NextResponse.json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
}
export function DELETE() {
  return NextResponse.json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
}
