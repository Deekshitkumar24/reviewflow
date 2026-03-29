import { db } from '@/db';
import { attendanceSlots } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { withAuth, validateBody, errorResponse, successResponse, createAuditLog } from '@/lib/api-utils';
import { z } from 'zod';

export const runtime = 'nodejs';

const updateSlotSchema = z.object({
  slotName: z.string().min(1).max(100).optional(),
  startTime: z.string().refine(d => !isNaN(Date.parse(d)), 'Invalid time').optional(),
  dueTime: z.string().refine(d => !isNaN(Date.parse(d)), 'Invalid time').optional(),
  gracePeriodMinutes: z.number().int().min(0).max(60).optional(),
  reminderMinutes: z.string().optional(),
  escalationEnabled: z.boolean().optional(),
  status: z.enum(['upcoming', 'open', 'reminder_sent', 'grace_period', 'missed', 'completed']).optional(),
});

// GET — Single slot detail
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slotId: string }> }
) {
  return withAuth(request, async (user) => {
    const { slotId } = await params;
    const slot = await db.query.attendanceSlots.findFirst({
      where: (s, { eq: e }) => e(s.id, slotId),
      with: {
        labSubmissions: {
          with: {
            lab: { columns: { labName: true } },
            submittedBy: { columns: { fullName: true } },
          },
        },
      },
    });

    if (!slot) return errorResponse('NOT_FOUND', 'Slot not found', 404);

    return successResponse({
      ...slot,
      slotDate: slot.slotDate.toISOString(),
      startTime: slot.startTime.toISOString(),
      dueTime: slot.dueTime.toISOString(),
      createdAt: slot.createdAt.toISOString(),
      updatedAt: slot.updatedAt.toISOString(),
      labSubmissions: slot.labSubmissions.map(ls => ({
        id: ls.id,
        labId: ls.labId,
        labName: ls.lab?.labName || null,
        status: ls.status,
        submittedBy: ls.submittedBy?.fullName || null,
        submittedAt: ls.submittedAt?.toISOString() || null,
      })),
    });
  }, ['super_admin', 'admin', 'coordinator']);
}

// PATCH — Update slot
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slotId: string }> }
) {
  return withAuth(request, async (user) => {
    const { slotId } = await params;
    const validation = await validateBody(request, updateSlotSchema);
    if (validation.error) return validation.error;
    const data = validation.data!;

    const existing = await db.query.attendanceSlots.findFirst({
      where: (s, { eq: e }) => e(s.id, slotId),
    });
    if (!existing) return errorResponse('NOT_FOUND', 'Slot not found', 404);

    // Lifecycle validation
    if (data.status) {
      const validTransitions: Record<string, string[]> = {
        upcoming: ['open'],
        open: ['reminder_sent', 'grace_period', 'completed'],
        reminder_sent: ['grace_period', 'completed'],
        grace_period: ['missed', 'completed'],
        missed: ['completed'],
        completed: [],
      };
      const allowed = validTransitions[existing.status] || [];
      if (!allowed.includes(data.status)) {
        return errorResponse('INVALID_TRANSITION', `Cannot change status from '${existing.status}' to '${data.status}'`, 400);
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.slotName) updateData.slotName = data.slotName;
    if (data.startTime) updateData.startTime = new Date(data.startTime);
    if (data.dueTime) updateData.dueTime = new Date(data.dueTime);
    if (data.gracePeriodMinutes !== undefined) updateData.gracePeriodMinutes = data.gracePeriodMinutes;
    if (data.reminderMinutes !== undefined) updateData.reminderMinutes = data.reminderMinutes;
    if (data.escalationEnabled !== undefined) updateData.escalationEnabled = data.escalationEnabled;
    if (data.status) updateData.status = data.status;

    await db.update(attendanceSlots).set(updateData as any).where(eq(attendanceSlots.id, slotId));

    await createAuditLog({
      userId: user.sub,
      action: 'attendance_slot.updated',
      entityType: 'attendance_slot',
      entityId: slotId,
      oldValues: { status: existing.status },
      newValues: data as Record<string, unknown>,
    });

    return successResponse({ updated: true });
  }, ['super_admin', 'admin']);
}

// DELETE — Delete slot (only if upcoming)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slotId: string }> }
) {
  return withAuth(request, async (user) => {
    const { slotId } = await params;
    const existing = await db.query.attendanceSlots.findFirst({
      where: (s, { eq: e }) => e(s.id, slotId),
    });
    if (!existing) return errorResponse('NOT_FOUND', 'Slot not found', 404);
    if (existing.status !== 'upcoming') {
      return errorResponse('FORBIDDEN', 'Only upcoming slots can be deleted', 400);
    }

    await db.delete(attendanceSlots).where(eq(attendanceSlots.id, slotId));

    await createAuditLog({
      userId: user.sub,
      action: 'attendance_slot.deleted',
      entityType: 'attendance_slot',
      entityId: slotId,
    });

    return successResponse({ deleted: true });
  }, ['super_admin', 'admin']);
}
