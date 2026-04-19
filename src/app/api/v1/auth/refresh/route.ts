import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, refreshTokens } from '@/db/schema';
import { eq, and, isNull, gt, desc } from 'drizzle-orm';
import { cookies } from 'next/headers';
import {
  verifyRefreshTokenJWT,
  generateAccessToken,
  generateRefreshToken,
  hashPassword,
} from '@/lib/auth';
import { errorResponse } from '@/lib/api-utils';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refreshToken')?.value;
  if (!refreshToken) return errorResponse('NO_REFRESH_TOKEN', 'No refresh token', 401);

  const payload = await verifyRefreshTokenJWT(refreshToken);
  if (!payload) {
    const res = errorResponse('INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token', 401);
    return res;
  }

  let user;
  try {
    user = await db.query.users.findFirst({
      where: (users, { eq, and, isNull }) => and(eq(users.id, payload.sub), isNull(users.deletedAt), eq(users.status, 'active')),
      with: { role: true },
    });
  } catch (error: any) {
    console.error('Database connection failed during token refresh:', error);
    return errorResponse('DATABASE_ERROR', 'A database connection issue occurred. Please try again later.', 500);
  }

  if (!user) return errorResponse('USER_NOT_FOUND', 'User not found', 401);

  // Validate stored refresh token hash
  const storedTokens = await db.query.refreshTokens.findMany({
    where: and(
      eq(refreshTokens.userId, user.id),
      isNull(refreshTokens.revokedAt),
      gt(refreshTokens.expiresAt, new Date())
    ),
    orderBy: [desc(refreshTokens.createdAt)],
    limit: 5,
  });

  let matchedTokenId: string | null = null;
  for (const st of storedTokens) {
    if (await bcrypt.compare(refreshToken, st.tokenHash)) {
      matchedTokenId = st.id;
      break;
    }
  }

  if (!matchedTokenId) return errorResponse('INVALID_REFRESH_TOKEN', 'Refresh token not recognized', 401);

  // Rotate: revoke old, issue new
  await db.update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, matchedTokenId));

  const roleName = user.role.name as 'super_admin' | 'admin' | 'mentor' | 'coordinator';
  const newAccessToken = await generateAccessToken({ id: user.id, role: roleName, email: user.email });
  const newRefreshToken = await generateRefreshToken({ id: user.id, role: roleName, email: user.email });

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: await hashPassword(newRefreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const res = NextResponse.json({
    success: true,
    data: {
      accessToken: newAccessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: roleName,
        mustChangePassword: user.mustChangePassword,
        profileImageUrl: user.profileImageUrl,
      },
    },
  });

  // Re-set both cookies
  res.cookies.set('accessToken', newAccessToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60,
  });
  res.cookies.set('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });

  return res;
}
