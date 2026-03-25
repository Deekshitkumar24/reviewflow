import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUser, verifyPassword, hashPassword } from '@/lib/auth';
import { validateBody, errorResponse, successResponse, createAuditLog } from '@/lib/api-utils';
import { changePasswordSchema } from '@/validators';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }

  const validation = await validateBody(request, changePasswordSchema);
  if (validation.error) return validation.error;
  const { currentPassword, newPassword } = validation.data!;

  // Find user
  const user = await db.query.users.findFirst({ where: eq(users.id, authUser.sub) });
  if (!user) {
    return errorResponse('USER_NOT_FOUND', 'User not found', 404);
  }

  // If not first login (mustChangePassword = false), require current password
  if (!user.mustChangePassword) {
    if (!currentPassword) {
      return errorResponse('VALIDATION_ERROR', 'Current password is required', 400);
    }
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return errorResponse('INVALID_PASSWORD', 'Current password is incorrect', 400);
    }
  }

  // Hash new password and update
  const newHash = await hashPassword(newPassword);
  await db.update(users)
    .set({
      passwordHash: newHash,
      mustChangePassword: false,
    })
    .where(eq(users.id, user.id));

  // Audit log
  await createAuditLog({
    userId: user.id,
    action: 'user.password_changed',
    entityType: 'user',
    entityId: user.id,
  });

  return successResponse({ message: 'Password changed successfully' });
}
