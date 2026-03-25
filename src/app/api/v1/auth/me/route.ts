import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { withAuth, successResponse, errorResponse, validateBody, createAuditLog } from '@/lib/api-utils';
import { z } from 'zod';

export const runtime = 'nodejs';

// GET /api/v1/auth/me — Return current user profile from access token
export async function GET(request: Request) {
  return withAuth(request, async (jwt) => {
    const user = await db.query.users.findFirst({
      where: (users, { eq, and, isNull }) => and(eq(users.id, jwt.sub), isNull(users.deletedAt)),
      columns: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        profileImageUrl: true,
        status: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
      },
      with: { role: { columns: { name: true, displayName: true } } },
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

// PATCH /api/v1/auth/me — Update own profile (fullName, phone)
const updateProfileSchema = z.object({
  fullName: z.string().min(1, 'Name is required').max(120).optional(),
  phone: z.string().max(20).optional().nullable(),
});

export async function PATCH(request: Request) {
  return withAuth(request, async (jwt) => {
    const validation = await validateBody(request, updateProfileSchema);
    if (validation.error) return validation.error;
    const { fullName, phone } = validation.data!;

    const updateData: Record<string, unknown> = {};
    if (fullName !== undefined) updateData.fullName = fullName.trim();
    if (phone !== undefined) updateData.phone = phone?.trim() || null;

    if (Object.keys(updateData).length === 0) {
      return errorResponse('BAD_REQUEST', 'No fields to update', 400);
    }

    updateData.updatedAt = new Date();

    const updatedList = await db.update(users)
      .set(updateData as any)
      .where(eq(users.id, jwt.sub))
      .returning();

    const updated = updatedList[0];
    if (!updated) return errorResponse('NOT_FOUND', 'User not found', 404);

    // Re-fetch with role for complete response
    const fullUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, jwt.sub),
      columns: {
        id: true, fullName: true, email: true, phone: true,
        profileImageUrl: true, status: true, mustChangePassword: true,
        lastLoginAt: true,
      },
      with: { role: { columns: { name: true, displayName: true } } },
    });

    await createAuditLog({
      userId: jwt.sub,
      action: 'profile.updated',
      entityType: 'user',
      entityId: jwt.sub,
      newValues: updateData,
    });

    return successResponse({
      id: fullUser!.id,
      fullName: fullUser!.fullName,
      email: fullUser!.email,
      phone: fullUser!.phone,
      profileImageUrl: fullUser!.profileImageUrl,
      status: fullUser!.status,
      mustChangePassword: fullUser!.mustChangePassword,
      lastLoginAt: fullUser!.lastLoginAt,
      role: fullUser!.role.name,
      roleDisplayName: fullUser!.role.displayName,
    });
  });
}
