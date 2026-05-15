// src/app/api/admin/transfers/route.ts
// Get all transfers for admin management

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const adminUser = await User.findOne({ email: session.user.email });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';

    // Build query
    let query: any = {
      type: { $in: ['transfer-out', 'wire-transfer', 'international-transfer'] },
      origin: { $in: ['external_transfer', 'wire_transfer', 'international_transfer', 'p2p_transfer'] }
    };

    if (filter === 'pending') {
      query.status = 'pending';
      query['metadata.verificationCode'] = { $exists: false };
    } else if (filter === 'verification') {
      query.status = 'pending';
      query['metadata.verificationCode'] = { $exists: true };
    } else if (filter === 'completed') {
      query.status = { $in: ['completed', 'rejected'] };
    }

    const transfers = await Transaction.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json({
      success: true,
      transfers,
      count: transfers.length
    });

  } catch (error: any) {
    console.error('[Admin Transfers] Error:', error);
    return NextResponse.json(
      { success: false, error: "Failed to load transfers" },
      { status: 500 }
    );
  }
}