// src/app/api/admin/trusts/[id]/route.ts
// Admin edit of a single trust. Currently supports changing the establishment
// date (fundedAt) — the "Date Established" printed on the Declaration of
// Trust, Certificate of Establishment and Contribution Receipt. Documents are
// generated fresh from the trust record on every download, so they pick up the
// new date immediately.

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import TrustAccount from '@/models/TrustAccount';
import { requireAdmin } from '@/lib/adminGuard';

export const runtime = 'nodejs';

function bad(status: number, error: string) {
  return NextResponse.json({ success: false, error }, { status });
}

async function handleUpdate(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id) return bad(400, 'Missing trust id.');

  const body = await request.json().catch(() => ({}));
  const rawDate = body?.fundedAt ?? body?.dateEstablished;
  if (!rawDate) return bad(400, 'New establishment date is required.');

  const newDate = new Date(rawDate);
  if (isNaN(newDate.getTime())) return bad(400, 'Invalid date.');
  if (newDate.getTime() > Date.now()) {
    return bad(400, 'The establishment date cannot be in the future.');
  }

  await connectDB();

  const trust = await TrustAccount.findByIdAndUpdate(
    id,
    { $set: { fundedAt: newDate } },
    { new: true }
  ).lean();
  if (!trust) return bad(404, 'Trust not found.');

  return NextResponse.json({
    success: true,
    message: 'Establishment date updated.',
    trust,
  });
}

/** Accept BOTH PATCH and POST (some environments/proxies drop PATCH). */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handleUpdate(req, ctx);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handleUpdate(req, ctx);
}
