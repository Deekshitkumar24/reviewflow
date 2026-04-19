export const runtime = 'nodejs';

import { db } from '@/db';
import { mentorAssignments, rounds } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { withAuth, successResponse, errorResponse, validateBody, createAuditLog } from '@/lib/api-utils';
import { z } from 'zod';

const assignMentorSchema = z.object({
  mentorId: z.string().uuid(),
  labId: z.string().uuid(),
  roundId: z.string().uuid(),
});

// GET /api/v1/mentor-assignments
export async function GET(request: Request) {
  return withAuth(request, async (jwtUser) => {
    const url = new URL(request.url);
    const roundIdParam = url.searchParams.get('roundId') || undefined;
    const labIdParam = url.searchParams.get('labId') || undefined;
    const mentorIdParam = url.searchParams.get('mentorId') || undefined;
    const eventIdParam = url.searchParams.get('eventId') || undefined;

    const conditions = [];
    if (roundIdParam) conditions.push(eq(mentorAssignments.roundId, roundIdParam));
    if (labIdParam) conditions.push(eq(mentorAssignments.labId, labIdParam));

    // Mentors can only see their own assignments
    if (jwtUser.role === 'mentor') {
      conditions.push(eq(mentorAssignments.mentorId, jwtUser.sub));
    } else if (mentorIdParam) {
      conditions.push(eq(mentorAssignments.mentorId, mentorIdParam));
    }

    let finalAssignments: any[] = [];

    if (eventIdParam) {
      // Manual join syntax requires retrieving explicitly linked data
      const results = await db.select()
        .from(mentorAssignments)
        .leftJoin(rounds, eq(mentorAssignments.roundId, rounds.id))
        .where(
          and(
            eq(rounds.eventId, eventIdParam),
            ...(conditions)
          )
        )
        .orderBy(desc(mentorAssignments.assignedAt));
      
      const ids = results.map(r => (r as any).mentor_assignments?.id || (r as any).id).filter(Boolean) as string[];
      
      if (ids.length === 0) {
          finalAssignments = [];
      } else {
          const fetched = await db.query.mentorAssignments.findMany({
            orderBy: [desc(mentorAssignments.assignedAt)],
            with: {
              mentor: { columns: { fullName: true, email: true } },
              lab: { columns: { labName: true, building: true, floor: true } },
              round: { columns: { roundName: true, roundOrder: true, status: true, eventId: true } },
            },
          });
          finalAssignments = fetched.filter(f => ids.includes(f.id));
      }
    } else {
        finalAssignments = await db.query.mentorAssignments.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            orderBy: [desc(mentorAssignments.assignedAt)],
            with: {
              mentor: { columns: { fullName: true, email: true } },
              lab: { columns: { labName: true, building: true, floor: true } },
              round: { columns: { roundName: true, roundOrder: true, status: true, eventId: true } },
            },
        });
    }

    return successResponse(finalAssignments.map((a) => ({
      id: a.id,
      mentorId: a.mentorId,
      mentorName: a.mentor.fullName,
      mentorEmail: a.mentor.email,
      labId: a.labId,
      labName: a.lab.labName,
      building: a.lab.building,
      floor: a.lab.floor,
      roundId: a.roundId,
      roundName: a.round.roundName,
      roundOrder: a.round.roundOrder,
      roundStatus: a.round.status,
      eventId: a.round.eventId,
      assignedAt: a.assignedAt.toISOString(),
    })));
  });
}

// POST /api/v1/mentor-assignments
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const validation = await validateBody(request, assignMentorSchema);
    if (validation.error) return validation.error;
    const { mentorId, labId, roundId } = validation.data!;

    const existing = await db.query.mentorAssignments.findFirst({
      where: and(
          eq(mentorAssignments.mentorId, mentorId),
          eq(mentorAssignments.labId, labId),
          eq(mentorAssignments.roundId, roundId)
      )
    });

    if (existing) return errorResponse('CONFLICT', 'Mentor already assigned to this lab/round', 409);

    const insertedList = await db.insert(mentorAssignments).values({ mentorId, labId, roundId }).returning();
    const assignment = insertedList[0];

    await createAuditLog({ userId: user.sub, action: 'mentor_assignment.created', entityType: 'mentor_assignment', entityId: assignment.id });
    return successResponse(assignment, 201);
  }, ['super_admin', 'admin']);
}

// DELETE /api/v1/mentor-assignments?mentorId=&labId=&roundId=
export async function DELETE(request: Request) {
  return withAuth(request, async (user) => {
    const url = new URL(request.url);
    const mentorId = url.searchParams.get('mentorId');
    const labId = url.searchParams.get('labId');
    const roundId = url.searchParams.get('roundId');
    if (!mentorId || !labId || !roundId) return errorResponse('BAD_REQUEST', 'mentorId, labId, roundId required', 400);

    await db.delete(mentorAssignments).where(
        and(
            eq(mentorAssignments.mentorId, mentorId),
            eq(mentorAssignments.labId, labId),
            eq(mentorAssignments.roundId, roundId)
        )
    );

    return successResponse({ message: 'Assignment removed' });
  }, ['super_admin', 'admin']);
}
