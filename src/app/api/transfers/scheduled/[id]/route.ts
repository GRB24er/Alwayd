// src/app/api/transfers/scheduled/[id]/route.ts
// PATCH (pause/resume/update) and DELETE for a single scheduled transfer

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import mongoose from "mongoose";

const scheduledTransferSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  fromAccount: { type: String, enum: ['checking', 'savings', 'investment'], required: true },
  toAccount: { type: String, required: true },
  toAccountType: { type: String, enum: ['internal', 'external'], required: true },
  amount: { type: Number, required: true, min: 0.01 },
  frequency: { type: String, enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually'], required: true },
  startDate: { type: Date, required: true },
  endDate: Date,
  nextExecutionDate: { type: Date, required: true },
  lastExecutionDate: Date,
  status: { type: String, enum: ['active', 'paused', 'completed', 'cancelled'], default: 'active' },
  executedCount: { type: Number, default: 0 },
  totalTransferred: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  memo: String,
  externalAccountDetails: {
    bankName: String,
    accountNumber: String,
    routingNumber: String,
    accountHolderName: String
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ScheduledTransfer =
  mongoose.models.ScheduledTransfer ||
  mongoose.model('ScheduledTransfer', scheduledTransferSchema);

async function loadOwnedTransfer(id: string, userEmail: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return { error: 'Invalid id', status: 400 as const };

  const user = await User.findOne({ email: userEmail });
  if (!user) return { error: 'User not found', status: 404 as const };

  const transfer = await ScheduledTransfer.findById(id);
  if (!transfer) return { error: 'Scheduled transfer not found', status: 404 as const };

  if (transfer.userId.toString() !== user._id.toString()) {
    return { error: 'Forbidden', status: 403 as const };
  }

  return { transfer };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    await connectDB();

    const result = await loadOwnedTransfer(id, session.user.email);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const transfer = result.transfer;

    if (body.status !== undefined) {
      const allowed = ['active', 'paused', 'completed', 'cancelled'];
      if (!allowed.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      transfer.status = body.status;
    }
    if (body.name !== undefined) transfer.name = body.name;
    if (body.memo !== undefined) transfer.memo = body.memo;
    if (body.endDate !== undefined) transfer.endDate = body.endDate ? new Date(body.endDate) : null;
    transfer.updatedAt = new Date();

    await transfer.save();

    return NextResponse.json({ success: true, transfer });
  } catch (error: any) {
    console.error('Scheduled transfer PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update scheduled transfer' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await connectDB();

    const result = await loadOwnedTransfer(id, session.user.email);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await result.transfer.deleteOne();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Scheduled transfer DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete scheduled transfer' }, { status: 500 });
  }
}
