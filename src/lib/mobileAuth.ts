// Shared Bearer-token auth for mobile API consumers. Web routes use NextAuth
// sessions; mobile sends `Authorization: Bearer <jwt>` signed with AUTH_SECRET.

import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { AUTH_SECRET } from '@/lib/authSecret';

export interface MobileTokenPayload {
  userId: string;
  email: string;
  role?: string;
}

export function getBearerUser(request: NextRequest): MobileTokenPayload | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, AUTH_SECRET) as MobileTokenPayload;
  } catch {
    return null;
  }
}
