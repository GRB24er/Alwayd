// FILE: src/app/api/transactions/transfer/route.ts
// ALL TRANSFERS REQUIRE ADMIN APPROVAL
// Creates PENDING transactions - balances update only when admin approves

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { sendTransactionEmail } from '@/lib/mail';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      toEmail,
      toAccountNumber,
      toRoutingNumber,
      amount,
      currency = 'USD',
      description = 'Transfer',
      accountType = 'checking'
    } = await request.json();

    // ALWAYS POSITIVE AMOUNT
    const transferAmount = Math.abs(Number(amount));
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    await connectDB();

    // Find sender
    const sender = await User.findOne({ email: session.user.email });
    if (!sender) {
      return NextResponse.json({ error: 'Sender not found' }, { status: 404 });
    }

    // Find recipient
    let recipient = null;
    if (toEmail) {
      recipient = await User.findOne({ email: toEmail });
    }
    if (!recipient && toAccountNumber && toRoutingNumber) {
      recipient = await User.findOne({ 
        accountNumber: toAccountNumber, 
        routingNumber: toRoutingNumber 
      });
    }
    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    // Prevent self-transfer through this endpoint
    if (sender._id.toString() === recipient._id.toString()) {
      return NextResponse.json({ 
        error: 'Cannot transfer to yourself. Use internal transfer instead.' 
      }, { status: 400 });
    }

    // Check sender balance (validation only - NOT deducting yet)
    const senderBalanceField = accountType === 'savings' 
      ? 'savingsBalance' 
      : accountType === 'investment' 
      ? 'investmentBalance' 
      : 'checkingBalance';

    const senderBalance = (sender as any)[senderBalanceField] || 0;
    if (transferAmount > senderBalance) {
      return NextResponse.json({ 
        error: 'Insufficient funds',
        available: senderBalance,
        requested: transferAmount
      }, { status: 400 });
    }

    // Generate unique reference
    const transferRef = `TRF-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    console.log('[P2P Transfer] Creating pending transactions:', {
      sender: sender.email,
      recipient: recipient.email,
      amount: transferAmount,
      reference: transferRef
    });

    // =====================================================
    // CREATE PENDING TRANSACTIONS - NO BALANCE CHANGES YET
    // Admin will approve both, then balances update
    // =====================================================

    // Create DEBIT transaction (sender) - PENDING
    const debitTx = await Transaction.create({
      userId: sender._id,
      type: 'transfer-out',
      amount: transferAmount,
      description: `Transfer to ${recipient.name}${description ? ': ' + description : ''}`,
      currency,
      status: 'pending', // PENDING - awaits admin approval
      accountType,
      posted: false, // NOT posted yet
      postedAt: null,
      date: new Date(),
      reference: `${transferRef}-OUT`,
      channel: 'online',
      origin: 'p2p_transfer',
      metadata: {
        recipientId: recipient._id.toString(),
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        linkedReference: `${transferRef}-IN`,
        isP2PTransfer: true
      }
    });

    console.log('[P2P Transfer] Debit transaction created:', debitTx._id);

    // Create CREDIT transaction (recipient) - PENDING
    const creditTx = await Transaction.create({
      userId: recipient._id,
      type: 'transfer-in',
      amount: transferAmount,
      description: `Transfer from ${sender.name}${description ? ': ' + description : ''}`,
      currency,
      status: 'pending', // PENDING - awaits admin approval
      accountType: 'checking', // Credits go to recipient's checking
      posted: false, // NOT posted yet
      postedAt: null,
      date: new Date(),
      reference: `${transferRef}-IN`,
      channel: 'online',
      origin: 'p2p_transfer',
      metadata: {
        senderId: sender._id.toString(),
        senderEmail: sender.email,
        senderName: sender.name,
        linkedReference: `${transferRef}-OUT`,
        isP2PTransfer: true
      }
    });

    console.log('[P2P Transfer] Credit transaction created:', creditTx._id);

    // =====================================================
    // SEND NOTIFICATION EMAILS (transfer initiated, pending)
    // =====================================================
    try {
      // Email to sender
      await sendTransactionEmail(sender.email, {
        name: sender.name || 'Customer',
        transaction: debitTx,
        subject: 'Transfer Initiated - Pending Approval'
      });
      
      // Email to recipient
      await sendTransactionEmail(recipient.email, {
        name: recipient.name || 'Customer',
        transaction: creditTx,
        subject: 'Incoming Transfer - Pending Approval'
      });
      
      console.log('[P2P Transfer] Notification emails sent');
    } catch (emailError) {
      console.error('[P2P Transfer] Email failed:', emailError);
      // Continue even if email fails
    }

    console.log('[P2P Transfer] Transfer created successfully (pending approval)');

    return NextResponse.json({ 
      success: true,
      message: 'Transfer initiated. Awaiting admin approval.',
      transfer: {
        reference: transferRef,
        amount: transferAmount,
        currency,
        from: {
          name: sender.name,
          email: sender.email
        },
        to: {
          name: recipient.name,
          email: recipient.email
        },
        status: 'pending',
        date: new Date().toISOString()
      },
      transactions: [
        {
          id: debitTx._id,
          type: 'transfer-out',
          reference: debitTx.reference,
          status: 'pending'
        },
        {
          id: creditTx._id,
          type: 'transfer-in', 
          reference: creditTx.reference,
          status: 'pending'
        }
      ]
    });

  } catch (err: any) {
    console.error('[P2P Transfer] Error:', err);
    return NextResponse.json({ 
      error: err.message || 'Transfer failed' 
    }, { status: 500 });
  }
}