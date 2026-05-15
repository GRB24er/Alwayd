// src/app/api/transfers/confirm-receipt/route.ts
// User confirms they received the money in their external account

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";

export async function POST(request: NextRequest) {
  try {
    console.log('[Confirm Receipt] Started');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { reference } = await request.json();

    if (!reference) {
      return NextResponse.json({ success: false, error: "Missing reference" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Find the transaction
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

    // Update metadata to show user confirmed receipt
    transaction.metadata = {
      ...transaction.metadata,
      userConfirmedReceipt: true,
      userConfirmedReceiptAt: new Date()
    };
    
    await transaction.save();

    console.log('[Confirm Receipt] User confirmed receipt for:', reference);

    return NextResponse.json({
      success: true,
      message: "Receipt confirmed. Thank you.",
      transfer: {
        reference: transaction.reference,
        status: transaction.status
      }
    });

  } catch (error: any) {
    console.error('[Confirm Receipt] Error:', error);
    return NextResponse.json(
      { success: false, error: "Failed to confirm receipt" },
      { status: 500 }
    );
  }
}