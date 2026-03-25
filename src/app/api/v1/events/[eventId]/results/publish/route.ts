export const runtime = 'nodejs';

import { db } from '@/db';
import { results, events } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuth, successResponse, errorResponse, validateBody, createAuditLog } from '@/lib/api-utils';
import { z } from 'zod';

const publishSchema = z.object({
  publish: z.boolean(),
});

// POST /api/v1/events/[eventId]/results/publish
// publish=true  → publish all results for this event
// publish=false → unpublish (super_admin only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  return withAuth(request, async (user) => {
    const { eventId } = await params;
    const validation = await validateBody(request, publishSchema);
    if (validation.error) return validation.error;
    const { publish } = validation.data!;

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), isNull(events.deletedAt)),
    });
    if (!event) return errorResponse('NOT_FOUND', 'Event not found', 404);

    if (event.status !== 'completed' && event.status !== 'active') {
      return errorResponse('INVALID_STATE', 'Results can only be published for active or completed events', 422);
    }

    // Unpublish requires super_admin
    if (!publish && user.role !== 'super_admin') {
      return errorResponse('FORBIDDEN', 'Only super_admin can unpublish results', 403);
    }

    // Publish: must have at least one result record
    if (publish) {
      const resultRecords = await db.query.results.findMany({
        where: eq(results.eventId, eventId),
      });
      if (resultRecords.length === 0) {
        return errorResponse('NO_RESULTS', 'No results have been declared yet. Assign awards before publishing.', 422);
      }
    }

    // Bulk update all results for this event
    await db.update(results)
      .set({ isPublished: publish, updatedAt: new Date() })
      .where(eq(results.eventId, eventId));

    await createAuditLog({
      userId: user.sub,
      action: publish ? 'results.published' : 'results.unpublished',
      entityType: 'event',
      entityId: eventId,
      newValues: { publish },
    });

    return successResponse({
      eventId,
      isPublished: publish,
      message: publish ? 'Results published successfully' : 'Results unpublished',
    });
  }, ['super_admin', 'admin']);
}
