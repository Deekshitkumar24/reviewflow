export const runtime = 'nodejs';

import { db } from '@/db';
import { events, rounds } from '@/db/schema';
import { eq, or, ilike, and, isNull, desc, asc, count } from 'drizzle-orm';
import { withAuth, successResponse, errorResponse, validateBody, parsePagination, paginationMeta, createAuditLog } from '@/lib/api-utils';
import { createEventSchema } from '@/validators';

// GET /api/v1/events — List events
export async function GET(request: Request) {
  return withAuth(request, async () => {
    const url = new URL(request.url);
    const { page, limit, skip, q, order } = parsePagination(url);
    const status = url.searchParams.get('status') || undefined;

    const conditions = [isNull(events.deletedAt)];
    if (status) conditions.push(eq(events.status, status)!);
    if (q) {
      conditions.push(or(
        ilike(events.eventName, `%${q}%`),
        ilike(events.organizerName, `%${q}%`)
      )!);
    }

    const whereClause = and(...conditions);

    const [eventList, totalObj] = await Promise.all([
      db.query.events.findMany({
        where: whereClause,
        limit,
        offset: skip,
        orderBy: [order === 'asc' ? asc(events.createdAt) : desc(events.createdAt)],
        with: {
          teams: { columns: { id: true } },
          rounds: { columns: { id: true } },
          createdBy: { columns: { id: true, fullName: true } }
        }
      }),
      db.select({ value: count() }).from(events).where(whereClause),
    ]);

    const data = eventList.map(e => ({
      id: e.id,
      eventName: e.eventName,
      organizerName: e.organizerName,
      eventDate: e.eventDate, // String or Date depending on driver
      venue: e.venue,
      eventType: e.eventType,
      status: e.status,
      totalRounds: e.totalRounds,
      teamCount: e.teams.length,
      roundCount: e.rounds.length,
      createdAt: e.createdAt.toISOString(),
      createdBy: e.createdBy,
    }));

    return successResponse(data, 200, { meta: paginationMeta(totalObj[0].value, page, limit) });
  });
}

// POST /api/v1/events — Create event
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const validation = await validateBody(request, createEventSchema);
    if (validation.error) return validation.error;
    const data = validation.data!;

    // neon-http does not support .transaction(), so we do sequential inserts with manual rollback
    let e: any;
    let newEvent;
    try {
      const inserted = await db.insert(events).values({
        eventName: data.eventName,
        organizerName: data.organizerName,
        description: data.description || null,
        eventDate: data.eventDate, 
        venue: data.venue,
        eventType: data.eventType,
        totalRounds: data.totalRounds,
        suggestionsEnabled: data.suggestionsEnabled,
        allowMultiMentorReview: data.allowMultiMentorReview,
        createdById: user.sub,
      }).returning();
      
      e = inserted[0];

      const roundInserts = data.rounds.map(r => ({
        eventId: e.id,
        roundName: r.roundName,
        roundOrder: r.roundOrder,
        status: 'pending',
      }));

      const createdRounds = await db.insert(rounds).values(roundInserts).returning();

      newEvent = { ...e, rounds: createdRounds };
    } catch (error) {
      if (e?.id) {
        // Rollback event if rounds failed
        await db.delete(events).where(eq(events.id, e.id));
      }
      throw error;
    }

    await createAuditLog({
      userId: user.sub,
      action: 'event.created',
      entityType: 'event',
      entityId: newEvent.id,
      newValues: { eventName: newEvent.eventName },
    });

    return successResponse(newEvent, 201);
  }, ['super_admin', 'admin']);
}

// DELETE /api/v1/events?id=... — Soft delete event
export async function DELETE(request: Request) {
  return withAuth(request, async (user) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return errorResponse('MISSING_ID', 'Event ID is required', 400);

    const eventRecord = await db.query.events.findFirst({ where: eq(events.id, id) });
    if (!eventRecord) return errorResponse('NOT_FOUND', 'Event not found', 404);

    await db.update(events)
      .set({ deletedAt: new Date() })
      .where(eq(events.id, id));

    await createAuditLog({
      userId: user.sub,
      action: 'event.deleted',
      entityType: 'event',
      entityId: id,
      oldValues: { eventName: eventRecord.eventName },
    });

    return successResponse({ deleted: true }, 200);
  }, ['super_admin']);
}
