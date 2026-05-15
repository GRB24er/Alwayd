// app/api/mobile/deposits/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import clientPromise from '@/lib/mongodb';

export const runtime = 'nodejs';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  'b3bc4dcf9055e490cef86fd9647fc8acd61d6bbe07dfb85fb6848bfe7f4f3926';

async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
  } catch {
    return null;
  }
}

/**
 * IMPORTANT FIX:
 * Some mongodb helpers return MongoClient, others return Db.
 * If you call `.db()` on a Db, you get: ".db is not a function".
 */
async function getDb() {
  const mongo = await clientPromise;

  // If mongo has a .db() function, it's a MongoClient
  if (mongo && typeof (mongo as any).db === 'function') {
    const dbName = process.env.MONGODB_DB; // optional
    return dbName ? (mongo as any).db(dbName) : (mongo as any).db();
  }

  // Otherwise assume mongo already IS the Db instance
  return mongo as any;
}

// GET /api/mobile/deposits - Get user's deposit history
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();

    const user = await db.collection('users').findOne({ email: auth.email });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const deposits = await db
      .collection('deposits')
      .find({ userId: user._id.toString() })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      success: true,
      deposits: deposits.map((d: any) => ({
        _id: d._id.toString(),
        amount: d.amount,
        accountType: d.accountType,
        status: d.status,
        checkFrontImage: d.checkFrontImage ? true : false,
        checkBackImage: d.checkBackImage ? true : false,
        reference: d.reference,
        createdAt: d.createdAt,
        reviewedAt: d.reviewedAt,
        reviewNote: d.reviewNote,
      })),
    });
  } catch (error: any) {
    console.error('Deposits fetch error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch deposits' },
      { status: 500 }
    );
  }
}

// POST /api/mobile/deposits - Submit new check deposit
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();

    const user = await db.collection('users').findOne({ email: auth.email });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { amount, accountType, checkFrontImage, checkBackImage } = body;

    // DEBUG + SAFETY: log payload sizes
    const frontLen = typeof checkFrontImage === 'string' ? checkFrontImage.length : 0;
    const backLen = typeof checkBackImage === 'string' ? checkBackImage.length : 0;

    console.log('[mobile/deposits] payload', {
      amount,
      accountType,
      frontLen,
      backLen,
    });

    // SAFETY: reject overly large payloads
    const MAX_B64_LEN = 6_000_000;
    if (frontLen > MAX_B64_LEN || backLen > MAX_B64_LEN) {
      return NextResponse.json(
        { success: false, error: 'Image too large. Please retake photo closer and ensure good lighting.' },
        { status: 413 }
      );
    }

    // Normalize: strip prefix
    const normalizedFront =
      typeof checkFrontImage === 'string'
        ? checkFrontImage.replace(/^data:image\/\w+;base64,/, '')
        : checkFrontImage;

    const normalizedBack =
      typeof checkBackImage === 'string'
        ? checkBackImage.replace(/^data:image\/\w+;base64,/, '')
        : checkBackImage;

    // Validation
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 });
    }

    if (!normalizedFront || !normalizedBack) {
      return NextResponse.json(
        { success: false, error: 'Both front and back check images are required' },
        { status: 400 }
      );
    }

    if (!['checking', 'savings'].includes(accountType)) {
      return NextResponse.json({ success: false, error: 'Invalid account type' }, { status: 400 });
    }

    const reference = `DEP${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const deposit = {
      userId: user._id.toString(),
      userEmail: user.email,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'Unknown',
      amount: Number(amount),
      accountType,
      checkFrontImage: normalizedFront,
      checkBackImage: normalizedBack,
      status: 'pending',
      reference,
      createdAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      reviewNote: null,
    };

    const result = await db.collection('deposits').insertOne(deposit);

    await db.collection('transactions').insertOne({
      userId: user._id.toString(),
      type: 'deposit',
      subType: 'check_deposit',
      amount: Number(amount),
      description: `Mobile Check Deposit - ${reference}`,
      accountType,
      status: 'pending',
      reference,
      depositId: result.insertedId.toString(),
      posted: false,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Check deposit submitted for review',
      deposit: {
        _id: result.insertedId.toString(),
        reference,
        amount: Number(amount),
        accountType,
        status: 'pending',
        createdAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error('Deposit submit error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to submit deposit' },
      { status: 500 }
    );
  }
}
