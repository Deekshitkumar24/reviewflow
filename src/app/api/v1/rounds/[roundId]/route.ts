import prisma from '@/lib/prisma';
import { withAuth, successResponse, errorResponse, validateBody, createAuditLog } from '@/lib/api-utils';
import { z } from 'zod';

export const runtime = 'nodejs';

const updateRoundSchema = z.object({
  status: z.enum(['pending', 'open', 'locked']).optional(),
  roundName: z.string().min(1).max(100).optional(),
});

// GET /api/v1/rounds/[roundId]
export async function GET(request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  return withAuth(request, async () => {
    const { roundId } = await params;
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: {
        _count: { select: { labAssignments: true, reviews: true, mentorAssignments: true } },
      },
    });
    if (!round) return errorResponse('NOT_FOUND', 'Round not found', 404);
    return successResponse(round);
  });
}

// PATCH /api/v1/rounds/[roundId] — Open or lock a round
export async function PATCH(request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  return withAuth(request, async (user) => {
    const { roundId } = await params;
    const validation = await validateBody(request, updateRoundSchema);
    if (validation.error) return validation.error;
    const { status, roundName } = validation.data!;

    const existing = await prisma.round.findUnique({ where: { id: roundId } });
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

    const round = await prisma.round.update({ where: { id: roundId }, data: updateData });
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
