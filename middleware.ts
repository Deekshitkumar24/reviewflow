import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-jwt-key-at-least-256-bits-long-change-in-production'
);

// Routes that are protected and which roles can access them
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

// Public routes that never need auth
const PUBLIC_PATHS = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/change-password',
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
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

  // Allow static files, _next internals, and public API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    isPublicPath(pathname)
  ) {
    return NextResponse.next();
  }

  // Allow all non-protected API routes (auth is handled inside each route with withAuth)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const protectedPrefix = matchedProtectedPrefix(pathname);
  if (!protectedPrefix) {
    // Root or unmatched — redirect to login
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Try to validate access token from Authorization header or accessToken cookie
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
      // Redirect to their own dashboard
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
    // Token expired or invalid — redirect to login
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
