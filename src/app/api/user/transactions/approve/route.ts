// src/app/api/transactions/approve/route.ts
// ADMIN APPROVAL - WHERE BALANCES GET UPDATED

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { sendTransactionEmail } from '@/lib/mail';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const body = await req.json();
    const { 
      transactionId,
      action, // 'approve' or 'reject'
      adminNotes,
      adminId 
    } = body;
    
    console.log('[Approval] Processing:', { transactionId, action, adminId });
    
    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }
    
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    if (transaction.status !== 'pending') {
      return NextResponse.json(
        { error: `Transaction already ${transaction.status}` },
        { status: 400 }
      );
    }
    
    const user = await User.findById(transaction.userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    if (action === 'approve') {
      console.log('[Approval] ✅ Approving transaction');
      
      // Update transaction status to 'approved'
      // The Transaction model middleware will automatically:
      // 1. Update the user's balance
      // 2. Mark posted = true
      transaction.status = 'approved';
      transaction.reviewedBy = adminId ? new mongoose.Types.ObjectId(adminId) : null;
      transaction.reviewedAt = new Date();
      
      if (adminNotes) {
        if (!transaction.metadata) transaction.metadata = {};
        transaction.metadata.adminNotes = adminNotes;
      }
      
      await transaction.save();
      
      // Get updated user with new balance
      const updatedUser = await User.findById(user._id);
      const balanceField = transaction.accountType === 'savings' 
        ? 'savingsBalance' 
        : transaction.accountType === 'investment' 
        ? 'investmentBalance' 
        : 'checkingBalance';
      
      const newBalance = updatedUser ? (updatedUser as any)[balanceField] : 0;
      
      console.log('[Approval] ✅ Transaction approved, balance updated to:', newBalance);
      
      // ✅ SEND EMAIL - Transaction Approved
      try {
        if (user.email) {
          await sendTransactionEmail(user.email, {
            name: user.name,
            transaction: transaction
          });
          console.log(`[Approval] ✅ Email sent to: ${user.email}`);
        }
      } catch (emailError) {
        console.error('[Approval] ❌ Email failed:', emailError);
        // Continue even if email fails
      }
      
      return NextResponse.json({
        success: true,
        message: 'Transaction approved successfully',
        transaction: {
          _id: transaction._id,
          status: 'approved',
          amount: transaction.amount,
          type: transaction.type,
          newBalance: newBalance,
          approvedAt: transaction.reviewedAt,
          posted: transaction.posted
        }
      });
      
    } else {
      // REJECT
      console.log('[Approval] ❌ Rejecting transaction');
      
      transaction.status = 'rejected';
      transaction.reviewedBy = adminId ? new mongoose.Types.ObjectId(adminId) : null;
      transaction.reviewedAt = new Date();
      
      if (adminNotes) {
        if (!transaction.metadata) transaction.metadata = {};
        transaction.metadata.adminNotes = adminNotes;
      }
      
      await transaction.save();
      
      console.log('[Approval] ❌ Transaction rejected');
      
      // ✅ SEND EMAIL - Transaction Rejected
      if (user.email) {
        try {
          await sendTransactionEmail(user.email, {
            name: user.name,
            transaction: transaction
          });
          console.log(`[Approval] ✅ Rejection email sent to: ${user.email}`);
        } catch (emailError) {
          console.error('[Approval] ❌ Email failed:', emailError);
        }
      }
      
      return NextResponse.json({
        success: true,
        message: 'Transaction rejected',
        transaction: {
          _id: transaction._id,
          status: 'rejected',
          rejectedAt: transaction.reviewedAt
        }
      });
    }
    
  } catch (error) {
    console.error('[Approval] ❌ Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to process transaction',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get('id');
    
    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }
    
    const transaction = await Transaction.findById(transactionId)
      .populate('userId', 'name email accountNumber');
    
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      transaction: transaction
    });
    
  } catch (error) {
    console.error('[Approval] ❌ GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction details' },
      { status: 500 }
    );
  }
}