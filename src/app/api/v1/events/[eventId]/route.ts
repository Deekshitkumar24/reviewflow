export const runtime = 'nodejs';

import { db } from '@/db';
import { events, reviews } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuth, successResponse, errorResponse, validateBody, createAuditLog } from '@/lib/api-utils';
import { z } from 'zod';

// GET /api/v1/events/[eventId]
export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  return withAuth(request, async () => {
    const { eventId } = await params;
    
    const eventRecord = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), isNull(events.deletedAt)),
      with: {
        rounds: { 
          orderBy: (rounds, { asc }) => [asc(rounds.roundOrder)],
          with: { reviews: { columns: { id: true, isDraft: true } }, labAssignments: { columns: { id: true } }, mentorAssignments: { columns: { id: true } } }
        },
        labs: { 
          // filter inline if needed or via JS. Drizzle handles it best in memory for small counts.
          with: { labAssignments: { columns: { id: true } }, mentorAssignments: { columns: { id: true } } }
        },
        teams: { columns: { id: true } },
        createdBy: { columns: { email: true, fullName: true } }
      }
    });

    if (!eventRecord) return errorResponse('NOT_FOUND', 'Event not found', 404);

    const teamCount = eventRecord.teams.length;

    // Per-round completion stats
    const roundStats = eventRecord.rounds.map((r) => {
      const submittedReviews = r.reviews.filter(rev => !rev.isDraft).length;
      return {
        id: r.id,
        roundName: r.roundName,
        roundOrder: r.roundOrder,
        status: r.status,
        opensAt: r.opensAt?.toISOString() ?? null,
        lockedAt: r.lockedAt?.toISOString() ?? null,
        labCount: r.labAssignments.length,
        mentorCount: r.mentorAssignments.length,
        submittedReviews,
        teamCount,
        progress: teamCount > 0 ? Math.round((submittedReviews / teamCount) * 100) : 0,
      };
    });

    // Lab stats
    const activeLabs = eventRecord.labs.filter(l => !l.deletedAt);

    return successResponse({
      id: eventRecord.id,
      eventName: eventRecord.eventName,
      organizerName: eventRecord.organizerName,
      description: eventRecord.description,
      eventDate: eventRecord.eventDate,
      venue: eventRecord.venue,
      eventType: eventRecord.eventType,
      status: eventRecord.status,
      totalRounds: eventRecord.totalRounds,
      suggestionsEnabled: eventRecord.suggestionsEnabled,
      allowMultiMentorReview: eventRecord.allowMultiMentorReview,
      teamCount,
      createdBy: eventRecord.createdBy,
      rounds: roundStats,
      labs: activeLabs.map((l) => ({
        id: l.id,
        labName: l.labName,
        building: l.building,
        floor: l.floor,
        capacity: l.capacity,
        status: l.status,
        teamCount: l.labAssignments.length,
        mentorCount: l.mentorAssignments.length,
      })),
    });
  });
}

const updateEventSchema = z.object({
  eventName: z.string().min(1).max(200).optional(),
  organizerName: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  eventDate: z.string().optional(),
  venue: z.string().max(300).optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']).optional(),
  suggestionsEnabled: z.boolean().optional(),
  allowMultiMentorReview: z.boolean().optional(),
});

// PATCH /api/v1/events/[eventId]
export async function PATCH(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  return withAuth(request, async (user) => {
    const { eventId } = await params;
    const validation = await validateBody(request, updateEventSchema);
    if (validation.error) return validation.error;
    const data = validation.data!;

    const existing = await db.query.events.findFirst({ where: and(eq(events.id, eventId), isNull(events.deletedAt)) });
    if (!existing) return errorResponse('NOT_FOUND', 'Event not found', 404);

    const updateData: any = { ...data };
    
    const updatedRecords = await db.update(events).set(updateData).where(eq(events.id, eventId)).returning();
    const updatedEvent = updatedRecords[0];

    await createAuditLog({ userId: user.sub, action: 'event.updated', entityType: 'event', entityId: eventId, newValues: data as Record<string, unknown> });
    
    return successResponse(updatedEvent);
  }, ['super_admin', 'admin']);
}
