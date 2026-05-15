// src/app/api/transfers/status/route.ts
// Check transfer status and verification code availability

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json({ success: false, error: "Missing reference" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Find the transaction - handle both full reference and base reference
    const transaction = await Transaction.findOne({
      userId: user._id,
      $or: [
        { reference: reference },
        { reference: `${reference}-OUT` },
        { reference: { $regex: new RegExp(`^${reference}`) } }
      ]
    });

    if (!transaction) {
      return NextResponse.json({ success: false, error: "Transfer not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      transfer: {
        reference: transaction.reference,
        status: transaction.status,
        amount: transaction.amount,
        verificationCode: transaction.metadata?.verificationCode || null,
        verificationRequired: transaction.metadata?.verificationRequired || false,
        verificationUrl: transaction.metadata?.verificationUrl || null,
        posted: transaction.posted,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
      }
    });

  } catch (error: any) {
    console.error('Transfer status error:', error);
    return NextResponse.json(
      { success: false, error: "Failed to get transfer status" },
      { status: 500 }
    );
  }
}