export const runtime = 'nodejs';

import { db } from '@/db';
import { events, rounds, teams, reviews } from '@/db/schema';
import { eq, and, isNull, count, inArray } from 'drizzle-orm';
import { withAuth, successResponse, errorResponse, validateBody, createAuditLog } from '@/lib/api-utils';
import { z } from 'zod';

// ─── Valid transitions ────────────────────────────────────────────────
type EventStatus = 'draft' | 'active' | 'completed' | 'archived';
const VALID_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  draft:     ['active'],
  active:    ['completed', 'archived'],
  completed: ['archived'],
  archived:  [],
};

const statusSchema = z.object({
  status: z.enum(['active', 'completed', 'archived']),
  force: z.boolean().optional().default(false),
});

// PATCH /api/v1/events/[eventId]/status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  return withAuth(request, async (user) => {
    const { eventId } = await params;
    const validation = await validateBody(request, statusSchema);
    if (validation.error) return validation.error;
    const { status: newStatus, force } = validation.data!;

    // Load event with rounds + teams
    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), isNull(events.deletedAt)),
      with: {
        rounds: { orderBy: (r, { asc }) => [asc(r.roundOrder)] },
        teams:  { columns: { id: true, attendanceStatus: true } },
      },
    });
    if (!event) return errorResponse('NOT_FOUND', 'Event not found', 404);

    const currentStatus = event.status as EventStatus;
    const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(newStatus as EventStatus)) {
      return errorResponse(
        'INVALID_TRANSITION',
        `Cannot transition from "${currentStatus}" to "${newStatus}". Allowed: ${allowed.join(', ') || 'none'}`,
        422
      );
    }

    // ─── Business rules ─────────────────────────────────────────────
    const violations: string[] = [];

    if (newStatus === 'active') {
      if (event.rounds.length === 0)
        violations.push('Event must have at least one round before activation.');
      if (event.teams.length === 0)
        violations.push('Event must have at least one team before activation.');
    }

    if (newStatus === 'completed') {
      // All rounds must be locked or completed
      const openRounds = event.rounds.filter(r => r.status === 'open' || r.status === 'pending');
      if (openRounds.length > 0 && !force)
        violations.push(`${openRounds.length} round(s) are still open or pending. Lock all rounds before completing.`);

      // Check if any reviews are still draft
      const roundIds = event.rounds.map(r => r.id);
      let draftCount = 0;
      if (roundIds.length > 0) {
        const [draftReviewCountRow] = await db
          .select({ count: count() })
          .from(reviews)
          .where(and(
            inArray(reviews.roundId, roundIds),
            eq(reviews.isDraft, true)
          ));
        draftCount = Number(draftReviewCountRow?.count ?? 0);
      }
      if (draftCount > 0 && !force)
        violations.push(`${draftCount} review(s) are still in draft state.`);
    }

    if (violations.length > 0) {
      return errorResponse('BUSINESS_RULE_VIOLATION', violations.join(' '), 422);
    }

    // Apply transition
    const [updated] = await db.update(events)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(events.id, eventId))
      .returning();

    await createAuditLog({
      userId: user.sub,
      action: `event.status.${newStatus}`,
      entityType: 'event',
      entityId: eventId,
      oldValues: { status: currentStatus },
      newValues: { status: newStatus },
    });

    return successResponse({
      id: updated.id,
      status: updated.status,
      previousStatus: currentStatus,
    });
  }, ['super_admin', 'admin']);
}
