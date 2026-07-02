// src/app/api/auth/mobile/route.ts
// COPY THIS ENTIRE FILE TO YOUR WEB PROJECT

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { AUTH_SECRET } from '@/lib/authSecret';
import { check as rateCheck, ipFromHeaders, POLICIES } from '@/lib/rateLimit';
import { audit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  console.log('[Mobile Auth] POST - Login attempt');

  try {
    await dbConnect();

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const ip = ipFromHeaders(request.headers);

    // Brute-force protection: limit attempts per IP and per account.
    const [ipLimit, emailLimit] = await Promise.all([
      rateCheck(`login:ip:${ip}`, POLICIES.authLogin),
      rateCheck(`login:email:${normalizedEmail}`, POLICIES.authLogin),
    ]);

    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retryAfter = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds);
      await audit({
        action: 'auth.login_failed',
        actorEmail: normalizedEmail,
        outcome: 'blocked',
        severity: 'warning',
        details: { channel: 'mobile', reason: 'rate_limited', ip },
        request,
      });
      return NextResponse.json(
        { success: false, error: 'Too many sign-in attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      console.log('[Mobile Auth] User not found:', email);
      await audit({
        action: 'auth.login_failed',
        actorEmail: normalizedEmail,
        outcome: 'failure',
        details: { channel: 'mobile', reason: 'unknown_user' },
        request,
      });
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password.trim(), user.password);

    if (!isValid) {
      console.log('[Mobile Auth] Invalid password');
      await audit({
        action: 'auth.login_failed',
        actorId: user._id.toString(),
        actorEmail: normalizedEmail,
        outcome: 'failure',
        details: { channel: 'mobile', reason: 'bad_password' },
        request,
      });
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create JWT token with same secret
    const token = jwt.sign(
      { 
        userId: user._id.toString(),
        email: user.email,
        role: user.role || 'user'
      },
      AUTH_SECRET,
      { expiresIn: '30d' }
    );

    const nameParts = (user.name || '').split(' ');

    console.log('[Mobile Auth] Login successful:', email);

    await audit({
      action: 'auth.login',
      actorId: user._id.toString(),
      actorEmail: user.email,
      actorRole: user.role || 'user',
      outcome: 'success',
      details: { channel: 'mobile' },
      request,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        name: user.name,
        accountNumber: user.accountNumber,
        routingNumber: user.routingNumber,
        balance: user.checkingBalance || 0,
        checkingBalance: user.checkingBalance || 0,
        savingsBalance: user.savingsBalance || 0,
        investmentBalance: user.investmentBalance || 0,
        verified: user.verified,
        role: user.role || 'user',
      },
      token
    });

  } catch (error: any) {
    console.error('[Mobile Auth] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log('[Mobile Auth] GET - Verify token');
  
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    let decoded: { userId: string; email: string };
    try {
      decoded = jwt.verify(token, AUTH_SECRET) as { userId: string; email: string };
    } catch (err) {
      console.log('[Mobile Auth] Token invalid');
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const nameParts = (user.name || '').split(' ');

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        name: user.name,
        accountNumber: user.accountNumber,
        routingNumber: user.routingNumber,
        balance: user.checkingBalance || 0,
        checkingBalance: user.checkingBalance || 0,
        savingsBalance: user.savingsBalance || 0,
        investmentBalance: user.investmentBalance || 0,
        verified: user.verified,
        role: user.role || 'user',
      }
    });

  } catch (error: any) {
    console.error('[Mobile Auth] GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
