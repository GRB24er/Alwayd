// File: src/app/api/admin/user/[id]/statement/route.ts

import { NextRequest, NextResponse }    from 'next/server';
import { getServerSession }             from 'next-auth';
import { authOptions }                  from '@/lib/authOptions';
import dbConnect                        from '@/lib/mongodb';
import User                             from '@/models/User';
import TransactionModel                 from '@/models/Transaction';
import { sendBankStatementEmail }       from '@/lib/mail';

export async function POST(
  request: NextRequest,
  context: any    // ← accept context as any to satisfy Next.js ParamCheck
) {
  // 1) Auth guard: only admins
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2) Connect to DB
  await dbConnect();

  // 3) Extract user ID from route
  const userId: string = context.params.id;

  // 4) Load the user
  const user = await User.findById(userId).lean();
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // 5) Fetch their standalone transactions
  const txs = await TransactionModel.find({ userId })
    .sort({ date: -1 })
    .lean();

  // 6) Send the statement email
  try {
    await sendBankStatementEmail(user.email, txs);
  } catch (err: any) {
    console.error('❌ Failed to send statement email:', err);
    return NextResponse.json({ error: 'Failed to send statement' }, { status: 500 });
  }

  // 7) Return success
  return NextResponse.json({ success: true });
}
