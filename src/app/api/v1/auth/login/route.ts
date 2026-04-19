import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, refreshTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  hashPassword,
  setRefreshTokenCookie,
} from '@/lib/auth';
import { validateBody, errorResponse, successResponse, createAuditLog } from '@/lib/api-utils';
import { loginSchema } from '@/validators';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const validation = await validateBody(request, loginSchema);
  if (validation.error) return validation.error;
  const { email, password } = validation.data!;

  let user;
  try {
    user = await db.query.users.findFirst({
      where: (users, { eq, and, isNull }) => and(eq(users.email, email.toLowerCase()), isNull(users.deletedAt)),
      with: { role: true },
    });
  } catch (error: any) {
    console.error('Database connection or query failed during login:', error);
    return errorResponse('DATABASE_ERROR', 'A temporary database issue occurred while attempting to log in. Please try again later.', 500);
  }

  if (!user) return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  if (user.status === 'disabled') return errorResponse('ACCOUNT_DISABLED', 'Account disabled. Contact your administrator.', 401);

  if (user.failedLoginCount >= 10 && user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMin = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return errorResponse('ACCOUNT_LOCKED', `Account locked. Try again in ${remainingMin} minute(s)`, 429);
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    const newCount = user.failedLoginCount + 1;
    const updateData: Record<string, unknown> = { failedLoginCount: newCount };
    if (newCount >= 10) updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    await db.update(users).set(updateData).where(eq(users.id, user.id));
    return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  await db.update(users)
    .set({ failedLoginCount: 0, lastLoginAt: new Date(), lockedUntil: null })
    .where(eq(users.id, user.id));

  const roleName = user.role.name as 'super_admin' | 'admin' | 'mentor' | 'coordinator';
  const accessToken = await generateAccessToken({ id: user.id, role: roleName, email: user.email });
  const refreshToken = await generateRefreshToken({ id: user.id, role: roleName, email: user.email });
  const refreshHash = await hashPassword(refreshToken);

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: refreshHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    deviceInfo: request.headers.get('user-agent') || undefined,
  });

  await createAuditLog({
    userId: user.id,
    action: 'user.login',
    entityType: 'user',
    entityId: user.id,
    ipAddress: request.headers.get('x-forwarded-for') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
  });

  // Set BOTH cookies: refreshToken (httpOnly) and accessToken (readable by middleware)
  const response = successResponse({
    accessToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: roleName,
      mustChangePassword: user.mustChangePassword,
      profileImageUrl: user.profileImageUrl,
    },
  });

  // httpOnly refresh token
  await setRefreshTokenCookie(refreshToken);

  // Middleware-visible access token (short-lived, not httpOnly so middleware can read it)
  const res = NextResponse.json(
    { success: true, data: { accessToken, user: { id: user.id, fullName: user.fullName, email: user.email, role: roleName, mustChangePassword: user.mustChangePassword, profileImageUrl: user.profileImageUrl } } },
    { status: 200 }
  );
  res.cookies.set('accessToken', accessToken, {
    httpOnly: false, // Readable by middleware
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60, // 15 min (matches JWT expiry)
  });
  res.cookies.set('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });

  return res;
}
