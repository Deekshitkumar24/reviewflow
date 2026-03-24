export const runtime = 'nodejs';

import prisma from '@/lib/prisma';
import { withAuth, successResponse, errorResponse, validateBody, createAuditLog } from '@/lib/api-utils';
import { z } from 'zod';

const declareResultSchema = z.object({
  eventId: z.string().uuid(),
  teamId: z.string().uuid(),
  finalPosition: z.number().min(1).optional(),
  awardType: z.string().optional(),
});

// GET /api/v1/results?eventId=...
export async function GET(request: Request) {
  return withAuth(request, async () => {
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId');
    if (!eventId) return errorResponse('MISSING_EVENT_ID', 'Event ID is required', 400);

    const results = await prisma.result.findMany({
      where: { eventId, isPublished: true },
      orderBy: { finalPosition: 'asc' },
      include: {
        team: { select: { teamName: true, projectTitle: true, members: { select: { fullName: true } } } },
      },
    });

    const data = results.map(r => ({
      id: r.id,
      teamId: r.teamId,
      teamName: r.team.teamName,
      projectTitle: r.team.projectTitle,
      finalPosition: r.finalPosition,
      awardType: r.awardType,
      declaredAt: r.declaredAt?.toISOString(),
      members: r.team.members.map(m => m.fullName),
    }));

    return successResponse(data, 200);
  });
}

// POST /api/v1/results
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const validation = await validateBody(request, declareResultSchema);
    if (validation.error) return validation.error;
    const data = validation.data!;

    const event = await prisma.event.findUnique({ where: { id: data.eventId } });
    if (!event) return errorResponse('NOT_FOUND', 'Event not found', 404);

    if (event.status !== 'completed' && event.status !== 'active') {
      return errorResponse('INVALID_STATE', 'Event must be completed or active to declare results', 400);
    }

    const existing = await prisma.result.findFirst({
      where: { eventId: data.eventId, teamId: data.teamId }
    });

    let result;
    if (existing) {
      result = await prisma.result.update({
        where: { id: existing.id },
        data: {
          finalPosition: data.finalPosition,
          awardType: data.awardType,
          isPublished: true,
          declaredAt: new Date(),
          declaredById: user.sub,
        }
      });
    } else {
      result = await prisma.result.create({
        data: {
          eventId: data.eventId,
          teamId: data.teamId,
          finalPosition: data.finalPosition,
          awardType: data.awardType,
          isPublished: true,
          declaredAt: new Date(),
          declaredById: user.sub,
        }
      });
    }

    await createAuditLog({
      userId: user.sub,
      action: 'result.declared',
      entityType: 'result',
      entityId: result.id,
      newValues: { finalPosition: data.finalPosition, awardType: data.awardType },
    });

    return successResponse(result, 201);
  }, ['super_admin', 'admin']);
}
