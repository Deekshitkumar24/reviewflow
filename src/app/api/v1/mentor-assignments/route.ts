import prisma from '@/lib/prisma';
import { withAuth, successResponse, errorResponse, validateBody, createAuditLog } from '@/lib/api-utils';
import { z } from 'zod';

export const runtime = 'nodejs';

const assignMentorSchema = z.object({
  mentorId: z.string().uuid(),
  labId: z.string().uuid(),
  roundId: z.string().uuid(),
});

// GET /api/v1/mentor-assignments
export async function GET(request: Request) {
  return withAuth(request, async (jwtUser) => {
    const url = new URL(request.url);
    const roundId = url.searchParams.get('roundId') || undefined;
    const labId = url.searchParams.get('labId') || undefined;
    const mentorId = url.searchParams.get('mentorId') || undefined;
    const eventId = url.searchParams.get('eventId') || undefined;

    const where: Record<string, unknown> = {};
    if (roundId) where.roundId = roundId;
    if (labId) where.labId = labId;
    if (eventId) where.round = { eventId };

    // Mentors can only see their own assignments
    if (jwtUser.role === 'mentor') {
      where.mentorId = jwtUser.sub;
    } else if (mentorId) {
      where.mentorId = mentorId;
    }

    const assignments = await prisma.mentorAssignment.findMany({
      where,
      orderBy: { assignedAt: 'desc' },
      include: {
        mentor: { select: { fullName: true, email: true } },
        lab: { select: { labName: true, building: true, floor: true } },
        round: { select: { roundName: true, roundOrder: true, status: true, eventId: true } },
      },
    });

    return successResponse(assignments.map((a) => ({
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

    const existing = await prisma.mentorAssignment.findUnique({
      where: { mentorId_labId_roundId: { mentorId, labId, roundId } },
    });
    if (existing) return errorResponse('CONFLICT', 'Mentor already assigned to this lab/round', 409);

    const assignment = await prisma.mentorAssignment.create({
      data: { mentorId, labId, roundId },
    });
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

    await prisma.mentorAssignment.deleteMany({ where: { mentorId, labId, roundId } });
    return successResponse({ message: 'Assignment removed' });
  }, ['super_admin', 'admin']);
}
