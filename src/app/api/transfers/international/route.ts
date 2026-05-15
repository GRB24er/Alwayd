// src/app/api/transfers/international/route.ts
// ALL TRANSFERS REQUIRE ADMIN APPROVAL
// Creates PENDING transactions - balances update ONLY when admin approves

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { sendTransactionEmail } from "@/lib/mail";

interface InternationalTransferRequest {
  fromAccount: 'checking' | 'savings' | 'investment';
  recipientName: string;
  recipientAccount: string;
  recipientBank: string;
  swiftCode: string;
  iban?: string;
  recipientCountry: string;
  recipientAddress: string;
  recipientBankAddress: string;
  amount: number | string;
  currency?: string;
  description?: string;
  purposeOfTransfer: string;
  transferSpeed?: 'standard' | 'express';
}

export async function POST(request: NextRequest) {
  try {
    console.log('🌍 International transfer initiated');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Please login" },
        { status: 401 }
      );
    }

    const body: InternationalTransferRequest = await request.json();
    console.log('📥 International transfer request:', {
      fromAccount: body.fromAccount,
      recipientName: body.recipientName,
      recipientCountry: body.recipientCountry,
      amount: body.amount,
      currency: body.currency,
      userEmail: session.user.email
    });
    
    const { 
      fromAccount,
      recipientName,
      recipientAccount,
      recipientBank,
      swiftCode,
      iban,
      recipientCountry,
      recipientAddress,
      recipientBankAddress,
      amount,
      currency = 'USD',
      description,
      purposeOfTransfer,
      transferSpeed = 'standard'
    } = body;

    // Validation
    const missingFields = [];
    if (!fromAccount) missingFields.push('fromAccount');
    if (!recipientName?.trim()) missingFields.push('recipientName');
    if (!recipientAccount?.trim()) missingFields.push('recipientAccount');
    if (!recipientBank?.trim()) missingFields.push('recipientBank');
    if (!swiftCode?.trim()) missingFields.push('swiftCode');
    if (!recipientCountry?.trim()) missingFields.push('recipientCountry');
    if (!recipientAddress?.trim()) missingFields.push('recipientAddress');
    if (!recipientBankAddress?.trim()) missingFields.push('recipientBankAddress');
    if (!amount) missingFields.push('amount');
    if (!purposeOfTransfer?.trim()) missingFields.push('purposeOfTransfer');

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
          missingFields 
        },
        { status: 400 }
      );
    }

    // Validate SWIFT code format
    if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/i.test(swiftCode)) {
      return NextResponse.json(
        { success: false, error: "Invalid SWIFT/BIC code format" },
        { status: 400 }
      );
    }

    const transferAmount = Math.abs(
      typeof amount === 'string' 
        ? parseFloat(amount.replace(/[^0-9.-]/g, '')) 
        : Number(amount)
    );

    if (isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 }
      );
    }

    // International transfer limits
    if (transferAmount < 50) {
      return NextResponse.json(
        { success: false, error: "Minimum international transfer amount is $50.00" },
        { status: 400 }
      );
    }

    if (transferAmount > 100000) {
      return NextResponse.json(
        { success: false, error: "International transfers over $100,000 require additional approval. Please contact support." },
        { status: 400 }
      );
    }

    // Calculate fees
    let transferFee = 45; // Base international fee
    let exchangeFee = 0;
    if (currency !== 'USD') {
      exchangeFee = Math.max(10, transferAmount * 0.01); // 1% exchange fee, min $10
    }
    if (transferSpeed === 'express') {
      transferFee += 30;
    }

    const totalFees = transferFee + exchangeFee;
    const totalAmount = transferAmount + totalFees;
    const estimatedDays = transferSpeed === 'express' ? '1-2 business days' : '3-5 business days';

    console.log('💸 International transfer details:', {
      transferAmount,
      transferFee,
      exchangeFee,
      totalFees,
      totalAmount,
      currency,
      estimatedDays
    });

    await connectDB();
    console.log('🗄️ Database connected');

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User account not found" },
        { status: 404 }
      );
    }

    console.log('👤 User found:', user._id);

    const balanceFieldMap: { [key: string]: string } = {
      'checking': 'checkingBalance',
      'savings': 'savingsBalance',
      'investment': 'investmentBalance'
    };

    const fromBalanceField = balanceFieldMap[fromAccount];
    const currentBalance = Number((user as any)[fromBalanceField] || 0);
    
    console.log('💰 Current balance check:', {
      account: fromAccount,
      currentBalance,
      requiredAmount: totalAmount,
      hasSufficientFunds: currentBalance >= totalAmount
    });
    
    // Check sufficient funds (validation only - NOT deducting)
    if (totalAmount > currentBalance) {
      return NextResponse.json(
        { 
          success: false,
          error: "Insufficient funds for international transfer",
          details: {
            available: currentBalance,
            transferAmount,
            fees: totalFees,
            totalRequired: totalAmount,
            shortfall: totalAmount - currentBalance
          }
        },
        { status: 400 }
      );
    }

    // Generate reference
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const intlRef = `INTL-${timestamp}-${random}`;
    
    console.log('🔖 Generated reference:', intlRef);

    // =====================================================
    // CREATE PENDING TRANSACTION - NO BALANCE CHANGE YET
    // Admin will approve, then balance updates
    // =====================================================

    const intlTransaction = await Transaction.create({
      userId: user._id,
      type: 'transfer-out',
      currency: 'USD',
      amount: transferAmount,
      description: description?.trim() || `International transfer to ${recipientName} (${recipientCountry})`,
      status: 'pending', // PENDING - awaits admin approval
      accountType: fromAccount,
      posted: false, // NOT posted
      postedAt: null,
      reference: intlRef,
      channel: 'online',
      origin: 'international_transfer',
      date: new Date(),
      metadata: {
        recipientName,
        recipientAccount: recipientAccount.slice(-4),
        recipientBank,
        swiftCode,
        iban: iban?.slice(-4),
        recipientCountry,
        recipientAddress,
        recipientBankAddress,
        targetCurrency: currency,
        purposeOfTransfer,
        transferSpeed,
        transferFee,
        exchangeFee,
        totalFees,
        totalAmount,
        estimatedDays
      }
    });

    console.log('💾 International transaction saved:', intlTransaction._id);

    // Create fee transaction (also pending)
    if (totalFees > 0) {
      await Transaction.create({
        userId: user._id,
        type: 'fee',
        currency: 'USD',
        amount: totalFees,
        description: `International transfer fees${exchangeFee > 0 ? ' (incl. exchange)' : ''}`,
        status: 'pending', // PENDING
        accountType: fromAccount,
        posted: false,
        postedAt: null,
        reference: `${intlRef}-FEE`,
        channel: 'online',
        origin: 'international_transfer',
        date: new Date(),
        metadata: {
          linkedReference: intlRef,
          transferFee,
          exchangeFee,
          targetCurrency: currency
        }
      });
      console.log('💾 Fee transaction saved');
    }

    // =====================================================
    // DO NOT UPDATE BALANCE - Admin approval will do that
    // =====================================================

    console.log('✅ International transfer created (pending approval):', {
      reference: intlRef,
      status: 'pending',
      currentBalance // Balance unchanged
    });

    // Send notification email
    try {
      await sendTransactionEmail(user.email, {
        name: user.name || 'Customer',
        transaction: intlTransaction,
        subject: 'International Transfer Initiated - Pending Approval'
      });
      console.log('📧 Notification email sent');
    } catch (emailError) {
      console.error('❌ Email failed:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: "International transfer initiated. Awaiting admin approval.",
      transferReference: intlRef,
      transfer: {
        type: 'international',
        from: fromAccount,
        to: {
          name: recipientName,
          account: `****${recipientAccount.slice(-4)}`,
          bank: recipientBank,
          swiftCode,
          country: recipientCountry
        },
        amount: transferAmount,
        currency,
        fees: {
          transfer: transferFee,
          exchange: exchangeFee,
          total: totalFees
        },
        total: totalAmount,
        description: description || 'International Transfer',
        reference: intlRef,
        status: 'pending',
        estimatedCompletion: estimatedDays,
        purposeOfTransfer,
        date: new Date().toISOString()
      },
      // Balance NOT changed yet
      currentBalance
    }, { status: 200 });

  } catch (error: any) {
    console.error('💥 International transfer error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: "An unexpected error occurred. Please try again.",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// GET - Fetch international transfer history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const intlTransfers = await Transaction.find({
      userId: user._id,
      origin: 'international_transfer',
      type: 'transfer-out'
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const transferHistory = intlTransfers.map((tx: any) => ({
      id: tx._id.toString(),
      reference: tx.reference,
      date: tx.date || tx.createdAt,
      amount: tx.amount,
      fees: tx.metadata?.totalFees || 0,
      total: tx.amount + (tx.metadata?.totalFees || 0),
      fromAccount: tx.accountType,
      currency: tx.metadata?.targetCurrency || 'USD',
      recipient: {
        name: tx.metadata?.recipientName || 'Unknown',
        country: tx.metadata?.recipientCountry || 'Unknown',
        bank: tx.metadata?.recipientBank || 'Unknown Bank'
      },
      status: tx.status,
      description: tx.description,
      posted: tx.posted
    }));

    return NextResponse.json({
      success: true,
      transfers: transferHistory,
      total: transferHistory.length,
      currentBalances: {
        checking: user.checkingBalance || 0,
        savings: user.savingsBalance || 0,
        investment: user.investmentBalance || 0
      }
    });

  } catch (error: any) {
    console.error('Get international transfers error:', error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch transfer history" },
      { status: 500 }
    );
  }
}