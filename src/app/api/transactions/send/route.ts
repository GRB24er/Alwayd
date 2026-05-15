// FILE: src/app/api/transactions/send/route.ts
// COMPLETE FIXED VERSION - WITH EMAIL

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { sendTransactionEmail } from "@/lib/mail";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      recipientName,
      recipientAccount,
      recipientBank,
      amount,
      accountType,
      description,
      transferType
    } = body;

    // ALWAYS POSITIVE AMOUNT
    const transferAmount = Math.abs(parseFloat(amount));
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const balance = accountType === "checking" ? user.checkingBalance :
                   accountType === "savings" ? user.savingsBalance :
                   user.investmentBalance;

    if (balance < transferAmount) {
      return NextResponse.json({ error: "Insufficient funds" }, { status: 400 });
    }

    // Create PENDING transaction
    const transaction = await Transaction.create({
      userId: user._id,
      type: "transfer-out",
      currency: "USD",
      amount: transferAmount, // POSITIVE
      description: `Transfer to ${recipientName} - ${recipientBank} (${recipientAccount})${description ? ': ' + description : ''}`,
      status: "pending",
      date: new Date(),
      accountType: accountType,
      posted: false,
      reference: `TRF-${Date.now()}`,
      channel: "online",
      origin: "user_transfer"
    });

    // ✅ SEND EMAIL
    try {
      await sendTransactionEmail(user.email, {
        name: user.name || user.firstName || 'Customer',
        transaction: transaction
      });
      console.log('✅ Transfer email sent (pending)');
    } catch (emailError) {
      console.error('❌ Email failed:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Transaction initiated. Pending approval.",
      transaction: {
        id: transaction._id,
        reference: transaction.reference,
        amount: transferAmount,
        status: "pending"
      }
    });

  } catch (error) {
    console.error("Send money error:", error);
    return NextResponse.json(
      { error: "Transaction failed" },
      { status: 500 }
    );
  }
}