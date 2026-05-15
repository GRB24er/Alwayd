import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { snapshotFromUser } from '@/lib/accounts';

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await context.params;
    const user: any = await User.findById(id).lean();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const snap = snapshotFromUser(user);
    return NextResponse.json({
      userId: String(user._id),
      legacy: { balance: user.balance ?? 0, btcBalance: user.btcBalance ?? 0 },
      rollups: {
        checkingUSD: user.checkingUSD ?? null,
        checkingBTC: user.checkingBTC ?? null,
        savingsUSD: user.savingsUSD ?? null,
        savingsBTC: user.savingsBTC ?? null,
        investmentUSD: user.investmentUSD ?? null,
        investmentBTC: user.investmentBTC ?? null,
      },
      snapshot: snap,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}
