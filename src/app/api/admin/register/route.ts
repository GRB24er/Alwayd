// File: src/app/api/admin/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect                    from '@/lib/mongodb';
import User                         from '@/models/User';

export async function POST(request: NextRequest) {
  const { name, email, password } = await request.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
  }

  await dbConnect();
  const existing = await User.countDocuments({ role: 'admin' });
  if (existing > 0) {
    return NextResponse.json({ error: 'Admin already registered' }, { status: 403 });
  }

  try {
    const user = new User({ name, email: email.toLowerCase(), password, role: 'admin' });
    await user.save();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Registration failed' }, { status: 500 });
  }
}
