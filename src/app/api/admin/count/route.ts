// File: src/app/api/admin/count/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect                    from '@/lib/mongodb';
import User                         from '@/models/User';
import { requireAdmin } from '@/lib/adminGuard';

export async function GET(_req: NextRequest) {
  const admin = await requireAdmin(_req);
  if (!admin.ok) return admin.response;

  await dbConnect();
  const adminCount = await User.countDocuments({ role: 'admin' });
  return NextResponse.json({ count: adminCount });
}
