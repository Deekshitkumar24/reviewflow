import prisma from '@/lib/prisma';
import { withAuth, successResponse, errorResponse, validateBody, createAuditLog } from '@/lib/api-utils';
import { hashPassword, generateTempPassword } from '@/lib/auth';
import { z } from 'zod';

export const runtime = 'nodejs';

const updateUserSchema = z.object({
  fullName: z.string().min(1).max(120).optional(),
  phone: z.string().max(20).optional().nullable(),
  status: z.enum(['active', 'disabled']).optional(),
  roleId: z.string().uuid().optional(),
  resetPassword: z.boolean().optional(),
});

// PATCH /api/v1/users/[userId]
export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  return withAuth(request, async (user) => {
    const { userId } = await params;
    const validation = await validateBody(request, updateUserSchema);
    if (validation.error) return validation.error;
    const { fullName, phone, status, roleId, resetPassword } = validation.data!;

    const existing = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!existing) return errorResponse('NOT_FOUND', 'User not found', 404);

    const updateData: Record<string, unknown> = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (status !== undefined) updateData.status = status;
    if (roleId !== undefined) updateData.roleId = roleId;

    let tempPassword: string | undefined;
    if (resetPassword) {
      tempPassword = generateTempPassword();
      updateData.passwordHash = await hashPassword(tempPassword);
      updateData.mustChangePassword = true;
    }

    const updated = await prisma.user.update({ where: { id: userId }, data: updateData });
    await createAuditLog({
      userId: user.sub,
      action: 'user.updated',
      entityType: 'user',
      entityId: userId,
      newValues: { status, resetPassword: !!resetPassword } as Record<string, unknown>,
    });

    return successResponse({
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      status: updated.status,
      mustChangePassword: updated.mustChangePassword,
      ...(tempPassword ? { tempPassword } : {}),
    });
  }, ['super_admin', 'admin']);
}
