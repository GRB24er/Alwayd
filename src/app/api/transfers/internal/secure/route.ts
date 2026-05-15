// src/app/api/transfers/internal/secure/route.ts
// Enhanced internal transfer with OTP verification for amounts > $1000

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { createOTP, verifyOTP, OTPType } from "@/lib/otpService";
import { sendTransactionEmail } from "@/lib/mail";

const LARGE_TRANSFER_THRESHOLD = 1000; // Require OTP for transfers > $1000

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized - Please login" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      fromAccount, 
      toAccount, 
      amount, 
      description,
      otpCode,
      requestOtp 
    } = body;

    // Validate inputs
    if (!fromAccount || !toAccount || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const transferAmount = parseFloat(amount.toString());
    
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if OTP is required for large transfers
    if (transferAmount > LARGE_TRANSFER_THRESHOLD) {
      // If requesting OTP
      if (requestOtp) {
        const otpResult = await createOTP(
          user._id.toString(),
          user.email,
          OTPType.TRANSFER,
          {
            fromAccount,
            toAccount,
            amount: transferAmount,
            timestamp: Date.now()
          }
        );

        if (!otpResult.success) {
          return NextResponse.json(
            { error: otpResult.error || "Failed to send OTP" },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          requiresOtp: true,
          message: `Verification code sent to ${user.email}`,
          threshold: LARGE_TRANSFER_THRESHOLD,
          expiresIn: 600 // 10 minutes
        });
      }

      // If OTP code provided, verify it
      if (!otpCode) {
        return NextResponse.json({
          requiresOtp: true,
          message: `Transfers over $${LARGE_TRANSFER_THRESHOLD} require verification`,
          threshold: LARGE_TRANSFER_THRESHOLD
        });
      }

      // Verify the OTP
      const verifyResult = await verifyOTP(
        user._id.toString(),
        otpCode,
        OTPType.TRANSFER
      );

      if (!verifyResult.success) {
        return NextResponse.json(
          { error: verifyResult.error || "Invalid verification code" },
          { status: 400 }
        );
      }
    }

    // Proceed with transfer after OTP verification (or if not required)
    const balanceFieldMap: { [key: string]: string } = {
      'checking': 'checkingBalance',
      'savings': 'savingsBalance',
      'investment': 'investmentBalance'
    };

    const fromBalanceField = balanceFieldMap[fromAccount];
    const toBalanceField = balanceFieldMap[toAccount];

    // Check balances
    const currentFromBalance = user[fromBalanceField] || 0;
    
    if (transferAmount > currentFromBalance) {
      return NextResponse.json(
        { 
          error: "Insufficient funds",
          available: currentFromBalance,
          requested: transferAmount
        },
        { status: 400 }
      );
    }

    // Generate reference
    const transferRef = `TRF-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Start database transaction
    const mongoSession = await User.startSession();
    
    try {
      await mongoSession.withTransaction(async () => {
        // Create debit transaction
        const debitTx = await Transaction.create([{
          userId: user._id,
          type: 'transfer-out',
          currency: 'USD',
          amount: transferAmount,
          description: description || `Transfer to ${toAccount.charAt(0).toUpperCase() + toAccount.slice(1)}`,
          status: 'completed',
          accountType: fromAccount,
          posted: true,
          postedAt: new Date(),
          reference: `${transferRef}-OUT`,
          channel: 'online',
          origin: 'internal_transfer',
          date: new Date(),
          metadata: {
            otpVerified: transferAmount > LARGE_TRANSFER_THRESHOLD,
            verifiedAt: new Date()
          }
        }], { session: mongoSession });

        // Create credit transaction
        const creditTx = await Transaction.create([{
          userId: user._id,
          type: 'transfer-in',
          currency: 'USD',
          amount: transferAmount,
          description: description || `Transfer from ${fromAccount.charAt(0).toUpperCase() + fromAccount.slice(1)}`,
          status: 'completed',
          accountType: toAccount,
          posted: true,
          postedAt: new Date(),
          reference: `${transferRef}-IN`,
          channel: 'online',
          origin: 'internal_transfer',
          date: new Date()
        }], { session: mongoSession });

        // Update balances
        const newFromBalance = currentFromBalance - transferAmount;
        const newToBalance = (user[toBalanceField] || 0) + transferAmount;
        
        await User.findByIdAndUpdate(
          user._id,
          {
            $set: {
              [fromBalanceField]: newFromBalance,
              [toBalanceField]: newToBalance
            }
          },
          { session: mongoSession }
        );

        // Send confirmation email
        await sendTransactionEmail(user.email, {
          name: user.name,
          transaction: {
            reference: transferRef,
            type: 'transfer',
            amount: transferAmount,
            description: `Internal transfer completed`,
            status: 'completed',
            date: new Date()
          }
        });
      });

      await mongoSession.endSession();

      // Get updated user data
      const updatedUser = await User.findById(user._id);

      return NextResponse.json({
        success: true,
        message: "Transfer completed successfully",
        transferReference: transferRef,
        transfer: {
          from: fromAccount,
          to: toAccount,
          amount: transferAmount,
          reference: transferRef,
          date: new Date(),
          otpVerified: transferAmount > LARGE_TRANSFER_THRESHOLD
        },
        newBalances: {
          [fromAccount]: updatedUser[fromBalanceField],
          [toAccount]: updatedUser[toBalanceField]
        }
      });

    } catch (dbError) {
      await mongoSession.abortTransaction();
      await mongoSession.endSession();
      throw dbError;
    }

  } catch (error: any) {
    console.error('Secure transfer error:', error);
    return NextResponse.json(
      { 
        error: "Failed to complete transfer",
        details: error.message
      },
      { status: 500 }
    );
  }
}
