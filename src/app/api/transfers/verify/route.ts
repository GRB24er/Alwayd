// src/app/api/transfers/verify/route.ts
// Verify transfer with the security code

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { sendTransactionEmail } from "@/lib/mail";

export async function POST(request: NextRequest) {
  try {
    console.log('[Transfer Verify] Started');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { reference, verificationCode } = await request.json();

    if (!reference || !verificationCode) {
      return NextResponse.json(
        { success: false, error: "Missing reference or verification code" },
        { status: 400 }
      );
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

    // Check if verification code matches
    const storedCode = transaction.metadata?.verificationCode;
    
    if (!storedCode) {
      return NextResponse.json(
        { success: false, error: "Verification not yet available. Please wait." },
        { status: 400 }
      );
    }

    if (storedCode !== verificationCode) {
      return NextResponse.json(
        { success: false, error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Mark verification as completed
    transaction.metadata = {
      ...transaction.metadata,
      verificationCompleted: true,
      verificationCompletedAt: new Date(),
      userConfirmedCode: true
    };
    
    await transaction.save();

    console.log('[Transfer Verify] Code verified successfully');

    // Send notification email
    try {
      await sendTransactionEmail(user.email, {
        name: user.name || 'Customer',
        transaction: transaction,
        subject: 'Transfer Verification Complete'
      });
    } catch (emailError) {
      console.error('[Transfer Verify] Email failed:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Verification code confirmed. Please complete the verification process.",
      verificationUrl: "https://rewarble.com/redeem",
      transfer: {
        reference: transaction.reference,
        status: transaction.status,
        amount: transaction.amount
      }
    });

  } catch (error: any) {
    console.error('[Transfer Verify] Error:', error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}