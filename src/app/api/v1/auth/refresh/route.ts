import prisma from '@/lib/prisma';
import {
  getRefreshTokenCookie,
  verifyRefreshTokenJWT,
  generateAccessToken,
  generateRefreshToken,
  hashPassword,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from '@/lib/auth';
import { errorResponse, successResponse } from '@/lib/api-utils';
import bcrypt from 'bcryptjs';

export async function POST() {
  // Get refresh token from httpOnly cookie
  const refreshToken = await getRefreshTokenCookie();
  if (!refreshToken) {
    return errorResponse('NO_REFRESH_TOKEN', 'No refresh token', 401);
  }

  // Verify JWT
  const payload = await verifyRefreshTokenJWT(refreshToken);
  if (!payload) {
    await clearRefreshTokenCookie();
    return errorResponse('INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token', 401);
  }

  // Find user
  const user = await prisma.user.findFirst({
    where: { id: payload.sub, deletedAt: null, status: 'active' },
    include: { role: true },
  });

  if (!user) {
    await clearRefreshTokenCookie();
    return errorResponse('USER_NOT_FOUND', 'User not found', 401);
  }

  // Find matching non-revoked, non-expired refresh token
  const storedTokens = await prisma.refreshToken.findMany({
    where: {
      userId: user.id,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  let tokenValid = false;
  let matchedTokenId: string | null = null;
  for (const st of storedTokens) {
    if (await bcrypt.compare(refreshToken, st.tokenHash)) {
      tokenValid = true;
      matchedTokenId = st.id;
      break;
    }
  }

  if (!tokenValid || !matchedTokenId) {
    await clearRefreshTokenCookie();
    return errorResponse('INVALID_REFRESH_TOKEN', 'Refresh token not recognized', 401);
  }

  // Revoke old token (rotation)
  await prisma.refreshToken.update({
    where: { id: matchedTokenId },
    data: { revokedAt: new Date() },
  });

  // Generate new tokens
  const roleName = user.role.name as 'super_admin' | 'admin' | 'mentor' | 'coordinator';
  const newAccessToken = await generateAccessToken({
    id: user.id,
    role: roleName,
    email: user.email,
  });

  const newRefreshToken = await generateRefreshToken({
    id: user.id,
    role: roleName,
    email: user.email,
  });

  // Store new refresh token hash
  const newHash = await hashPassword(newRefreshToken);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: newHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // Set new cookie
  await setRefreshTokenCookie(newRefreshToken);

  return successResponse({ accessToken: newAccessToken });
}
