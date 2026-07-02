import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { applySecurityHeaders } from '@/lib/securityHeaders';

const ADMIN_EMAILS = [
  'admin@aldwycheuropeancapital.com',
  'your-email@example.com',
];

const NEXTAUTH_SECRET =
  process.env.JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  '21b0133285c83665020046259b56217a7a787f1c9dd59fefe496f93dbba6deb2';

const PROTECTED_PATHS = [
  '/dashboard',
  '/transfers',
  '/accounts',
  '/cards',
  '/profile',
  '/settings',
  '/transactions',
];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  try {
    const session = await getToken({
      req,
      secret: NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production',
    });

    if (path.startsWith('/admin')) {
      if (!session || !session.email) {
        return NextResponse.redirect(new URL('/auth/signin?error=no-session', req.url));
      }
      const userEmail = (session.email as string).toLowerCase().trim();
      const isAdminEmail = ADMIN_EMAILS.some((e) => e.toLowerCase().trim() === userEmail);
      const isAdminRole = session.role === 'admin' || session.role === 'superadmin';
      if (!isAdminEmail && !isAdminRole) {
        return NextResponse.redirect(new URL('/dashboard?error=access-denied', req.url));
      }
    }

    if (PROTECTED_PATHS.some((p) => path.startsWith(p))) {
      if (!session) {
        return NextResponse.redirect(new URL('/auth/signin?error=auth-required', req.url));
      }
    }

    // Attach a request id so handler logs can be correlated end-to-end.
    const requestId =
      req.headers.get('x-request-id') ||
      `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-request-id', requestId);

    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set('x-request-id', requestId);
    return applySecurityHeaders(res);
  } catch (error) {
    return NextResponse.redirect(new URL('/auth/signin?error=middleware-error', req.url));
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/transfers/:path*',
    '/accounts/:path*',
    '/cards/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/transactions/:path*',
    '/api/auth/:path*',
    '/api/otp/:path*',
    '/api/transfers/:path*',
    '/api/transactions/:path*',
  ],
};