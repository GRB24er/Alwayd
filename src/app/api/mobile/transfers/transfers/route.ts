// src/app/api/mobile/transfers/route.ts
// COPY THIS ENTIRE FILE TO YOUR WEB PROJECT

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';

// SAME SECRET AS YOUR authOptions.ts
const AUTH_SECRET = 'b3bc4dcf9055e490cef86fd9647fc8acd61d6bbe07dfb85fb6848bfe7f4f3926';

async function verifyMobileToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, AUTH_SECRET) as { userId: string; email: string };
    return decoded;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  console.log('[Mobile Transfers] POST request');
  
  try {
    const decoded = await verifyMobileToken(request);
    
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

    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    let reference = '';
    let origin = '';
    let transferType = 'transfer-out';

    switch (type) {
      case 'internal':
        reference = `INT-${timestamp}-${random}`;
        origin = 'internal_transfer';
        break;
      case 'external':
        reference = `EXT-${timestamp}-${random}`;
        origin = 'external_transfer';
        break;
      case 'wire':
        reference = `WIRE-${timestamp}-${random}`;
        origin = 'wire_transfer';
        break;
      case 'international':
        reference = `INTL-${timestamp}-${random}`;
        origin = 'international_transfer';
        break;
      default:
        reference = `TRF-${timestamp}-${random}`;
        origin = 'mobile_transfer';
    }

    // Create outgoing transaction
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

    // For internal transfers, create the incoming transaction too
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

    console.log('[Mobile Transfers] Transfer created:', reference);

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

  } catch (error: any) {
    console.error('[Mobile Transfers] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Transfer failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log('[Mobile Transfers] GET request');
  
  try {
    const decoded = await verifyMobileToken(request);
    
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

  } catch (error: any) {
    console.error('[Mobile Transfers] GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transfers' },
      { status: 500 }
    );
  }
}
