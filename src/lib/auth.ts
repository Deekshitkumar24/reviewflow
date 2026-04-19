import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import type { AuthUser, RoleName } from '@/types';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me-in-production-256bit');
const JWT_REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me-256bit');

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const BCRYPT_ROUNDS = 12;

export interface JWTPayload {
  sub: string;
  role: RoleName;
  email: string;
  iat?: number;
  exp?: number;
}

// ═══════════════════════════════════════
// Password Hashing
// ═══════════════════════════════════════
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ═══════════════════════════════════════
// JWT Token Generation
// ═══════════════════════════════════════
export async function generateAccessToken(user: { id: string; role: RoleName; email: string }): Promise<string> {
  return new SignJWT({ sub: user.id, role: user.role, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function generateRefreshToken(user: { id: string; role: RoleName; email: string }): Promise<string> {
  return new SignJWT({ sub: user.id, role: user.role, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_REFRESH_SECRET);
}

// ═══════════════════════════════════════
// JWT Token Verification
// ═══════════════════════════════════════
export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshTokenJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════
// Cookie Management
// ═══════════════════════════════════════
export async function setRefreshTokenCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function getRefreshTokenCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('refreshToken')?.value;
}

export async function clearRefreshTokenCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('refreshToken');
}

// ═══════════════════════════════════════
// Auth Helpers for API Routes
// ═══════════════════════════════════════
export async function getAuthUser(request: Request): Promise<JWTPayload | null> {
  let token = '';

  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  // Fallback to cookie if Authorization header is missing (e.g., hard refresh dropping Zustand state)
  if (!token) {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/accessToken=([^;]+)/);
      if (match) token = match[1];
    }
  }

  if (!token) return null;

  return verifyAccessToken(token);
}

export function requireRole(user: JWTPayload | null, ...roles: RoleName[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

// ═══════════════════════════════════════
// Password Strength Validation
// ═══════════════════════════════════════
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Must contain at least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Must contain at least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Must contain at least one number');
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) errors.push('Must contain at least one special character');
  return { valid: errors.length === 0, errors };
}

// ═══════════════════════════════════════
// Generate Temporary Password
// ═══════════════════════════════════════
export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const special = '!@#$%&*';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  password += special.charAt(Math.floor(Math.random() * special.length));
  return password + Math.floor(Math.random() * 10);
}
