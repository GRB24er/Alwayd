// src/app/api/user/dashboard/route.ts
// FIXED VERSION - Shows ALL transactions including pending

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { displayDescription } from "@/lib/channels";

interface FormattedTransaction {
  reference: string;
  type: string;
  currency: string;
  amount: number;
  date: Date | string;
  description: string;
  status: string;
  rawStatus: string;
  accountType: string;
  isReal: boolean;
}

interface DashboardResponse {
  balances: {
    checking: number;
    savings: number;
    investment: number;
  };
  recent: FormattedTransaction[];
  user: {
    name: string;
    email: string;
    displayCurrency?: string;
  };
  debug?: any;
  error?: string;
}

function displayStatus(status: string): string {
  const s = (status || '').toLowerCase();
  
  if (s === 'completed' || s === 'approved') return "Completed";
  if (s === 'pending' || s === 'pending_verification') return "Pending";
  if (s === 'processing') return "Processing";
  if (s === 'rejected' || s === 'failed') return "Failed";
  if (s === 'cancelled') return "Cancelled";
  
  return "Pending"; // Default to Pending
}

export async function GET(): Promise<NextResponse<DashboardResponse>> {
  try {
    console.log('═══════════════════════════════════════');
    console.log('[Dashboard API] Starting request...');
    console.log('═══════════════════════════════════════');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('[Dashboard API] ❌ No session found');
      return NextResponse.json({ 
        error: "Unauthorized",
        balances: { checking: 0, savings: 0, investment: 0 },
        recent: [],
        user: { name: "", email: "" }
      }, { status: 401 });
    }
    
    console.log('[Dashboard API] 📧 User email:', session.user.email);
    
    await connectDB();
    console.log('[Dashboard API] ✅ Database connected');
    
    // Get user data
    const user = await User.findOne({ email: session.user.email })
      .select("_id checkingBalance savingsBalance investmentBalance name email displayCurrency")
      .lean();
    
    if (!user) {
      console.log('[Dashboard API] ❌ User not found in database');
      return NextResponse.json({ 
        error: "User not found",
        balances: { checking: 0, savings: 0, investment: 0 },
        recent: [],
        user: { name: "", email: "" }
      }, { status: 404 });
    }
    
    console.log('[Dashboard API] 👤 User found:', user._id, user.name);
    console.log('[Dashboard API] 💰 Balances:', {
      checking: user.checkingBalance,
      savings: user.savingsBalance,
      investment: user.investmentBalance
    });
    
    // Get ALL transactions for this user (no status filter!)
    let realTransactions: any[] = [];
    try {
      realTransactions = await Transaction.find({ userId: user._id })
        .sort({ date: -1, createdAt: -1 })
        .limit(50) // Increased limit
        .lean();
      
      console.log('[Dashboard API] 📊 Total transactions found:', realTransactions.length);
      
      // Debug: Show status breakdown
      const statusCounts: Record<string, number> = {};
      realTransactions.forEach(tx => {
        const status = tx.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      console.log('[Dashboard API] 📊 Status breakdown:', statusCounts);
      
      // Debug: Show first 5 transactions
      if (realTransactions.length > 0) {
        console.log('[Dashboard API] 📋 First 5 transactions:');
        realTransactions.slice(0, 5).forEach((tx, i) => {
          console.log(`  ${i + 1}. ${tx.reference} | ${tx.type} | $${tx.amount} | ${tx.status} | ${tx.accountType}`);
        });
      }
      
    } catch (txError) {
      console.error('[Dashboard API] ⚠️ Transaction query error:', txError);
      realTransactions = [];
    }
    
    // Format transactions - INCLUDE ALL STATUSES
    const formattedTransactions: FormattedTransaction[] = realTransactions.map(t => ({
      reference: t.reference || t._id?.toString() || 'N/A',
      type: t.type || "deposit",
      currency: t.currency || "USD",
      amount: Math.abs(t.amount) || 0,
      date: t.date || t.createdAt || new Date(),
      description: displayDescription(t.description, t.type) || "Transaction",
      status: displayStatus(t.status),  // Formatted status
      rawStatus: t.status || "pending",  // Original status
      accountType: t.accountType || "checking",
      isReal: true
    }));
    
    // Prepare response
    const response: DashboardResponse = {
      balances: {
        checking: Number(user.checkingBalance) || 0,
        savings: Number(user.savingsBalance) || 0,
        investment: Number(user.investmentBalance) || 0
      },
      recent: formattedTransactions,
      user: {
        name: user.name || session.user.name || "User",
        email: user.email || session.user.email || "",
        displayCurrency: user.displayCurrency || "USD"
      },
      debug: {
        totalTransactions: realTransactions.length,
        userId: user._id?.toString()
      }
    };
    
    console.log('[Dashboard API] ✅ Sending response with', formattedTransactions.length, 'transactions');
    console.log('═══════════════════════════════════════');
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error: any) {
    console.error("[Dashboard API] ❌ Error:", error);
    
    return NextResponse.json({
      balances: { checking: 0, savings: 0, investment: 0 },
      recent: [],
      user: { name: "User", email: "unknown" },
      error: "Failed to load dashboard: " + error.message
    }, { status: 200 });
  }
}