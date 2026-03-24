import prisma from '@/lib/prisma';
import { withAuth, successResponse, errorResponse, createAuditLog } from '@/lib/api-utils';

export const runtime = 'nodejs';

// POST /api/v1/rounds/[roundId]/advance
// Advances teams with verdict = 'selected' or 'shortlisted' to the next round
// Assigns them to the next round's labs (carries existing lab or unassigned)
export async function POST(request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  return withAuth(request, async (user) => {
    const { roundId } = await params;

    // Load the current round
    const currentRound = await prisma.round.findUnique({
      where: { id: roundId },
      include: { event: { include: { rounds: { orderBy: { roundOrder: 'asc' } } } } },
    });
    if (!currentRound) return errorResponse('NOT_FOUND', 'Round not found', 404);
    if (currentRound.status !== 'locked') {
      return errorResponse('ROUND_NOT_LOCKED', 'Round must be locked before advancing teams', 400);
    }

    // Find the next round
    const nextRound = currentRound.event.rounds.find(
      (r) => r.roundOrder === currentRound.roundOrder + 1
    );
    if (!nextRound) return errorResponse('NO_NEXT_ROUND', 'No next round exists for this event', 400);

    // Find eligible teams (selected or shortlisted in current round)
    const eligibleReviews = await prisma.review.findMany({
      where: {
        roundId,
        isDraft: false,
        verdict: { in: ['selected', 'shortlisted'] },
      },
      select: { teamId: true },
      distinct: ['teamId'],
    });

    const eligibleTeamIds = eligibleReviews.map((r) => r.teamId);

    if (eligibleTeamIds.length === 0) {
      return successResponse({
        message: 'No eligible teams found (require verdict = selected or shortlisted)',
        advancedCount: 0,
        nextRoundId: nextRound.id,
      });
    }

    // Open the next round if still pending
    if (nextRound.status === 'pending') {
      await prisma.round.update({
        where: { id: nextRound.id },
        data: { status: 'open', opensAt: new Date() },
      });
    }

    // Create lab assignments for the next round
    // Keep teams in the same lab as current round if possible; else mark unassigned
    const currentAssignments = await prisma.labAssignment.findMany({
      where: { roundId, teamId: { in: eligibleTeamIds } },
    });
    const currentLabMap = new Map(currentAssignments.map((a) => [a.teamId, a.labId]));

    // Skip teams already assigned to the next round
    const existingNextAssignments = await prisma.labAssignment.findMany({
      where: { roundId: nextRound.id, teamId: { in: eligibleTeamIds } },
      select: { teamId: true },
    });
    const alreadyAssigned = new Set(existingNextAssignments.map((a) => a.teamId));

    const toCreate = eligibleTeamIds
      .filter((teamId) => !alreadyAssigned.has(teamId) && currentLabMap.has(teamId))
      .map((teamId) => ({
        teamId,
        labId: currentLabMap.get(teamId)!,
        roundId: nextRound.id,
        assignedById: user.sub,
      }));

    if (toCreate.length > 0) {
      await prisma.labAssignment.createMany({ data: toCreate });
    }

    await createAuditLog({
      userId: user.sub,
      action: 'round.advanced',
      entityType: 'round',
      entityId: roundId,
      newValues: {
        nextRoundId: nextRound.id,
        eligibleTeams: eligibleTeamIds.length,
        advancedTeams: toCreate.length,
      },
    });

    return successResponse({
      message: `${eligibleTeamIds.length} team(s) eligible. ${toCreate.length} lab assignments created for next round.`,
      eligibleTeamIds,
      advancedCount: toCreate.length,
      nextRoundId: nextRound.id,
      nextRoundName: nextRound.roundName,
    });
  }, ['super_admin', 'admin']);
}
