// src/app/api/verify-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  await dbConnect();
  
  try {
    const { email, password } = await request.json();
    // Add .select('+password') to include the password field
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return NextResponse.json(
        { valid: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    const valid = await bcrypt.compare(password, user.password);
    return NextResponse.json({ valid });
  } catch (error) {
    console.error('Password verification error:', error);
    return NextResponse.json(
      { valid: false, message: 'Server error' },
      { status: 500 }
    );
  }
}