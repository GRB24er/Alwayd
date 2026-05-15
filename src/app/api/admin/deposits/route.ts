// app/api/admin/deposits/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

// GET /api/admin/deposits - Get all pending deposits for admin
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || !['admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database not ready' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const query: any = {};
    if (status !== 'all') {
      query.status = status;
    }

    const deposits = await db.collection('deposits')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json({
      success: true,
      deposits: deposits.map((d: any) => ({
        _id: d._id.toString(),
        userId: d.userId,
        userEmail: d.userEmail,
        userName: d.userName,
        amount: d.amount,
        accountType: d.accountType,
        status: d.status,
        reference: d.reference,
        checkFrontImage: d.checkFrontImage,
        checkBackImage: d.checkBackImage,
        createdAt: d.createdAt,
        reviewedAt: d.reviewedAt,
        reviewedBy: d.reviewedBy,
        reviewNote: d.reviewNote,
      })),
    });

  } catch (error) {
    console.error('Admin deposits fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch deposits' }, { status: 500 });
  }
}