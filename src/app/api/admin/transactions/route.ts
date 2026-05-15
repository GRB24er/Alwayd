// src/app/api/admin/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transaction from '@/models/Transaction';

// GET - Get all transactions for admin
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100'); // Increased default limit
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    
    // Build filter object
    const filter: any = {};
    
    // Only add status filter if explicitly provided and not 'all'
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (userId) {
      filter.userId = userId;
    }
    
    console.log('Admin Transactions API - Filter:', filter);
    console.log('Admin Transactions API - Pagination:', { page, limit });
    
    // Calculate skip for pagination
    const skip = (page - 1) * limit;
    
    // Get total count BEFORE applying limit
    const totalTransactions = await Transaction.countDocuments(filter);
    console.log('Admin Transactions API - Total count:', totalTransactions);
    
    // Fetch transactions with user details
    const transactions = await Transaction.find(filter)
      .populate('userId', 'name email checkingBalance savingsBalance investmentBalance')
      .sort({ createdAt: -1, date: -1 }) // Most recent first
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean() for better performance
    
    console.log('Admin Transactions API - Fetched:', transactions.length);
    
    // Get status breakdown for debugging
    const allTransactions = await Transaction.find({}).select('status').lean();
    const statusBreakdown = allTransactions.reduce((acc: any, tx: any) => {
      acc[tx.status] = (acc[tx.status] || 0) + 1;
      return acc;
    }, {});
    console.log('Admin Transactions API - Status breakdown:', statusBreakdown);
    
    const totalPages = Math.ceil(totalTransactions / limit);
    
    return NextResponse.json({
      success: true,
      transactions: transactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalTransactions,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      },
      statusBreakdown, // Include this for debugging
      message: `Fetched ${transactions.length} of ${totalTransactions} total transactions`
    });
    
  } catch (error: any) {
    console.error('Admin Transactions API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch transactions',
        details: error.message,
        transactions: []
      },
      { status: 500 }
    );
  }
}

// POST - Create new transaction
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    
    // Ensure status is set correctly
    const transaction = new Transaction({
      userId: body.userId,
      amount: body.amount,
      type: body.type,
      description: body.description,
      status: body.status || 'pending', // Default to pending
      accountType: body.accountType || 'checking',
      reference: body.reference || `TXN-${Date.now()}`,
      date: body.date || new Date(),
      currency: body.currency || 'USD'
    });
    
    await transaction.save();
    
    console.log('Created new transaction:', transaction);
    
    return NextResponse.json({
      success: true,
      message: 'Transaction created successfully',
      transaction
    });
    
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create transaction',
        details: error.message
      },
      { status: 500 }
    );
  }
}
