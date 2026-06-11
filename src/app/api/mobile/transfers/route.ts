import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { sendTransactionEmail } from '@/lib/mail';

import { AUTH_SECRET } from '@/lib/authSecret';
import { check as rateCheck, POLICIES } from '@/lib/rateLimit';
import { audit } from '@/lib/audit';
import { runIdempotent } from '@/lib/idempotency';
const JWT_SECRET = AUTH_SECRET;

async function getMobileUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    return decoded;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = await getMobileUser(request);
    
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      type,
      fromAccount = 'checking',
      toAccount,
      recipientAccount,
      recipientName,
      recipientBank,
      recipientRoutingNumber,
      swiftCode,
      country,
      amount,
      description
    } = body;

    const transferAmount = Math.abs(Number(amount));

    if (isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Velocity limit: cap transfer initiations per user.
    const rate = await rateCheck(`transfer:user:${decoded.userId}`, POLICIES.transferInitiate);
    if (!rate.allowed) {
      await audit({
        action: 'rate_limit.exceeded',
        actorId: decoded.userId,
        actorEmail: decoded.email,
        outcome: 'blocked',
        severity: 'warning',
        details: { channel: 'mobile', endpoint: 'mobile/transfers' },
        request,
      });
      return NextResponse.json(
        { success: false, error: 'Transfer limit reached. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      );
    }

    // Replay protection: cache responses by Idempotency-Key so a retry
    // (network blip, double-tap) can't book the same transfer twice.
    return runIdempotent({
      request,
      endpoint: 'mobile/transfers',
      userId: decoded.userId,
      body,
      optional: true,
      handler: () =>
        executeTransfer({
          request, user, type, fromAccount, toAccount, recipientAccount,
          recipientName, recipientBank, recipientRoutingNumber, swiftCode,
          country, transferAmount, description,
        }),
    });

  } catch (error) {
    console.error('Mobile transfer error:', error);
    return NextResponse.json(
      { success: false, error: 'Transfer failed' },
      { status: 500 }
    );
  }
}

async function executeTransfer({
  request, user, type, fromAccount, toAccount, recipientAccount,
  recipientName, recipientBank, recipientRoutingNumber, swiftCode,
  country, transferAmount, description,
}: {
  request: NextRequest;
  user: any;
  type: string;
  fromAccount: string;
  toAccount?: string;
  recipientAccount?: string;
  recipientName?: string;
  recipientBank?: string;
  recipientRoutingNumber?: string;
  swiftCode?: string;
  country?: string;
  transferAmount: number;
  description?: string;
}) {
  try {
    const balanceField = `${fromAccount}Balance`;
    const currentBalance = (user as any)[balanceField] || 0;

    if (transferAmount > currentBalance) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient funds',
          available: currentBalance,
          requested: transferAmount
        },
        { status: 400 }
      );
    }

    // Duplicate-submission guard: an identical pending transfer created in
    // the last 60s is almost certainly a double-tap, not a new instruction.
    const duplicate = await Transaction.findOne({
      userId: user._id,
      type: 'transfer-out',
      amount: transferAmount,
      accountType: fromAccount,
      status: 'pending',
      'metadata.transferType': type,
      ...(recipientAccount ? { 'metadata.recipientAccount': recipientAccount } : {}),
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) },
    }).lean();

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          error: 'A matching transfer was just submitted. If this is a separate payment, please wait a minute and try again.',
          reference: (duplicate as any).reference,
        },
        { status: 409 }
      );
    }

    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    let reference = '';
    let origin = '';
    let transferType = '';

    switch (type) {
      case 'internal':
        reference = `INT-${timestamp}-${random}`;
        origin = 'internal_transfer';
        transferType = 'transfer-out';
        break;
      case 'external':
        reference = `EXT-${timestamp}-${random}`;
        origin = 'external_transfer';
        transferType = 'transfer-out';
        break;
      case 'wire':
        reference = `WIRE-${timestamp}-${random}`;
        origin = 'wire_transfer';
        transferType = 'transfer-out';
        break;
      case 'international':
        reference = `INTL-${timestamp}-${random}`;
        origin = 'international_transfer';
        transferType = 'transfer-out';
        break;
      default:
        reference = `TRF-${timestamp}-${random}`;
        origin = 'mobile_transfer';
        transferType = 'transfer-out';
    }

    const transaction = await Transaction.create({
      userId: user._id,
      type: transferType,
      currency: 'USD',
      amount: transferAmount,
      description: description || `${type} transfer`,
      status: 'pending',
      accountType: fromAccount,
      posted: false,
      postedAt: null,
      reference,
      channel: 'mobile',
      origin,
      date: new Date(),
      metadata: {
        transferType: type,
        fromAccount,
        toAccount,
        recipientAccount,
        recipientName,
        recipientBank,
        recipientRoutingNumber,
        swiftCode,
        country,
        initiatedVia: 'mobile_app'
      }
    });

    if (type === 'internal' && toAccount) {
      await Transaction.create({
        userId: user._id,
        type: 'transfer-in',
        currency: 'USD',
        amount: transferAmount,
        description: description || `Transfer from ${fromAccount}`,
        status: 'pending',
        accountType: toAccount,
        posted: false,
        postedAt: null,
        reference: `${reference}-IN`,
        channel: 'mobile',
        origin,
        date: new Date(),
        metadata: {
          linkedReference: reference,
          fromAccount,
          toAccount,
          initiatedVia: 'mobile_app'
        }
      });
    }

    try {
      await sendTransactionEmail(user.email, {
        name: user.name || 'Customer',
        transaction,
        subject: `Transfer Initiated - ${reference}`
      });
    } catch (emailError) {
      console.error('Email failed:', emailError);
    }

    await audit({
      action: type === 'internal' ? 'transfer.internal.initiated' : 'transfer.wire.initiated',
      actorId: user._id.toString(),
      actorEmail: user.email,
      resourceId: reference,
      outcome: 'success',
      details: {
        channel: 'mobile',
        transferType: type,
        amount: transferAmount,
        fromAccount,
        toAccount,
        recipientName,
      },
      request,
    });

    return NextResponse.json({
      success: true,
      message: 'Transfer initiated. Awaiting approval.',
      reference,
      transfer: {
        id: transaction._id.toString(),
        reference,
        type,
        amount: transferAmount,
        status: 'pending',
        fromAccount,
        toAccount,
        recipientName,
        date: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Mobile transfer error:', error);
    return NextResponse.json(
      { success: false, error: 'Transfer failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const decoded = await getMobileUser(request);
    
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (reference) {
      const transaction = await Transaction.findOne({
        userId: decoded.userId,
        reference: { $regex: new RegExp(`^${reference}`) }
      }).lean();

      if (!transaction) {
        return NextResponse.json(
          { success: false, error: 'Transfer not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        transfer: {
          _id: (transaction as any)._id.toString(),
          reference: (transaction as any).reference,
          type: (transaction as any).type,
          amount: (transaction as any).amount,
          status: (transaction as any).status,
          date: (transaction as any).date,
          posted: (transaction as any).posted,
        }
      });
    }

    const transfers = await Transaction.find({
      userId: decoded.userId,
      type: { $in: ['transfer-out', 'transfer-in'] }
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      transfers: (transfers as any[]).map(tx => ({
        _id: tx._id.toString(),
        reference: tx.reference,
        type: tx.type,
        amount: tx.amount,
        status: tx.status,
        date: tx.date || tx.createdAt,
        accountType: tx.accountType,
        origin: tx.origin,
      }))
    });

  } catch (error) {
    console.error('Get transfers error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transfers' },
      { status: 500 }
    );
  }
}