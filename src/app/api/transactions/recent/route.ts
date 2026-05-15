// src/app/api/transactions/recent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession }     from 'next-auth/next';
import { authOptions }          from '@/lib/authOptions';
import { db }                   from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url   = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit')  || '10', 10);
  const page  = parseInt(url.searchParams.get('page')   || '1',  10);

  try {
    const transactions = await db.getTransactions(session.user.id, { limit, page });
    return NextResponse.json({ transactions }, { status: 200 });
  } catch (err: any) {
    console.error('Recent fetch error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
