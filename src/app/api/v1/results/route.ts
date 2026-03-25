export const runtime = 'nodejs';

import { db } from '@/db';
import { results, events } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
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

    const resultList = await db.query.results.findMany({
      where: and(eq(results.eventId, eventId), eq(results.isPublished, true)),
      orderBy: [asc(results.finalPosition)],
      with: {
        team: { 
            columns: { teamName: true, projectTitle: true },
            with: { members: { columns: { fullName: true } } } 
        },
      },
    });

    const data = resultList.map(r => ({
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

    const event = await db.query.events.findFirst({ where: eq(events.id, data.eventId) });
    if (!event) return errorResponse('NOT_FOUND', 'Event not found', 404);

    if (event.status !== 'completed' && event.status !== 'active') {
      return errorResponse('INVALID_STATE', 'Event must be completed or active to declare results', 400);
    }

    const existing = await db.query.results.findFirst({
      where: and(eq(results.eventId, data.eventId), eq(results.teamId, data.teamId))
    });

    let resultRecord;

    if (existing) {
      const updatedList = await db.update(results).set({
          finalPosition: data.finalPosition || null,
          awardType: data.awardType || null,
          isPublished: true,
          declaredAt: new Date(),
          declaredById: user.sub,
      })
      .where(eq(results.id, existing.id))
      .returning();
      
      resultRecord = updatedList[0];
    } else {
      const insertedList = await db.insert(results).values({
          eventId: data.eventId,
          teamId: data.teamId,
          finalPosition: data.finalPosition || null,
          awardType: data.awardType || null,
          isPublished: true,
          declaredAt: new Date(),
          declaredById: user.sub,
      }).returning();
      
      resultRecord = insertedList[0];
    }

    await createAuditLog({
      userId: user.sub,
      action: 'result.declared',
      entityType: 'result',
      entityId: resultRecord.id,
      newValues: { finalPosition: data.finalPosition, awardType: data.awardType },
    });

    return successResponse(resultRecord, 201);
  }, ['super_admin', 'admin']);
}
