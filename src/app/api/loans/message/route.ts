import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import Loan from '@/models/Loan';

export const runtime = 'nodejs';

// POST - send a message on a loan application
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { loanId, message } = await req.json();
    if (!loanId || !message?.trim()) {
      return NextResponse.json({ error: 'Loan ID and message are required.' }, { status: 400 });
    }
    await connectDB();
    const loan = await Loan.findOne({ _id: loanId, userId: session.user.id });
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found.' }, { status: 404 });
    }
    if (!loan.messages) loan.messages = [];
    loan.messages.push({ from: 'client', message: message.trim(), sentAt: new Date(), read: false });
    await loan.save();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Loan message error:', error);
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 });
  }
}
