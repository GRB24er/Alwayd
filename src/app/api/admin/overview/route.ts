import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { snapshotFromUser } from '@/lib/accounts'; 

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)));
    const query = (searchParams.get('query') || '').trim();

    const userFilter: any = {};
    if (query) {
      userFilter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ];
    }

    const [totalUsers, users] = await Promise.all([
      User.countDocuments(userFilter),
      User.find(userFilter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
    ]);

    const pendingCount = await Transaction.countDocuments({ status: 'pending' });

    const recent = await Transaction.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const usersOut = users.map((u: any) => {
      const accounts = snapshotFromUser(u);
      return {
        _id: String(u._id),
        name: u.name || '—',
        email: u.email || '—',
        verified: !!u.verified,
        accounts,
      };
    });

    const stats = {
      totalUsers,
      pendingTransactions: pendingCount,
    };

    return NextResponse.json({
      page,
      pageSize,
      totalUsers,
      stats,
      users: usersOut,
      recentTransactions: recent,
    });
  } catch (err: any) {
    console.error('Admin overview error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to load overview' }, { status: 500 });
  }
}
