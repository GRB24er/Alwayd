// File: src/app/api/admin/count/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect                    from '@/lib/mongodb';
import User                         from '@/models/User';

export async function GET(_req: NextRequest) {
  await dbConnect();
  const adminCount = await User.countDocuments({ role: 'admin' });
  return NextResponse.json({ count: adminCount });
}
