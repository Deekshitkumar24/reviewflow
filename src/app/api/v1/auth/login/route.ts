import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  hashPassword,
  setRefreshTokenCookie,
} from '@/lib/auth';
import { validateBody, errorResponse, successResponse, createAuditLog } from '@/lib/api-utils';
import { loginSchema } from '@/validators';

export async function POST(request: Request) {
  // Step 1-2: Parse and normalize email
  const validation = await validateBody(request, loginSchema);
  if (validation.error) return validation.error;
  const { email, password } = validation.data!;

  // Step 3: Find user by lowered email, not deleted
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null },
    include: { role: true },
  });

  // Step 4: Not found → generic error (never reveal email existence)
  if (!user) {
    return errorResponse('INVALID_CREDENTIALS', 'Invalid credentials', 401);
  }

  // Step 5: Disabled account
  if (user.status === 'disabled') {
    return errorResponse('ACCOUNT_DISABLED', 'Account disabled, contact administrator', 401);
  }

  // Step 6: Lockout check
  if (user.failedLoginCount >= 10 && user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMs = user.lockedUntil.getTime() - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60000);
    return errorResponse(
      'ACCOUNT_LOCKED',
      `Account temporarily locked. Try again in ${remainingMin} minute(s)`,
      429
    );
  }

  // Step 7: Verify password
  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    // Increment failed count, set lockout after 10 fails
    const newCount = user.failedLoginCount + 1;
    const updateData: Record<string, unknown> = { failedLoginCount: newCount };
    if (newCount >= 10) {
      updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lockout
    }
    await prisma.user.update({ where: { id: user.id }, data: updateData });
    return errorResponse('INVALID_CREDENTIALS', 'Invalid credentials', 401);
  }

  // Step 8: Success — reset failed count, update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lastLoginAt: new Date(), lockedUntil: null },
  });

  // Step 9: Generate access token
  const roleName = user.role.name as 'super_admin' | 'admin' | 'mentor' | 'coordinator';
  const accessToken = await generateAccessToken({
    id: user.id,
    role: roleName,
    email: user.email,
  });

  // Step 10: Generate refresh token and store hash
  const refreshToken = await generateRefreshToken({
    id: user.id,
    role: roleName,
    email: user.email,
  });
  const refreshHash = await hashPassword(refreshToken);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      deviceInfo: request.headers.get('user-agent') || undefined,
    },
  });

  // Step 11: Set httpOnly cookie
  await setRefreshTokenCookie(refreshToken);

  // Audit log
  await createAuditLog({
    userId: user.id,
    action: 'user.login',
    entityType: 'user',
    entityId: user.id,
    ipAddress: request.headers.get('x-forwarded-for') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
  });

  // Step 12: Return response
  return successResponse({
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
}
