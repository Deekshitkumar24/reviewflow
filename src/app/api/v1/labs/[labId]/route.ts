import prisma from '@/lib/prisma';
import { withAuth, successResponse, errorResponse, validateBody, createAuditLog } from '@/lib/api-utils';
import { z } from 'zod';

export const runtime = 'nodejs';

const updateLabSchema = z.object({
  labName: z.string().min(1).max(100).optional(),
  building: z.string().max(100).optional(),
  floor: z.string().max(20).optional(),
  capacity: z.number().int().min(0).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  notes: z.string().optional(),
});

// PATCH /api/v1/labs/[labId]
export async function PATCH(request: Request, { params }: { params: Promise<{ labId: string }> }) {
  return withAuth(request, async (user) => {
    const { labId } = await params;
    const validation = await validateBody(request, updateLabSchema);
    if (validation.error) return validation.error;

    const existing = await prisma.lab.findFirst({ where: { id: labId, deletedAt: null } });
    if (!existing) return errorResponse('NOT_FOUND', 'Lab not found', 404);

    const lab = await prisma.lab.update({ where: { id: labId }, data: validation.data! });
    await createAuditLog({ userId: user.sub, action: 'lab.updated', entityType: 'lab', entityId: labId });
    return successResponse(lab);
  }, ['super_admin', 'admin']);
}

// DELETE /api/v1/labs/[labId]
export async function DELETE(request: Request, { params }: { params: Promise<{ labId: string }> }) {
  return withAuth(request, async (user) => {
    const { labId } = await params;
    const existing = await prisma.lab.findFirst({ where: { id: labId, deletedAt: null } });
    if (!existing) return errorResponse('NOT_FOUND', 'Lab not found', 404);

    await prisma.lab.update({ where: { id: labId }, data: { deletedAt: new Date() } });
    await createAuditLog({ userId: user.sub, action: 'lab.deleted', entityType: 'lab', entityId: labId });
    return successResponse({ message: 'Lab deleted' });
  }, ['super_admin', 'admin']);
}
