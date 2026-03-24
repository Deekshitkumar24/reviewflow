import prisma from '@/lib/prisma';
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
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null, status: 'active' },
  });

  if (!user) {
    return successResponse({ message: 'If that email exists, a reset link has been sent.' });
  }

  // Invalidate any existing reset tokens for this user
  await prisma.passwordReset.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  // Generate a secure token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = await hashPassword(rawToken);

  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  // In production: send email with `rawToken` via Resend/nodemailer
  // For now: log to server console (swap with email provider)
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
  console.info(`[PASSWORD RESET] ${user.email} → ${resetUrl}`);

  // TODO: Replace console.info with: await sendEmail({ to: user.email, subject: 'Reset your ReviewFlow password', html: resetEmailTemplate(resetUrl) })

  return successResponse({ message: 'If that email exists, a reset link has been sent.' });
}
