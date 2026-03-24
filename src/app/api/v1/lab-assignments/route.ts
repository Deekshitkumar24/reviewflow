import prisma from '@/lib/prisma';
import { withAuth, successResponse, errorResponse, validateBody, createAuditLog } from '@/lib/api-utils';
import { z } from 'zod';

export const runtime = 'nodejs';

const assignSchema = z.object({
  teamId: z.string().uuid(),
  labId: z.string().uuid(),
  roundId: z.string().uuid(),
});

// GET /api/v1/lab-assignments
export async function GET(request: Request) {
  return withAuth(request, async () => {
    const url = new URL(request.url);
    const roundId = url.searchParams.get('roundId') || undefined;
    const labId = url.searchParams.get('labId') || undefined;
    const eventId = url.searchParams.get('eventId') || undefined;

    const where: Record<string, unknown> = {};
    if (roundId) where.roundId = roundId;
    if (labId) where.labId = labId;
    if (eventId) where.round = { eventId };

    const assignments = await prisma.labAssignment.findMany({
      where,
      orderBy: { assignedAt: 'desc' },
      include: {
        team: { select: { teamName: true, attendanceStatus: true } },
        lab: { select: { labName: true, building: true } },
        round: { select: { roundName: true, roundOrder: true, status: true } },
      },
    });

    return successResponse(assignments.map((a) => ({
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
    const existing = await prisma.labAssignment.findUnique({
      where: { teamId_roundId: { teamId, roundId } },
    });
    if (existing) {
      // Update to new lab
      const updated = await prisma.labAssignment.update({
        where: { teamId_roundId: { teamId, roundId } },
        data: { labId, assignedById: user.sub, assignedAt: new Date() },
      });
      return successResponse(updated);
    }

    const assignment = await prisma.labAssignment.create({
      data: { teamId, labId, roundId, assignedById: user.sub },
    });
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

    await prisma.labAssignment.deleteMany({ where: { teamId, roundId } });
    await createAuditLog({ userId: user.sub, action: 'lab_assignment.deleted', entityType: 'lab_assignment' });
    return successResponse({ message: 'Assignment removed' });
  }, ['super_admin', 'admin']);
}
