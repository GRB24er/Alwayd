// Admin authorization for /api/admin/* route handlers. Resolves the NextAuth
// session token from cookies and requires an admin role. Returns a ready-made
// JSON error response when the caller is not an authorized administrator.

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { AUTH_SECRET } from '@/lib/authSecret';

export interface AdminContext {
  ok: true;
  adminId?: string;
  email?: string;
  role: string;
}

export interface AdminDenied {
  ok: false;
  response: NextResponse;
}

export async function requireAdmin(request: NextRequest): Promise<AdminContext | AdminDenied> {
  const token = await getToken({
    req: request as any,
    secret: AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === 'production',
  });

  if (!token?.email) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  const role = (token.role as string) || 'user';
  if (role !== 'admin' && role !== 'superadmin') {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Administrator access required' },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    adminId: (token.id as string) || undefined,
    email: token.email as string,
    role,
  };
}
