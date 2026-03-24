import prisma from '@/lib/prisma';
import { withAuth, successResponse, errorResponse, validateBody, parsePagination, paginationMeta, createAuditLog } from '@/lib/api-utils';
import { createEventSchema } from '@/validators';

// GET /api/v1/events — List events
export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    const url = new URL(request.url);
    const { page, limit, skip, q, sort, order } = parsePagination(url);
    const status = url.searchParams.get('status') || undefined;

    const where: Record<string, unknown> = { deletedAt: null };
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { eventName: { contains: q, mode: 'insensitive' } },
        { organizerName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: order },
        include: {
          _count: { select: { teams: true, rounds: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      }),
      prisma.event.count({ where }),
    ]);

    const data = events.map((e: typeof events[number]) => ({
      id: e.id,
      eventName: e.eventName,
      organizerName: e.organizerName,
      eventDate: e.eventDate.toISOString(),
      venue: e.venue,
      eventType: e.eventType,
      status: e.status,
      totalRounds: e.totalRounds,
      teamCount: e._count.teams,
      roundCount: e._count.rounds,
      createdAt: e.createdAt.toISOString(),
      createdBy: e.createdBy,
    }));

    return successResponse(data, 200, { meta: paginationMeta(total, page, limit) });
  });
}

// POST /api/v1/events — Create event
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const validation = await validateBody(request, createEventSchema);
    if (validation.error) return validation.error;
    const data = validation.data!;

    const event = await prisma.event.create({
      data: {
        eventName: data.eventName,
        organizerName: data.organizerName,
        description: data.description,
        eventDate: new Date(data.eventDate),
        venue: data.venue,
        eventType: data.eventType,
        totalRounds: data.totalRounds,
        suggestionsEnabled: data.suggestionsEnabled,
        allowMultiMentorReview: data.allowMultiMentorReview,
        createdById: user.sub,
        rounds: {
          create: data.rounds.map(r => ({
            roundName: r.roundName,
            roundOrder: r.roundOrder,
            status: r.roundOrder === 1 ? 'pending' : 'pending',
          })),
        },
      },
      include: { rounds: true },
    });

    await createAuditLog({
      userId: user.sub,
      action: 'event.created',
      entityType: 'event',
      entityId: event.id,
      newValues: { eventName: event.eventName },
    });

    return successResponse(event, 201);
  }, ['super_admin', 'admin']);
}

// DELETE /api/v1/events?id=... — Soft delete event
export async function DELETE(request: Request) {
  return withAuth(request, async (user) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return errorResponse('MISSING_ID', 'Event ID is required', 400);

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return errorResponse('NOT_FOUND', 'Event not found', 404);

    await prisma.event.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await createAuditLog({
      userId: user.sub,
      action: 'event.deleted',
      entityType: 'event',
      entityId: id,
      oldValues: { eventName: event.eventName },
    });

    return successResponse({ deleted: true }, 200);
  }, ['super_admin', 'admin']);
}
