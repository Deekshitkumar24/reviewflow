export const runtime = 'nodejs';

import { db } from '@/db';
import { labs } from '@/db/schema';
import { eq, and, isNull, count } from 'drizzle-orm';
import { withAuth, successResponse, errorResponse, validateBody, createAuditLog, parsePagination, paginationMeta } from '@/lib/api-utils';
import { z } from 'zod';

const createLabSchema = z.object({
  eventId: z.string().uuid(),
  labName: z.string().min(1).max(100),
  building: z.string().max(100).optional(),
  floor: z.string().max(20).optional(),
  capacity: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});

// GET /api/v1/labs
export async function GET(request: Request) {
  return withAuth(request, async () => {
    const url = new URL(request.url);
    const { page, limit, skip } = parsePagination(url);
    const eventIdParam = url.searchParams.get('eventId') || undefined;

    const conditions = [isNull(labs.deletedAt)];
    if (eventIdParam) conditions.push(eq(labs.eventId, eventIdParam));

    const whereClause = and(...conditions);

    const [labList, totalObj] = await Promise.all([
      db.query.labs.findMany({
        where: whereClause,
        limit,
        offset: skip,
        orderBy: (labs, { asc }) => [asc(labs.labName)],
        with: {
          labAssignments: { columns: { id: true } },
          mentorAssignments: { columns: { id: true } },
        },
      }),
      db.select({ value: count() }).from(labs).where(whereClause),
    ]);

    const data = labList.map((l) => ({
      id: l.id,
      eventId: l.eventId,
      labName: l.labName,
      building: l.building,
      floor: l.floor,
      capacity: l.capacity,
      status: l.status,
      notes: l.notes,
      teamCount: l.labAssignments.length,
      mentorCount: l.mentorAssignments.length,
      createdAt: l.createdAt.toISOString(),
    }));

    return successResponse(data, 200, { meta: paginationMeta(totalObj[0].value, page, limit) });
  });
}

// POST /api/v1/labs
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const validation = await validateBody(request, createLabSchema);
    if (validation.error) return validation.error;
    const data = validation.data!;

    const insertedList = await db.insert(labs).values({
      eventId: data.eventId,
      labName: data.labName,
      building: data.building || null,
      floor: data.floor || null,
      capacity: data.capacity,
      notes: data.notes || null,
      status: 'active',
    }).returning();
    
    const lab = insertedList[0];

    await createAuditLog({ userId: user.sub, action: 'lab.created', entityType: 'lab', entityId: lab.id, newValues: { labName: lab.labName } });
    return successResponse(lab, 201);
  }, ['super_admin', 'admin']);
}
