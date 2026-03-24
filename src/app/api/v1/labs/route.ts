import prisma from '@/lib/prisma';
import { withAuth, successResponse, errorResponse, validateBody, createAuditLog, parsePagination, paginationMeta } from '@/lib/api-utils';
import { z } from 'zod';

export const runtime = 'nodejs';

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
    const eventId = url.searchParams.get('eventId') || undefined;

    const where: Record<string, unknown> = { deletedAt: null };
    if (eventId) where.eventId = eventId;

    const [labs, total] = await Promise.all([
      prisma.lab.findMany({
        where,
        skip,
        take: limit,
        orderBy: { labName: 'asc' },
        include: {
          _count: { select: { labAssignments: true, mentorAssignments: true } },
        },
      }),
      prisma.lab.count({ where }),
    ]);

    const data = labs.map((l) => ({
      id: l.id,
      eventId: l.eventId,
      labName: l.labName,
      building: l.building,
      floor: l.floor,
      capacity: l.capacity,
      status: l.status,
      notes: l.notes,
      teamCount: l._count.labAssignments,
      mentorCount: l._count.mentorAssignments,
      createdAt: l.createdAt.toISOString(),
    }));

    return successResponse(data, 200, { meta: paginationMeta(total, page, limit) });
  });
}

// POST /api/v1/labs
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const validation = await validateBody(request, createLabSchema);
    if (validation.error) return validation.error;
    const data = validation.data!;

    const lab = await prisma.lab.create({
      data: {
        eventId: data.eventId,
        labName: data.labName,
        building: data.building,
        floor: data.floor,
        capacity: data.capacity,
        notes: data.notes,
        status: 'active',
      },
    });

    await createAuditLog({ userId: user.sub, action: 'lab.created', entityType: 'lab', entityId: lab.id, newValues: { labName: lab.labName } });
    return successResponse(lab, 201);
  }, ['super_admin', 'admin']);
}
