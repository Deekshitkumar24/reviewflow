export const runtime = 'nodejs';

import { db } from '@/db';
import { rounds } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { withAuth, successResponse } from '@/lib/api-utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  return withAuth(request, async () => {
    const { eventId } = await params;
    
    // Fetch rounds for the specified event
    const eventRounds = await db.query.rounds.findMany({
      where: eq(rounds.eventId, eventId),
      orderBy: [asc(rounds.roundOrder)],
    });

    return successResponse(eventRounds.map(r => ({
      id: r.id,
      eventId: r.eventId,
      roundName: r.roundName,
      status: r.status,
      roundOrder: r.roundOrder,
      createdAt: r.createdAt.toISOString(),
    })));
  });
}
