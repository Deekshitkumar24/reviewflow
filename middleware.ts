import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-jwt-key-at-least-256-bits-long-change-in-production'
);

// Staff role routes (admin, mentor, coordinator)
const ROLE_ROUTES: Record<string, string[]> = {
  '/dashboard': ['super_admin', 'admin'],
  '/events': ['super_admin', 'admin'],
  '/users': ['super_admin', 'admin'],
  '/teams': ['super_admin', 'admin'],
  '/labs': ['super_admin', 'admin'],
  '/rounds': ['super_admin', 'admin'],
  '/results': ['super_admin', 'admin'],
  '/audit-logs': ['super_admin', 'admin'],
  '/reports': ['super_admin', 'admin'],
  '/live': ['super_admin', 'admin'],
  '/settings': ['super_admin', 'admin'],
  '/profile': ['super_admin', 'admin', 'mentor', 'coordinator'],
  '/mentor': ['mentor'],
  '/coordinator': ['coordinator'],
};

// Public paths (no auth required)
const PUBLIC_PATHS = [
  '/login',
  '/student/login',
  '/forgot-password',
  '/reset-password',
  '/change-password',
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/student/auth/login',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

function matchedProtectedPrefix(pathname: string): string | null {
  for (const prefix of Object.keys(ROLE_ROUTES)) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      return prefix;
    }
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, _next internals, and public paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    isPublicPath(pathname)
  ) {
    return NextResponse.next();
  }

  // Allow all non-protected API routes (auth handled inside each route with withAuth)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // ─── Student Portal Routes ───
  if (pathname.startsWith('/student')) {
    const studentToken = request.cookies.get('studentAccessToken')?.value;
    if (!studentToken) {
      return NextResponse.redirect(new URL('/student/login', request.url));
    }
    try {
      const { payload } = await jwtVerify(studentToken, JWT_SECRET);
      if (payload.role !== 'student') {
        return NextResponse.redirect(new URL('/student/login', request.url));
      }
      return NextResponse.next();
    } catch {
      const response = NextResponse.redirect(new URL('/student/login', request.url));
      response.cookies.delete('studentAccessToken');
      return response;
    }
  }

  // ─── Staff Routes ───
  const protectedPrefix = matchedProtectedPrefix(pathname);
  if (!protectedPrefix) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');
  const accessTokenCookie = request.cookies.get('accessToken')?.value;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : accessTokenCookie;

  if (!token) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string;
    const allowedRoles = ROLE_ROUTES[protectedPrefix] || [];

    if (!allowedRoles.includes(role)) {
      const dashboardMap: Record<string, string> = {
        mentor: '/mentor/dashboard',
        coordinator: '/coordinator/checkin',
        admin: '/dashboard',
        super_admin: '/dashboard',
      };
      return NextResponse.redirect(new URL(dashboardMap[role] || '/login', request.url));
    }

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(pathname)}`, request.url)
    );
    response.cookies.delete('accessToken');
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
