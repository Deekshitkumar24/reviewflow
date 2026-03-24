import prisma from '@/lib/prisma';
import { successResponse, errorResponse, validateBody } from '@/lib/api-utils';
import { hashPassword, validatePasswordStrength } from '@/lib/auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

const resetSchema = z.object({
  email: z.string().email().toLowerCase(),
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

// POST /api/v1/auth/reset-password
export async function POST(request: Request) {
  const validation = await validateBody(request, resetSchema);
  if (validation.error) return validation.error;
  const { email, token, newPassword } = validation.data!;

  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    return errorResponse('WEAK_PASSWORD', strength.errors.join('. '), 400);
  }

  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null, status: 'active' },
  });
  if (!user) return errorResponse('INVALID_TOKEN', 'Invalid or expired reset link', 400);

  // Find valid, unused reset tokens
  const validResets = await prisma.passwordReset.findMany({
    where: {
      userId: user.id,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  let matchedReset: { id: string } | null = null;
  for (const r of validResets) {
    if (await bcrypt.compare(token, r.tokenHash)) {
      matchedReset = r;
      break;
    }
  }

  if (!matchedReset) return errorResponse('INVALID_TOKEN', 'Invalid or expired reset link', 400);

  // Mark token as used and update password
  await prisma.$transaction([
    prisma.passwordReset.update({ where: { id: matchedReset.id }, data: { usedAt: new Date() } }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    }),
    // Revoke all refresh tokens for security
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return successResponse({ message: 'Password reset successfully. Please log in with your new password.' });
}
