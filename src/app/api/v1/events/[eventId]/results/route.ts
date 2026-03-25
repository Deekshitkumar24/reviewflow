export const runtime = 'nodejs';

import { db } from '@/db';
import { results, teams, reviews, events } from '@/db/schema';
import { eq, and, isNull, desc, avg } from 'drizzle-orm';
import { withAuth, successResponse, errorResponse, validateBody, createAuditLog } from '@/lib/api-utils';
import { z } from 'zod';

const AWARD_TYPES = ['winner', 'runner_up', 'second_runner_up', 'finalist', 'special_mention', 'participant'] as const;

// ─── GET: list all team results for an event ─────────────────────────
// GET /api/v1/events/[eventId]/results
export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  return withAuth(request, async () => {
    const { eventId } = await params;

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), isNull(events.deletedAt)),
      columns: { id: true, eventName: true, status: true, totalRounds: true },
    });
    if (!event) return errorResponse('NOT_FOUND', 'Event not found', 404);

    // Get all active teams for this event
    const eventTeams = await db.query.teams.findMany({
      where: and(eq(teams.eventId, eventId), isNull(teams.deletedAt)),
      columns: {
        id: true, teamName: true, projectTitle: true,
        department: true, collegeName: true, domain: true,
      },
      with: {
        reviews: {
          where: (r, { eq }) => eq(r.isDraft, false),
          columns: { compositeScore: true, verdict: true, roundId: true },
          with: { round: { columns: { roundOrder: true } } },
        },
        result: true,
      },
    });

    // Compute average composite score per team across all final reviews
    const teamsWithScores = eventTeams.map(t => {
      const finalReviews = t.reviews;
      const avgScore = finalReviews.length > 0
        ? finalReviews.reduce((sum, r) => sum + parseFloat(r.compositeScore ?? '0'), 0) / finalReviews.length
        : 0;
      const maxRoundOrder = finalReviews.reduce((max, r) => Math.max(max, r.round?.roundOrder ?? 0), 0);
      return {
        teamId: t.id,
        teamName: t.teamName,
        projectTitle: t.projectTitle,
        department: t.department,
        collegeName: t.collegeName,
        domain: t.domain,
        avgScore: Math.round(avgScore * 100) / 100,
        reviewCount: finalReviews.length,
        highestRound: maxRoundOrder,
        result: t.result ? {
          id: t.result.id,
          finalPosition: t.result.finalPosition,
          awardType: t.result.awardType,
          isPublished: t.result.isPublished,
          declaredAt: t.result.declaredAt?.toISOString() ?? null,
        } : null,
      };
    });

    // Sort by avg score desc
    teamsWithScores.sort((a, b) => b.avgScore - a.avgScore);

    return successResponse({
      event: { id: event.id, eventName: event.eventName, status: event.status, totalRounds: event.totalRounds },
      teams: teamsWithScores,
      isPublished: teamsWithScores.some(t => t.result?.isPublished),
    });
  }, ['super_admin', 'admin']);
}

// ─── POST: upsert result for a team ─────────────────────────────────
const upsertResultSchema = z.object({
  teamId: z.string().uuid(),
  finalPosition: z.number().int().min(1).optional().nullable(),
  awardType: z.enum(AWARD_TYPES).optional().nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  return withAuth(request, async (user) => {
    const { eventId } = await params;
    const validation = await validateBody(request, upsertResultSchema);
    if (validation.error) return validation.error;
    const { teamId, finalPosition, awardType } = validation.data!;

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), isNull(events.deletedAt)),
    });
    if (!event) return errorResponse('NOT_FOUND', 'Event not found', 404);
    if (event.status === 'draft')
      return errorResponse('INVALID_STATE', 'Cannot declare results for a draft event', 422);

    // Check if already published (read-only)
    const existing = await db.query.results.findFirst({
      where: and(eq(results.eventId, eventId), eq(results.teamId, teamId)),
    });
    if (existing?.isPublished) {
      if (user.role !== 'super_admin')
        return errorResponse('LOCKED', 'Results are published and locked. Only super_admin can modify.', 403);
    }

    // Upsert
    const [upserted] = await db.insert(results)
      .values({
        eventId,
        teamId,
        finalPosition: finalPosition ?? null,
        awardType: awardType ?? null,
        declaredById: user.sub,
        declaredAt: new Date(),
        isPublished: false,
      })
      .onConflictDoUpdate({
        target: [results.eventId, results.teamId],
        set: {
          finalPosition: finalPosition ?? null,
          awardType: awardType ?? null,
          declaredById: user.sub,
          declaredAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    await createAuditLog({
      userId: user.sub,
      action: 'results.upsert',
      entityType: 'result',
      entityId: upserted.id,
      newValues: { teamId, finalPosition, awardType },
    });

    return successResponse(upserted);
  }, ['super_admin', 'admin']);
}
