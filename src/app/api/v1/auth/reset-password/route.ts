import { db } from '@/db';
import { users, passwordResets, refreshTokens } from '@/db/schema';
import { eq, and, isNull, gt, desc } from 'drizzle-orm';
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

  const user = await db.query.users.findFirst({
    where: (users, { eq, and, isNull }) => and(eq(users.email, email), isNull(users.deletedAt), eq(users.status, 'active')),
  });
  if (!user) return errorResponse('INVALID_TOKEN', 'Invalid or expired reset link', 400);

  // Find valid, unused reset tokens
  const validResets = await db.query.passwordResets.findMany({
    where: and(
      eq(passwordResets.userId, user.id),
      isNull(passwordResets.usedAt),
      gt(passwordResets.expiresAt, new Date())
    ),
    orderBy: [desc(passwordResets.createdAt)],
    limit: 5,
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
  const newHash = await hashPassword(newPassword);
  await db.transaction(async (tx) => {
    await tx.update(passwordResets)
      .set({ usedAt: new Date() })
      .where(eq(passwordResets.id, matchedReset!.id));
      
    await tx.update(users)
      .set({
        passwordHash: newHash,
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null,
      })
      .where(eq(users.id, user.id));

    // Revoke all refresh tokens for security
    await tx.update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, user.id), isNull(refreshTokens.revokedAt)));
  });

  return successResponse({ message: 'Password reset successfully. Please log in with your new password.' });
}
