export const runtime = 'nodejs';

import { db } from '@/db';
import { labs } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuth, successResponse, errorResponse, validateBody, createAuditLog } from '@/lib/api-utils';
import { z } from 'zod';

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

    const existing = await db.query.labs.findFirst({ where: and(eq(labs.id, labId), isNull(labs.deletedAt)) });
    if (!existing) return errorResponse('NOT_FOUND', 'Lab not found', 404);

    const labList = await db.update(labs)
        .set(validation.data! as any)
        .where(eq(labs.id, labId))
        .returning();

    const lab = labList[0];
    
    await createAuditLog({ userId: user.sub, action: 'lab.updated', entityType: 'lab', entityId: labId });
    return successResponse(lab);
  }, ['super_admin', 'admin']);
}

// DELETE /api/v1/labs/[labId]
export async function DELETE(request: Request, { params }: { params: Promise<{ labId: string }> }) {
  return withAuth(request, async (user) => {
    const { labId } = await params;
    const existing = await db.query.labs.findFirst({ where: and(eq(labs.id, labId), isNull(labs.deletedAt)) });
    if (!existing) return errorResponse('NOT_FOUND', 'Lab not found', 404);

    await db.update(labs).set({ deletedAt: new Date() }).where(eq(labs.id, labId));
    
    await createAuditLog({ userId: user.sub, action: 'lab.deleted', entityType: 'lab', entityId: labId });
    return successResponse({ message: 'Lab deleted' });
  }, ['super_admin', 'admin']);
}
