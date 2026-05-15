// FILE: src/app/api/transactions/recurring/route.ts
// COMPLETE FIXED VERSION - WITH EMAIL

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { sendTransactionEmail } from '@/lib/mail';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, amount, interval, description } = await request.json();
    
    if (!['debit', 'credit'].includes(type) || !['daily', 'weekly', 'monthly'].includes(interval)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // ALWAYS POSITIVE AMOUNT
    const recurringAmount = Math.abs(Number(amount));
    if (recurringAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    await connectDB();
    
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Add recurring transaction
    if (!user.recurring) {
      (user as any).recurring = [];
    }

    (user as any).recurring.push({
      type,
      amount: recurringAmount, // POSITIVE
      interval,
      description: description || `${type} scheduled transaction`,
      lastRun: null,
      createdAt: new Date()
    });

    await user.save();

    // ✅ SEND EMAIL
    try {
      await sendTransactionEmail(user.email, {
        name: user.name || 'Customer',
        transaction: {
          _id: 'recurring-' + Date.now(),
          type: 'recurring-setup',
          description: `Recurring ${type} scheduled: ${description || 'Automated transaction'}`,
          amount: recurringAmount,
          status: 'scheduled',
          date: new Date(),
          reference: `REC-${Date.now()}`,
          currency: 'USD',
          accountType: 'checking',
          posted: false
        } as any
      });
      console.log('✅ Recurring transaction email sent');
    } catch (emailError) {
      console.error('❌ Email failed:', emailError);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Recurring transaction created successfully',
      recurring: {
        type,
        amount: recurringAmount,
        interval,
        description
      }
    }, { status: 201 });
    
  } catch (err: any) {
    console.error('Recurring transaction error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create recurring transaction' }, { status: 500 });
  }
}