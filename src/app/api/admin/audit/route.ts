// src/app/api/admin/audit/route.ts
// Admin-only: read the audit trail. Supports filtering by subject
// (loan/user/transaction) and time range.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import AuditLog from '@/models/AuditLog';
import User from '@/models/User';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const me = await User.findById(session.user.id).select('role');
    if (!me || me.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const subjectType = searchParams.get('subjectType') || undefined;
    const subjectId = searchParams.get('subjectId') || undefined;
    const reference = searchParams.get('reference') || undefined;
    const event = searchParams.get('event') || undefined;
    const limit = Math.min(Number(searchParams.get('limit') || 100), 500);

    const query: Record<string, unknown> = {};
    if (subjectType) query.subjectType = subjectType;
    if (subjectId) query.subjectId = subjectId;
    if (reference) query.reference = reference;
    if (event) query.event = event;

    const logs = await AuditLog.find(query)
      .populate('actorId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('GET /api/admin/audit error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
  }
}
