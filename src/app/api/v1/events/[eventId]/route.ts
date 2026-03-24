import prisma from '@/lib/prisma';
import { withAuth, successResponse, errorResponse, validateBody, createAuditLog } from '@/lib/api-utils';
import { z } from 'zod';

export const runtime = 'nodejs';

// GET /api/v1/events/[eventId]
export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  return withAuth(request, async () => {
    const { eventId } = await params;
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      include: {
        rounds: { orderBy: { roundOrder: 'asc' }, include: { _count: { select: { reviews: true, labAssignments: true, mentorAssignments: true } } } },
        labs: { where: { deletedAt: null }, include: { _count: { select: { labAssignments: true, mentorAssignments: true } } } },
        _count: { select: { teams: true } },
        createdBy: { select: { fullName: true, email: true } },
      },
    });
    if (!event) return errorResponse('NOT_FOUND', 'Event not found', 404);

    // Per-round completion stats
    const roundStats = await Promise.all(
      event.rounds.map(async (r) => {
        const teamCount = event._count.teams;
        const submittedReviews = await prisma.review.count({
          where: { roundId: r.id, isDraft: false },
        });
        return {
          id: r.id,
          roundName: r.roundName,
          roundOrder: r.roundOrder,
          status: r.status,
          opensAt: r.opensAt?.toISOString() ?? null,
          lockedAt: r.lockedAt?.toISOString() ?? null,
          labCount: r._count.labAssignments,
          mentorCount: r._count.mentorAssignments,
          submittedReviews,
          teamCount,
          progress: teamCount > 0 ? Math.round((submittedReviews / teamCount) * 100) : 0,
        };
      })
    );

    return successResponse({
      id: event.id,
      eventName: event.eventName,
      organizerName: event.organizerName,
      description: event.description,
      eventDate: event.eventDate.toISOString(),
      venue: event.venue,
      eventType: event.eventType,
      status: event.status,
      totalRounds: event.totalRounds,
      suggestionsEnabled: event.suggestionsEnabled,
      allowMultiMentorReview: event.allowMultiMentorReview,
      teamCount: event._count.teams,
      createdBy: event.createdBy,
      rounds: roundStats,
      labs: event.labs.map((l) => ({
        id: l.id,
        labName: l.labName,
        building: l.building,
        floor: l.floor,
        capacity: l.capacity,
        status: l.status,
        teamCount: l._count.labAssignments,
        mentorCount: l._count.mentorAssignments,
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

    const existing = await prisma.event.findFirst({ where: { id: eventId, deletedAt: null } });
    if (!existing) return errorResponse('NOT_FOUND', 'Event not found', 404);

    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        ...data,
        ...(data.eventDate ? { eventDate: new Date(data.eventDate) } : {}),
      },
    });
    await createAuditLog({ userId: user.sub, action: 'event.updated', entityType: 'event', entityId: eventId, newValues: data as Record<string, unknown> });
    return successResponse(event);
  }, ['super_admin', 'admin']);
}
