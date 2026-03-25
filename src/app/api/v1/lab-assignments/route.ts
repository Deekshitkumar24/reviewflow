export const runtime = 'nodejs';

import { db } from '@/db';
import { labAssignments, rounds } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { withAuth, successResponse, errorResponse, validateBody, createAuditLog } from '@/lib/api-utils';
import { z } from 'zod';

const assignSchema = z.object({
  teamId: z.string().uuid(),
  labId: z.string().uuid(),
  roundId: z.string().uuid(),
});

// GET /api/v1/lab-assignments
export async function GET(request: Request) {
  return withAuth(request, async () => {
    const url = new URL(request.url);
    const roundIdParam = url.searchParams.get('roundId') || undefined;
    const labIdParam = url.searchParams.get('labId') || undefined;
    const eventIdParam = url.searchParams.get('eventId') || undefined;

    const conditions = [];
    if (roundIdParam) conditions.push(eq(labAssignments.roundId, roundIdParam));
    if (labIdParam) conditions.push(eq(labAssignments.labId, labIdParam));
    
    // We cannot easily do relation-based filtering with simple where clauses in findMany 
    // when using relational mapping without a native join. Since this is an admin dashboard only:
    let finalAssignments: any[] = [];

    if (eventIdParam) {
      // Manual join syntax required for filtering by a relation's property
      const results = await db.select()
        .from(labAssignments)
        .leftJoin(rounds, eq(labAssignments.roundId, rounds.id))
        .where(
          and(
            eq(rounds.eventId, eventIdParam),
            ...(conditions)
          )
        )
        .orderBy(desc(labAssignments.assignedAt));
      
      // Need to re-query with relations for the full payload, or populate it manually.
      // Easiest is to pluck IDs and re-query standard relational.
      const ids = results.map(r => r.lab_assignments.id);
      
      if (ids.length === 0) {
          finalAssignments = [];
      } else {
          // Fallback manual query for these specific IDs
          // Not the most performant, but safe for admin listings up to ~1000 assignments per event.
          const fetched = await db.query.labAssignments.findMany({
            orderBy: [desc(labAssignments.assignedAt)],
            with: {
              team: { columns: { teamName: true, attendanceStatus: true } },
              lab: { columns: { labName: true, building: true } },
              round: { columns: { roundName: true, roundOrder: true, status: true } },
            },
          });
          // Memory filter since IN operator mapping inside query builder can be verbose dynamically
          finalAssignments = fetched.filter(f => ids.includes(f.id));
      }
    } else {
        finalAssignments = await db.query.labAssignments.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            orderBy: [desc(labAssignments.assignedAt)],
            with: {
              team: { columns: { teamName: true, attendanceStatus: true } },
              lab: { columns: { labName: true, building: true } },
              round: { columns: { roundName: true, roundOrder: true, status: true } },
            },
        });
    }

    return successResponse(finalAssignments.map((a) => ({
      id: a.id,
      teamId: a.teamId,
      teamName: a.team.teamName,
      attendanceStatus: a.team.attendanceStatus,
      labId: a.labId,
      labName: a.lab.labName,
      building: a.lab.building,
      roundId: a.roundId,
      roundName: a.round.roundName,
      roundOrder: a.round.roundOrder,
      roundStatus: a.round.status,
      assignedAt: a.assignedAt.toISOString(),
    })));
  });
}

// POST /api/v1/lab-assignments — Assign a team to a lab in a round
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const validation = await validateBody(request, assignSchema);
    if (validation.error) return validation.error;
    const { teamId, labId, roundId } = validation.data!;

    // Check for existing assignment in this round
    const existing = await db.query.labAssignments.findFirst({
      where: and(eq(labAssignments.teamId, teamId), eq(labAssignments.roundId, roundId))
    });

    if (existing) {
      // Update to new lab
      const updatedList = await db.update(labAssignments).set({
        labId,
        assignedById: user.sub,
        assignedAt: new Date(),
      }).where(
        and(eq(labAssignments.teamId, teamId), eq(labAssignments.roundId, roundId))
      ).returning();

      return successResponse(updatedList[0]);
    }

    const insertedList = await db.insert(labAssignments).values({
      teamId,
      labId,
      roundId,
      assignedById: user.sub,
    }).returning();
    
    const assignment = insertedList[0];

    await createAuditLog({ userId: user.sub, action: 'lab_assignment.created', entityType: 'lab_assignment', entityId: assignment.id });
    return successResponse(assignment, 201);
  }, ['super_admin', 'admin', 'coordinator']);
}

// DELETE /api/v1/lab-assignments?teamId=&roundId=
export async function DELETE(request: Request) {
  return withAuth(request, async (user) => {
    const url = new URL(request.url);
    const teamId = url.searchParams.get('teamId');
    const roundId = url.searchParams.get('roundId');
    if (!teamId || !roundId) return errorResponse('BAD_REQUEST', 'teamId and roundId required', 400);

    await db.delete(labAssignments).where(
        and(eq(labAssignments.teamId, teamId), eq(labAssignments.roundId, roundId))
    );
    
    await createAuditLog({ userId: user.sub, action: 'lab_assignment.deleted', entityType: 'lab_assignment' });
    return successResponse({ message: 'Assignment removed' });
  }, ['super_admin', 'admin']);
}
