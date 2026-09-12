// File: src/app/api/transactions/statement/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { db } from '@/lib/mongodb';
import type { ITransaction } from '@/types/transaction'; // transaction shape :contentReference[oaicite:0]{index=0}

export async function GET(request: NextRequest) {
  // 1) Ensure user is authenticated
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2) Parse optional date filters from query string
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.has('startDate')
    ? new Date(searchParams.get('startDate')!)
    : undefined;
  const endDate = searchParams.has('endDate')
    ? new Date(searchParams.get('endDate')!)
    : undefined;

  // 3) Fetch and cast transactions array
  const transactions = (await db.getTransactions(
    session.user.id,
    { startDate, endDate, limit: 100 }
  )) as ITransaction[];

  // 4) Compute total inflow (deposits & credits)
  const inflow = transactions
    .filter((t: ITransaction) => ['deposit', 'credit'].includes(t.type))
    .reduce<number>(
      (sum: number, t: ITransaction) => sum + t.amount,
      0
    );

  // 5) Compute total outflow (withdrawals, debits & transfers)
  const outflow = transactions
    .filter((t: ITransaction) =>
      ['withdrawal', 'debit', 'transfer'].includes(t.type)
    )
    .reduce<number>(
      (sum: number, t: ITransaction) => sum + t.amount,
      0
    );

  // 6) Return the raw list plus totals
  return NextResponse.json({ transactions, inflow, outflow });
}
