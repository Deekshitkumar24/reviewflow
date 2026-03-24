import prisma from '@/lib/prisma';
import { withAuth, successResponse } from '@/lib/api-utils';

export const runtime = 'nodejs';

// GET /api/v1/live-monitor?eventId=...
export async function GET(request: Request) {
  return withAuth(request, async () => {
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId');

    const where: Record<string, unknown> = { deletedAt: null };
    if (eventId) where.eventId = eventId;

    // Fetch all labs for the event
    const labs = await prisma.lab.findMany({
      where,
      include: {
        labAssignments: {
          include: {
            team: { select: { id: true, teamName: true, attendanceStatus: true } },
            round: { select: { roundName: true, roundOrder: true, status: true } },
          },
        },
        mentorAssignments: {
          include: { mentor: { select: { fullName: true } } },
        },
      },
    });

    // For each lab, count reviews submitted in the active round
    const eventData = eventId
      ? await prisma.event.findFirst({
          where: { id: eventId },
          include: {
            rounds: { where: { status: 'open' }, orderBy: { roundOrder: 'asc' }, take: 1 },
            _count: { select: { teams: true } },
          },
        })
      : null;

    const activeRoundId = eventData?.rounds[0]?.id;

    const labStats = await Promise.all(
      labs.map(async (lab) => {
        const assignedInActiveRound = lab.labAssignments.filter(
          (a) => !activeRoundId || a.roundId === activeRoundId
        );
        const teamIds = assignedInActiveRound.map((a) => a.teamId);
        const reviewed = activeRoundId
          ? await prisma.review.count({ where: { labId: lab.id, roundId: activeRoundId, isDraft: false } })
          : 0;
        const checkedIn = assignedInActiveRound.filter(
          (a) => a.team.attendanceStatus === 'checked_in'
        ).length;

        const total = teamIds.length;
        const progressPct = total > 0 ? Math.round((reviewed / total) * 100) : 0;
        const status =
          progressPct === 100 ? 'complete' : progressPct >= 60 ? 'on_track' : progressPct >= 30 ? 'slow' : 'delayed';

        return {
          labId: lab.id,
          labName: lab.labName,
          building: lab.building,
          floor: lab.floor,
          status,
          progressPct,
          totalTeams: total,
          reviewed,
          checkedIn,
          pending: total - reviewed,
          mentors: lab.mentorAssignments.map((m) => m.mentor.fullName),
          teams: assignedInActiveRound.map((a) => ({
            teamId: a.team.id,
            teamName: a.team.teamName,
            attendanceStatus: a.team.attendanceStatus,
          })),
        };
      })
    );

    const totalTeams = eventData?._count.teams ?? labStats.reduce((s, l) => s + l.totalTeams, 0);
    const totalReviewed = labStats.reduce((s, l) => s + l.reviewed, 0);
    const totalCheckedIn = labStats.reduce((s, l) => s + l.checkedIn, 0);

    return successResponse({
      eventId,
      activeRoundId,
      activeRoundName: eventData?.rounds[0]?.roundName ?? null,
      totalTeams,
      totalReviewed,
      totalCheckedIn,
      totalPending: totalTeams - totalReviewed,
      overallProgress: totalTeams > 0 ? Math.round((totalReviewed / totalTeams) * 100) : 0,
      labs: labStats,
    });
  }, ['super_admin', 'admin']);
}
