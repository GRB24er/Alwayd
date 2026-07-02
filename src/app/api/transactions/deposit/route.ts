// src/app/api/transactions/deposit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { parseAmount } from "@/lib/amount";
import { sendTransactionEmail } from "@/lib/mail";

export const runtime = "nodejs";

/**
 * User-initiated deposit request.
 * Supports: Wire Transfer, Crypto (BTC, ETH, USDT, USDC)
 * All transactions start as "pending" - Admin approves after verifying funds received.
 */
export async function POST(request: NextRequest) {
  try {
    // 1) Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 2) Parse body
    const raw = await request.json().catch(() => ({} as any));

    // Amount validation
    let amount: number;
    try {
      amount = parseAmount(raw?.amount);
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err?.message ?? "Invalid amount." }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ success: false, error: "Amount must be greater than zero." }, { status: 400 });
    }

    // Deposit method validation
    const method = raw?.method?.toLowerCase();
    if (!method || !['wire', 'crypto'].includes(method)) {
      return NextResponse.json({ success: false, error: "Invalid deposit method. Use 'wire' or 'crypto'." }, { status: 400 });
    }

    // Method-specific validation
    if (method === 'wire' && amount < 100) {
      return NextResponse.json({ success: false, error: "Minimum wire transfer deposit is $100." }, { status: 400 });
    }

    if (method === 'crypto' && amount < 10) {
      return NextResponse.json({ success: false, error: "Minimum crypto deposit is $10." }, { status: 400 });
    }

    // Crypto type validation
    const validCryptoTypes = ['BTC', 'ETH', 'USDT', 'USDC'];
    const cryptoType = method === 'crypto' 
      ? (validCryptoTypes.includes(raw?.cryptoType?.toUpperCase()) ? raw.cryptoType.toUpperCase() : 'USDT')
      : null;

    // Account type
    const accountTypeRaw = String(raw?.accountType || "").toLowerCase();
    const accountType: "checking" | "savings" | "investment" =
      accountTypeRaw === "savings" ? "savings" : accountTypeRaw === "investment" ? "investment" : "checking";

    const currency = String(raw?.currency || "USD").toUpperCase();

    // Generate description based on method
    const description = method === 'wire'
      ? "Wire Transfer Deposit"
      : `Crypto Deposit (${cryptoType})`;

    // 3) Connect DB
    await connectDB();

    // Get user info for metadata
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Generate reference
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const reference = `DEP-${timestamp}-${random}`;

    // 4) Create pending transaction
    const tx = await Transaction.create({
      userId: session.user.id,
      type: "deposit",
      currency,
      amount,
      description,
      status: "pending",
      date: new Date(),
      accountType,
      posted: false,
      postedAt: null,
      reference,
      channel: "online",
      origin: method === 'wire' ? 'wire_deposit' : 'crypto_deposit',
      metadata: {
        depositMethod: method,
        cryptoType: cryptoType,
        userEmail: user.email,
        userName: user.name,
        awaitingConfirmation: true,
        initiatedAt: new Date().toISOString()
      }
    });

    console.log('[Deposit] Created pending deposit:', {
      reference,
      amount,
      method,
      cryptoType,
      userId: session.user.id
    });

    // 5) Send confirmation email
    try {
      await sendTransactionEmail(String(session.user.email || user.email), {
        name: user.name || (session.user as any)?.name || 'Customer',
        transaction: tx,
      });
      console.log('[Deposit] Confirmation email sent');
    } catch (emailErr) {
      console.warn("[Deposit] Email failed (continuing):", emailErr);
    }

    return NextResponse.json(
      {
        success: true,
        ok: true, // backward compatibility
        message: "Deposit request submitted. Awaiting confirmation.",
        reference: reference,
        transaction: {
          _id: tx._id,
          reference: tx.reference,
          amount: tx.amount,
          method: method,
          cryptoType: cryptoType,
          status: tx.status,
          accountType: tx.accountType,
          createdAt: tx.createdAt
        }
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[Deposit] Error:", err);
    return NextResponse.json({ success: false, ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * GET - Fetch user's pending deposits
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const deposits = await Transaction.find({
      userId: session.user.id,
      type: 'deposit',
      status: 'pending',
      origin: { $in: ['wire_deposit', 'crypto_deposit', 'user_deposit'] }
    })
    .sort({ createdAt: -1 })
    .limit(20);

    return NextResponse.json({
      success: true,
      deposits: deposits.map((d: any) => ({
        _id: d._id,
        reference: d.reference,
        amount: d.amount,
        method: d.metadata?.depositMethod || 'wire',
        cryptoType: d.metadata?.cryptoType || null,
        status: d.status,
        accountType: d.accountType,
        createdAt: d.createdAt
      }))
    });

  } catch (err) {
    console.error("[Deposit GET] Error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch deposits" }, { status: 500 });
  }
}

// Reply 405 for unsupported methods
export function PUT() {
  return NextResponse.json({ success: false, error: "Method Not Allowed" }, { status: 405 });
}
export function PATCH() {
  return NextResponse.json({ success: false, error: "Method Not Allowed" }, { status: 405 });
}
export function DELETE() {
  return NextResponse.json({ success: false, error: "Method Not Allowed" }, { status: 405 });
}