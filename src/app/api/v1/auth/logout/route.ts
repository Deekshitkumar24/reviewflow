import prisma from '@/lib/prisma';
import { getAuthUser, clearRefreshTokenCookie } from '@/lib/auth';
import { errorResponse, successResponse, createAuditLog } from '@/lib/api-utils';

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }

  // Revoke all refresh tokens for this user
  await prisma.refreshToken.updateMany({
    where: { userId: user.sub, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  // Clear cookie
  await clearRefreshTokenCookie();

  // Audit log
  await createAuditLog({
    userId: user.sub,
    action: 'user.logout',
    entityType: 'user',
    entityId: user.sub,
  });

  return successResponse({ message: 'Logged out successfully' });
}
