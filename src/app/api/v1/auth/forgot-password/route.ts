import { db } from '@/db';
import { users, passwordResets } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { successResponse, errorResponse, validateBody } from '@/lib/api-utils';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';
import crypto from 'crypto';

export const runtime = 'nodejs';

const forgotSchema = z.object({
  email: z.string().email().toLowerCase(),
});

// POST /api/v1/auth/forgot-password
export async function POST(request: Request) {
  const validation = await validateBody(request, forgotSchema);
  if (validation.error) return validation.error;
  const { email } = validation.data!;

  // Always return success to prevent email enumeration
  const user = await db.query.users.findFirst({
    where: (users, { eq, and, isNull }) => and(eq(users.email, email), isNull(users.deletedAt), eq(users.status, 'active')),
  });

  if (!user) {
    return successResponse({ message: 'If that email exists, a reset link has been sent.' });
  }

  // Invalidate any existing reset tokens for this user
  await db.update(passwordResets)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResets.userId, user.id), isNull(passwordResets.usedAt)));

  // Generate a secure token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = await hashPassword(rawToken);

  await db.insert(passwordResets).values({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  });

  // In production: send email with `rawToken` via Resend/nodemailer
  // For now: log to server console (swap with email provider)
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
  console.info(`[PASSWORD RESET] ${user.email} → ${resetUrl}`);

  // Note: Integrate your email provider here to send the actual email.
  // Example: await sendEmail({ to: user.email, subject: 'Reset your ReviewFlow password', html: resetEmailTemplate(resetUrl) });

  return successResponse({ message: 'If that email exists, a reset link has been sent.' });
}
