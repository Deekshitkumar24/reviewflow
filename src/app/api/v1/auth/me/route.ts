import prisma from '@/lib/prisma';
import { withAuth, successResponse, errorResponse } from '@/lib/api-utils';

export const runtime = 'nodejs';

// GET /api/v1/auth/me — Return current user profile from access token
export async function GET(request: Request) {
  return withAuth(request, async (jwt) => {
    const user = await prisma.user.findFirst({
      where: { id: jwt.sub, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        profileImageUrl: true,
        status: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
        role: { select: { name: true, displayName: true } },
      },
    });

    if (!user) return errorResponse('NOT_FOUND', 'User not found', 404);

    return successResponse({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      profileImageUrl: user.profileImageUrl,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
      role: user.role.name,
      roleDisplayName: user.role.displayName,
    });
  });
}
