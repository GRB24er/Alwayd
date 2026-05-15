// app/api/admin/deposits/[depositId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

// POST /api/admin/deposits/[depositId] - Approve or reject deposit
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ depositId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || !['admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { depositId } = await params;
    const body = await request.json();
    const { action, note } = body; // action: 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    if (!ObjectId.isValid(depositId)) {
      return NextResponse.json({ success: false, error: 'Invalid deposit ID' }, { status: 400 });
    }

    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database not ready' }, { status: 503 });
    }

    // Find the deposit
    const deposit = await db.collection('deposits').findOne({ _id: new ObjectId(depositId) });
    if (!deposit) {
      return NextResponse.json({ success: false, error: 'Deposit not found' }, { status: 404 });
    }

    if (deposit.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Deposit already processed' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update deposit status
    await db.collection('deposits').updateOne(
      { _id: new ObjectId(depositId) },
      {
        $set: {
          status: newStatus,
          reviewedAt: new Date(),
          reviewedBy: session.user.email,
          reviewNote: note || null,
        },
      }
    );

    // Update the transaction
    await db.collection('transactions').updateOne(
      { depositId: depositId },
      {
        $set: {
          status: action === 'approve' ? 'completed' : 'rejected',
          posted: action === 'approve',
          processedAt: new Date(),
        },
      }
    );

    // If approved, credit the user's balance
    if (action === 'approve') {
      const balanceField = deposit.accountType === 'savings' ? 'savingsBalance' : 'checkingBalance';
      
      await db.collection('users').updateOne(
        { _id: new ObjectId(deposit.userId) },
        {
          $inc: { [balanceField]: deposit.amount },
        }
      );

      // Log the action
      await db.collection('auditLogs').insertOne({
        action: 'DEPOSIT_APPROVED',
        depositId: depositId,
        userId: deposit.userId,
        amount: deposit.amount,
        accountType: deposit.accountType,
        performedBy: session.user.email,
        note: note || null,
        createdAt: new Date(),
      });
    } else {
      // Log rejection
      await db.collection('auditLogs').insertOne({
        action: 'DEPOSIT_REJECTED',
        depositId: depositId,
        userId: deposit.userId,
        amount: deposit.amount,
        reason: note || 'No reason provided',
        performedBy: session.user.email,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Deposit ${newStatus} successfully`,
      status: newStatus,
    });

  } catch (error) {
    console.error('Deposit review error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process deposit' }, { status: 500 });
  }
}