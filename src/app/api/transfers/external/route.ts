// src/app/api/transfers/external/route.ts
// External Transfer - Creates PENDING transaction that requires verification

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { sendTransactionEmail } from "@/lib/mail";

interface ExternalTransferRequest {
  fromAccount: 'checking' | 'savings' | 'investment';
  recipientName: string;
  recipientAccount: string;
  recipientBank: string;
  recipientRoutingNumber: string;
  recipientAddress?: string;
  amount: number;
  description?: string;
  transferSpeed?: 'standard' | 'express' | 'wire';
}

export async function POST(request: NextRequest) {
  try {
    console.log('[External Transfer] Started');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Please login" },
        { status: 401 }
      );
    }

    const body: ExternalTransferRequest = await request.json();
    const {
      fromAccount,
      recipientName,
      recipientAccount,
      recipientBank,
      recipientRoutingNumber,
      recipientAddress,
      amount,
      description,
      transferSpeed = 'standard'
    } = body;

    console.log('[External Transfer] Request:', {
      fromAccount,
      recipientName,
      recipientBank,
      amount,
      transferSpeed,
      userEmail: session.user.email
    });

    // Validation
    if (!fromAccount || !['checking', 'savings', 'investment'].includes(fromAccount)) {
      return NextResponse.json(
        { success: false, error: "Invalid source account" },
        { status: 400 }
      );
    }

    if (!recipientName || !recipientAccount || !recipientBank || !recipientRoutingNumber) {
      return NextResponse.json(
        { success: false, error: "Missing recipient information" },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 }
      );
    }

    // Validate routing number (9 digits)
    if (!/^\d{9}$/.test(recipientRoutingNumber)) {
      return NextResponse.json(
        { success: false, error: "Invalid routing number. Must be 9 digits." },
        { status: 400 }
      );
    }

    // Calculate fees
    let fee = 0;
    if (transferSpeed === 'express') fee = 15;
    if (transferSpeed === 'wire') fee = 30;

    const totalAmount = amount + fee;

    await connectDB();
    console.log('[External Transfer] Database connected');

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User account not found" },
        { status: 404 }
      );
    }

    // Get balance field
    const balanceField = `${fromAccount}Balance`;
    const currentBalance = (user as any)[balanceField] || 0;

    console.log('[External Transfer] Balance check:', {
      account: fromAccount,
      currentBalance,
      totalRequired: totalAmount
    });

    // Check sufficient funds
    if (currentBalance < totalAmount) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient funds. Available: $${currentBalance.toFixed(2)}, Required: $${totalAmount.toFixed(2)}` 
        },
        { status: 400 }
      );
    }

    // Generate reference
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const transferRef = `EXT-${timestamp}-${random}`;

    console.log('[External Transfer] Generated reference:', transferRef);

    // Estimated delivery
    let estimatedDays = 5;
    if (transferSpeed === 'express') estimatedDays = 2;
    if (transferSpeed === 'wire') estimatedDays = 1;

    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + estimatedDays);

    // =====================================================
    // CREATE PENDING TRANSACTION
    // NO balance deduction yet - only when admin approves
    // User must complete verification before funds release
    // =====================================================

    const mainTransaction = await Transaction.create({
      userId: user._id,
      type: 'transfer-out',
      currency: 'USD',
      amount: amount,
      description: description || `Transfer to ${recipientName}`,
      status: 'pending',
      accountType: fromAccount,
      posted: false,
      postedAt: null,
      reference: transferRef,
      channel: 'online',
      origin: 'external_transfer',
      date: new Date(),
      metadata: {
        recipientName,
        recipientAccount: recipientAccount.slice(-4).padStart(recipientAccount.length, '*'),
        recipientAccountFull: recipientAccount, // Store full for admin
        recipientBank,
        recipientRoutingNumber: recipientRoutingNumber.slice(-4).padStart(9, '*'),
        recipientRoutingFull: recipientRoutingNumber, // Store full for admin
        recipientAddress: recipientAddress || '',
        transferSpeed,
        fee,
        totalAmount,
        estimatedDelivery: estimatedDelivery.toISOString(),
        // Verification fields - admin will populate these
        verificationRequired: true,
        verificationCode: null,
        verificationCompleted: false,
        verificationUrl: null
      }
    });

    console.log('[External Transfer] Main transaction created:', mainTransaction._id);

    // Create fee transaction if applicable
    if (fee > 0) {
      await Transaction.create({
        userId: user._id,
        type: 'fee',
        currency: 'USD',
        amount: fee,
        description: `${transferSpeed === 'wire' ? 'Wire' : 'Express'} transfer fee`,
        status: 'pending',
        accountType: fromAccount,
        posted: false,
        postedAt: null,
        reference: `${transferRef}-FEE`,
        channel: 'system',
        origin: 'transfer_fee',
        date: new Date(),
        metadata: {
          linkedReference: transferRef,
          feeType: `${transferSpeed}_transfer`
        }
      });

      console.log('[External Transfer] Fee transaction created');
    }

    // Send email notification
    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 40px 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .amount { font-size: 36px; font-weight: bold; color: #10b981; text-align: center; margin: 20px 0; }
            .details { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
            .row:last-child { border-bottom: none; }
            .label { color: #64748b; }
            .value { font-weight: 600; color: #0f172a; }
            .status { display: inline-block; background: #fef3c7; color: #92400e; padding: 8px 16px; border-radius: 20px; font-weight: 600; }
            .footer { background: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Transfer Initiated</h1>
              <p>Your transfer is being processed</p>
            </div>
            <div class="content">
              <div class="amount">$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              
              <div style="text-align: center; margin: 20px 0;">
                <span class="status">⏳ Processing</span>
              </div>
              
              <div class="details">
                <div class="row">
                  <span class="label">Reference</span>
                  <span class="value">${transferRef}</span>
                </div>
                <div class="row">
                  <span class="label">To</span>
                  <span class="value">${recipientName}</span>
                </div>
                <div class="row">
                  <span class="label">Bank</span>
                  <span class="value">${recipientBank}</span>
                </div>
                <div class="row">
                  <span class="label">Account</span>
                  <span class="value">****${recipientAccount.slice(-4)}</span>
                </div>
                <div class="row">
                  <span class="label">Speed</span>
                  <span class="value">${transferSpeed.charAt(0).toUpperCase() + transferSpeed.slice(1)}</span>
                </div>
                ${fee > 0 ? `
                <div class="row">
                  <span class="label">Fee</span>
                  <span class="value">$${fee.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="row">
                  <span class="label">Total</span>
                  <span class="value">$${totalAmount.toFixed(2)}</span>
                </div>
                <div class="row">
                  <span class="label">Estimated Delivery</span>
                  <span class="value">${estimatedDelivery.toLocaleDateString()}</span>
                </div>
              </div>
              
              <p style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 15px; border-radius: 8px; color: #0369a1;">
                <strong>What's next?</strong><br>
                Your transfer is being reviewed. You will receive a notification when verification is required to release the funds.
              </p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendTransactionEmail(user.email, {
        name: user.name || 'Customer',
        subject: `Transfer Initiated - $${amount.toLocaleString()} to ${recipientName}`,
        html: emailHtml,
        transaction: mainTransaction
      });

      console.log('[External Transfer] Email sent');
    } catch (emailError) {
      console.error('[External Transfer] Email failed:', emailError);
    }

    console.log('[External Transfer] Success:', {
      reference: transferRef,
      amount,
      status: 'pending'
    });

    return NextResponse.json({
      success: true,
      message: "Transfer initiated successfully. Awaiting verification.",
      reference: transferRef,
      transferReference: transferRef,
      transfer: {
        reference: transferRef,
        amount,
        fee,
        totalAmount,
        recipientName,
        recipientBank,
        status: 'pending',
        estimatedDelivery: estimatedDelivery.toISOString()
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('[External Transfer] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: "Transfer failed. Please try again.",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}