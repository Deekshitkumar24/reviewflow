export const runtime = 'nodejs';

import { db } from '@/db';
import { rounds, reviews, labAssignments } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { withAuth, successResponse, errorResponse, createAuditLog } from '@/lib/api-utils';

// POST /api/v1/rounds/[roundId]/advance
// Advances teams with verdict = 'selected' or 'shortlisted' to the next round
// Assigns them to the next round's labs (carries existing lab or unassigned)
export async function POST(request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  return withAuth(request, async (user) => {
    const { roundId } = await params;

    // Load the current round
    const currentRound = await db.query.rounds.findFirst({
      where: eq(rounds.id, roundId),
      with: { event: { with: { rounds: { orderBy: (r, { asc }) => [asc(r.roundOrder)] } } } },
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
    const eligibleReviews = await db.query.reviews.findMany({
      where: and(
        eq(reviews.roundId, roundId),
        eq(reviews.isDraft, false),
        inArray(reviews.verdict, ['selected', 'shortlisted'])
      ),
      columns: { teamId: true },
    });

    // Manually ensure distinct teamIds 
    const eligibleTeamIdsSet = new Set(eligibleReviews.map((r) => r.teamId));
    const eligibleTeamIds = Array.from(eligibleTeamIdsSet);

    if (eligibleTeamIds.length === 0) {
      return successResponse({
        message: 'No eligible teams found (require verdict = selected or shortlisted)',
        advancedCount: 0,
        nextRoundId: nextRound.id,
      });
    }

    // Open the next round if still pending
    if (nextRound.status === 'pending') {
      await db.update(rounds)
          .set({ status: 'open', opensAt: new Date() })
          .where(eq(rounds.id, nextRound.id));
    }

    // Create lab assignments for the next round
    // Keep teams in the same lab as current round if possible; else mark unassigned
    const currentAssignments = await db.query.labAssignments.findMany({
      where: and(eq(labAssignments.roundId, roundId), inArray(labAssignments.teamId, eligibleTeamIds)),
    });
    const currentLabMap = new Map(currentAssignments.map((a) => [a.teamId, a.labId]));

    // Skip teams already assigned to the next round
    const existingNextAssignments = await db.query.labAssignments.findMany({
      where: and(eq(labAssignments.roundId, nextRound.id), inArray(labAssignments.teamId, eligibleTeamIds)),
      columns: { teamId: true },
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
      await db.insert(labAssignments).values(toCreate);
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
