// src/app/api/transactions/route.ts
// FIXED - Returns transactions in correct format for TransactionTable

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";

export async function GET(request: NextRequest) {
  try {
    console.log('═══════════════════════════════════════');
    console.log('[Transactions API] Starting request...');
    console.log('═══════════════════════════════════════');

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('[Transactions API] ❌ Unauthorized');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      console.log('[Transactions API] ❌ User not found');
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log('[Transactions API] 👤 User:', user._id, user.email);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const accountType = searchParams.get('accountType');
    const transactionType = searchParams.get('type');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query - ALWAYS filter by userId
    const query: any = { userId: user._id };
    
    if (accountType && accountType !== 'all') {
      query.accountType = accountType;
    }
    
    if (transactionType && transactionType !== 'all') {
      query.type = transactionType;
    }
    
    if (status && status !== 'all') {
      // Handle "completed" to include both "completed" and "approved"
      if (status === 'completed') {
        query.status = { $in: ['completed', 'approved'] };
      } else {
        query.status = status;
      }
    }
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    console.log('[Transactions API] 🔍 Query:', JSON.stringify(query));

    // Fetch transactions
    const transactions = await Transaction.find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    console.log('[Transactions API] 📊 Found:', transactions.length, 'transactions');

    // Debug: Show status breakdown
    const statusCounts: Record<string, number> = {};
    transactions.forEach((tx: any) => {
      const s = tx.status || 'unknown';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });
    console.log('[Transactions API] 📊 Status breakdown:', statusCounts);

    // Format transactions for the frontend
    const formattedTransactions = transactions.map((tx: any) => {
      // Determine if debit or credit
      const isDebit = [
        'transfer-out', 'withdrawal', 'withdraw', 'payment', 
        'fee', 'charge', 'purchase', 'adjustment-debit'
      ].includes(tx.type);
      
      // Calculate adjusted amount (negative for debits)
      const adjustedAmount = isDebit ? -Math.abs(tx.amount) : Math.abs(tx.amount);
      
      return {
        _id: tx._id?.toString() || '',
        id: tx._id?.toString() || '',
        reference: tx.reference || tx._id?.toString() || '',
        type: tx.type || 'deposit',
        amount: Math.abs(tx.amount || 0),
        adjustedAmount: adjustedAmount,
        description: tx.description || 'Transaction',
        date: tx.date || tx.createdAt || new Date(),
        status: tx.status || 'pending',
        rawStatus: tx.status || 'pending',
        accountType: tx.accountType || 'checking',
        currency: tx.currency || 'USD',
        channel: tx.channel || 'online',
        origin: tx.origin || '',
        posted: tx.posted || false,
        postedAt: tx.postedAt || null,
        metadata: tx.metadata || {},
        createdAt: tx.createdAt || new Date(),
        updatedAt: tx.updatedAt || new Date(),
        // For TransactionTable component compatibility
        category: tx.accountType ? tx.accountType.charAt(0).toUpperCase() + tx.accountType.slice(1) : 'General',
        method: 'Bank Transfer',
        balance: 0
      };
    });

    // Get total count for pagination
    const totalCount = await Transaction.countDocuments(query);

    // Calculate summary
    let totalDebits = 0;
    let totalCredits = 0;
    let pendingCount = 0;
    let completedCount = 0;

    formattedTransactions.forEach((tx: any) => {
      if (tx.adjustedAmount < 0) {
        totalDebits += Math.abs(tx.adjustedAmount);
      } else {
        totalCredits += tx.adjustedAmount;
      }
      
      if (tx.status === 'pending' || tx.status === 'pending_verification') {
        pendingCount++;
      } else if (tx.status === 'completed' || tx.status === 'approved') {
        completedCount++;
      }
    });

    console.log('[Transactions API] ✅ Sending', formattedTransactions.length, 'transactions');
    console.log('═══════════════════════════════════════');

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      summary: {
        totalTransactions: totalCount,
        totalDebits,
        totalCredits,
        pendingCount,
        completedCount,
        netChange: totalCredits - totalDebits
      },
      currentBalances: {
        checking: user.checkingBalance || 0,
        savings: user.savingsBalance || 0,
        investment: user.investmentBalance || 0,
        total: (user.checkingBalance || 0) + (user.savingsBalance || 0) + (user.investmentBalance || 0)
      }
    });

  } catch (error: any) {
    console.error('[Transactions API] ❌ Error:', error);
    return NextResponse.json(
      { 
        error: "Failed to fetch transactions",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Create a new transaction (user-initiated)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, amount, description, accountType } = body;

    if (!type || !amount || !accountType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Validate account type
    const validAccountTypes = ['checking', 'savings', 'investment'];
    if (!validAccountTypes.includes(accountType)) {
      return NextResponse.json({ error: "Invalid account type" }, { status: 400 });
    }

    // Generate reference
    const reference = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create transaction as PENDING (admin will approve)
    const transaction = await Transaction.create({
      userId: user._id,
      type,
      amount: Math.abs(amount),
      currency: 'USD',
      description: description || `${type} transaction`,
      status: 'pending', // Always pending for user-initiated
      accountType,
      posted: false,
      postedAt: null,
      reference,
      channel: 'online',
      origin: 'user_initiated',
      date: new Date()
    });

    console.log('[Transactions API] ✅ Created pending transaction:', transaction.reference);

    return NextResponse.json({
      success: true,
      message: "Transaction created. Awaiting approval.",
      transaction: {
        id: transaction._id,
        reference: transaction.reference,
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status
      }
    });

  } catch (error: any) {
    console.error('[Transactions API] ❌ POST Error:', error);
    return NextResponse.json(
      { error: "Failed to create transaction", details: error.message },
      { status: 500 }
    );
  }
}