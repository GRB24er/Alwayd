// src/app/api/admin/user/[id]/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function PATCH(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await context.params;

    const user: any = await User.findById(id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // we’re not assuming a schema; we’ll use a soft boolean
    if (typeof user.verified !== 'boolean') user.verified = false;
    user.verified = !user.verified;
    await user.save();

    return NextResponse.json({ success: true, verified: user.verified });
  } catch (err: any) {
    console.error('Verify toggle error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to toggle verify' }, { status: 500 });
  }
}
