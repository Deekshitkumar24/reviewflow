import { NextResponse } from 'next/server';
import { db } from '@/db';
import { refreshTokens } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth';
import { errorResponse, createAuditLog } from '@/lib/api-utils';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }

  // Revoke all refresh tokens for this user
  await db.update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, user.sub), isNull(refreshTokens.revokedAt)));

  // Audit log
  await createAuditLog({
    userId: user.sub,
    action: 'user.logout',
    entityType: 'user',
    entityId: user.sub,
  });

  const res = NextResponse.json({ success: true, data: { message: 'Logged out successfully' } });
  res.cookies.delete('accessToken');
  res.cookies.delete('refreshToken');
  return res;
}
