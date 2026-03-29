import { db } from '@/db';
import { attendanceSlots } from '@/db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { withAuth, validateBody, errorResponse, successResponse, createAuditLog, parsePagination, paginationMeta } from '@/lib/api-utils';
import { createAttendanceSlotSchema } from '@/validators';
import { z } from 'zod';

export const runtime = 'nodejs';

// GET — List attendance slots for an event
export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId');
    if (!eventId) return errorResponse('BAD_REQUEST', 'eventId is required', 400);

    const slots = await db.query.attendanceSlots.findMany({
      where: (s, { eq: e }) => e(s.eventId, eventId),
      orderBy: (s) => [asc(s.slotDate), asc(s.slotNumber)],
    });

    return successResponse(slots.map(s => ({
      id: s.id,
      eventId: s.eventId,
      slotDate: s.slotDate.toISOString(),
      slotNumber: s.slotNumber,
      slotName: s.slotName,
      startTime: s.startTime.toISOString(),
      dueTime: s.dueTime.toISOString(),
      gracePeriodMinutes: s.gracePeriodMinutes,
      reminderMinutes: s.reminderMinutes,
      escalationEnabled: s.escalationEnabled,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
    })));
  }, ['super_admin', 'admin', 'coordinator']);
}

// POST — Create a new attendance slot
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const validation = await validateBody(request, createAttendanceSlotSchema);
    if (validation.error) return validation.error;
    const data = validation.data!;

    const startTime = new Date(data.startTime);
    const dueTime = new Date(data.dueTime);
    if (dueTime <= startTime) {
      return errorResponse('VALIDATION_ERROR', 'Due time must be after start time', 400);
    }

    // Check uniqueness
    const existing = await db.query.attendanceSlots.findFirst({
      where: (s, { eq: e, and: a }) => a(
        e(s.eventId, data.eventId),
        e(s.slotNumber, data.slotNumber),
      ),
    });

    if (existing && existing.slotDate.toDateString() === new Date(data.slotDate).toDateString()) {
      return errorResponse('DUPLICATE', `Slot #${data.slotNumber} already exists for this date`, 409);
    }

    const [slot] = await db.insert(attendanceSlots).values({
      eventId: data.eventId,
      slotDate: new Date(data.slotDate),
      slotNumber: data.slotNumber,
      slotName: data.slotName,
      startTime,
      dueTime,
      gracePeriodMinutes: data.gracePeriodMinutes,
      reminderMinutes: data.reminderMinutes,
      escalationEnabled: data.escalationEnabled,
      createdById: user.sub,
    }).returning();

    await createAuditLog({
      userId: user.sub,
      action: 'attendance_slot.created',
      entityType: 'attendance_slot',
      entityId: slot.id,
      newValues: { slotName: data.slotName, slotNumber: data.slotNumber },
    });

    return successResponse({ id: slot.id, slotName: slot.slotName }, 201);
  }, ['super_admin', 'admin']);
}
