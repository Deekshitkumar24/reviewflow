export const runtime = 'nodejs';

import { db } from '@/db';
import { labs, events, reviews } from '@/db/schema';
import { eq, and, isNull, asc, count } from 'drizzle-orm';
import { withAuth, successResponse } from '@/lib/api-utils';

// GET /api/v1/live-monitor?eventId=...
export async function GET(request: Request) {
  return withAuth(request, async () => {
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId');

    const conditions = [isNull(labs.deletedAt)];
    if (eventId) conditions.push(eq(labs.eventId, eventId));

    // Fetch all labs for the event
    const labList = await db.query.labs.findMany({
      where: and(...conditions),
      with: {
        labAssignments: {
          with: {
            team: { columns: { id: true, teamName: true, attendanceStatus: true } },
            round: { columns: { roundName: true, roundOrder: true, status: true } },
          },
        },
        mentorAssignments: {
          with: { mentor: { columns: { fullName: true } } },
        },
      },
    });

    let eventData = null;
    let activeRoundId = null;

    if (eventId) {
        eventData = await db.query.events.findFirst({
            where: eq(events.id, eventId),
            with: {
                rounds: { 
                    where: (r, { eq }) => eq(r.status, 'open'),
                    orderBy: (r, { asc }) => [asc(r.roundOrder)],
                    limit: 1
                },
                teams: { columns: { id: true } }
            }
        });
        activeRoundId = eventData?.rounds[0]?.id || null;
    }

    const labStats = await Promise.all(
      labList.map(async (lab) => {
        const assignedInActiveRound = lab.labAssignments.filter(
          (a) => !activeRoundId || a.roundId === activeRoundId
        );
        const teamIds = assignedInActiveRound.map((a) => a.teamId);
        
        // Count reviews submitted inside this lab, round
        let reviewed = 0;
        if (activeRoundId) {
            const reviewedQuery = await db.select({ value: count() }).from(reviews)
                .where(and(eq(reviews.labId, lab.id), eq(reviews.roundId, activeRoundId), eq(reviews.isDraft, false)));
            reviewed = reviewedQuery[0].value;
        }

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

    const totalTeams = eventData?.teams.length ?? labStats.reduce((s, l) => s + l.totalTeams, 0);
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
