export const runtime = 'nodejs';

import { db } from '@/db';
import { rounds } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { withAuth, successResponse, errorResponse, validateBody, createAuditLog } from '@/lib/api-utils';
import { z } from 'zod';

const updateRoundSchema = z.object({
  status: z.enum(['pending', 'open', 'locked']).optional(),
  roundName: z.string().min(1).max(100).optional(),
});

// GET /api/v1/rounds/[roundId]
export async function GET(request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  return withAuth(request, async () => {
    const { roundId } = await params;
    
    // First find the round
    const roundRecord = await db.query.rounds.findFirst({
      where: eq(rounds.id, roundId),
      with: {
        labAssignments: { columns: { id: true } },
        reviews: { columns: { id: true } },
        mentorAssignments: { columns: { id: true } },
      },
    });

    if (!roundRecord) return errorResponse('NOT_FOUND', 'Round not found', 404);

    const data = {
        id: roundRecord.id,
        eventId: roundRecord.eventId,
        roundName: roundRecord.roundName,
        roundOrder: roundRecord.roundOrder,
        status: roundRecord.status,
        opensAt: roundRecord.opensAt,
        lockedAt: roundRecord.lockedAt,
        lockedById: roundRecord.lockedById,
        _count: {
            labAssignments: roundRecord.labAssignments.length,
            reviews: roundRecord.reviews.length,
            mentorAssignments: roundRecord.mentorAssignments.length,
        }
    };

    return successResponse(data);
  });
}

// PATCH /api/v1/rounds/[roundId] — Open or lock a round
export async function PATCH(request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  return withAuth(request, async (user) => {
    const { roundId } = await params;
    const validation = await validateBody(request, updateRoundSchema);
    if (validation.error) return validation.error;
    const { status, roundName } = validation.data!;

    const existing = await db.query.rounds.findFirst({ where: eq(rounds.id, roundId) });
    if (!existing) return errorResponse('NOT_FOUND', 'Round not found', 404);

    // State machine validation
    if (status === 'open' && existing.status !== 'pending') {
      return errorResponse('INVALID_TRANSITION', 'Only pending rounds can be opened', 400);
    }
    if (status === 'locked' && existing.status !== 'open') {
      return errorResponse('INVALID_TRANSITION', 'Only open rounds can be locked', 400);
    }

    const updateData: Record<string, unknown> = {};
    if (roundName) updateData.roundName = roundName;
    if (status) {
      updateData.status = status;
      if (status === 'open') updateData.opensAt = new Date();
      if (status === 'locked') {
        updateData.lockedAt = new Date();
        updateData.lockedById = user.sub;
      }
    }

    const updatedRecords = await db.update(rounds)
        .set(updateData as any)
        .where(eq(rounds.id, roundId))
        .returning();

    const round = updatedRecords[0];

    await createAuditLog({
      userId: user.sub,
      action: `round.${status ?? 'updated'}`,
      entityType: 'round',
      entityId: roundId,
      newValues: { status, roundName },
    });

    return successResponse(round);
  }, ['super_admin', 'admin']);
}
