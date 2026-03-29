export const runtime = 'nodejs';

import { db } from '@/db';
import { coordinatorAssignments, labs } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { withAuth, successResponse, errorResponse, validateBody, createAuditLog } from '@/lib/api-utils';
import { z } from 'zod';

const assignSchema = z.object({
  coordinatorId: z.string().uuid(),
  labId: z.string().uuid(),
});

// GET /api/v1/coordinator-assignments
export async function GET(request: Request) {
  return withAuth(request, async (jwtUser) => {
    const url = new URL(request.url);
    const labIdParam = url.searchParams.get('labId') || undefined;
    const coordIdParam = url.searchParams.get('coordinatorId') || undefined;
    const eventIdParam = url.searchParams.get('eventId') || undefined;

    const conditions = [];
    if (labIdParam) conditions.push(eq(coordinatorAssignments.labId, labIdParam));

    // Coordinators can only see their own assignments
    if (jwtUser.role === 'coordinator') {
      conditions.push(eq(coordinatorAssignments.coordinatorId, jwtUser.sub));
    } else if (coordIdParam) {
      conditions.push(eq(coordinatorAssignments.coordinatorId, coordIdParam));
    }

    let finalAssignments: any[] = [];

    if (eventIdParam) {
      const results = await db.select()
        .from(coordinatorAssignments)
        .leftJoin(labs, eq(coordinatorAssignments.labId, labs.id))
        .where(
          and(
            eq(labs.eventId, eventIdParam),
            ...(conditions)
          )
        )
        .orderBy(desc(coordinatorAssignments.assignedAt));
      
      const ids = results.map(r => r.coordinator_assignments.id);
      
      if (ids.length === 0) {
          finalAssignments = [];
      } else {
          const fetched = await db.query.coordinatorAssignments.findMany({
            orderBy: [desc(coordinatorAssignments.assignedAt)],
            with: {
              coordinator: { columns: { fullName: true, email: true } },
              lab: { columns: { labName: true, building: true, floor: true, eventId: true } },
            },
          });
          finalAssignments = fetched.filter(f => ids.includes(f.id));
      }
    } else {
        finalAssignments = await db.query.coordinatorAssignments.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            orderBy: [desc(coordinatorAssignments.assignedAt)],
            with: {
              coordinator: { columns: { fullName: true, email: true } },
              lab: { columns: { labName: true, building: true, floor: true, eventId: true } },
            },
        });
    }

    return successResponse(finalAssignments.map((a) => ({
      id: a.id,
      coordinatorId: a.coordinatorId,
      coordinatorName: a.coordinator.fullName,
      coordinatorEmail: a.coordinator.email,
      labId: a.labId,
      labName: a.lab.labName,
      building: a.lab.building,
      floor: a.lab.floor,
      eventId: a.lab.eventId,
      assignedAt: a.assignedAt.toISOString(),
    })));
  });
}

// POST /api/v1/coordinator-assignments
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const validation = await validateBody(request, assignSchema);
    if (validation.error) return validation.error;
    const { coordinatorId, labId } = validation.data!;

    const existing = await db.query.coordinatorAssignments.findFirst({
      where: and(
          eq(coordinatorAssignments.coordinatorId, coordinatorId),
          eq(coordinatorAssignments.labId, labId)
      )
    });

    if (existing) return errorResponse('CONFLICT', 'Coordinator is already assigned to this lab', 409);

    const insertedList = await db.insert(coordinatorAssignments).values({ coordinatorId, labId }).returning();
    const assignment = insertedList[0];

    await createAuditLog({ userId: user.sub, action: 'coordinator_assignment.created', entityType: 'coordinator_assignment', entityId: assignment.id });
    return successResponse(assignment, 201);
  }, ['super_admin', 'admin']);
}

// DELETE /api/v1/coordinator-assignments?coordinatorId=&labId=
export async function DELETE(request: Request) {
  return withAuth(request, async (user) => {
    const url = new URL(request.url);
    const coordId = url.searchParams.get('coordinatorId');
    const labId = url.searchParams.get('labId');
    if (!coordId || !labId) return errorResponse('BAD_REQUEST', 'coordinatorId and labId required', 400);

    await db.delete(coordinatorAssignments).where(
        and(
            eq(coordinatorAssignments.coordinatorId, coordId),
            eq(coordinatorAssignments.labId, labId)
        )
    );

    await createAuditLog({ userId: user.sub, action: 'coordinator_assignment.deleted', entityType: 'coordinator_assignment' });
    return successResponse({ message: 'Assignment removed' });
  }, ['super_admin', 'admin']);
}
