import prisma from '@/lib/prisma';
import { withAuth, successResponse, errorResponse } from '@/lib/api-utils';

export const runtime = 'nodejs';

// GET /api/v1/dashboard/stats
export async function GET(request: Request) {
  return withAuth(request, async () => {
    const [
      totalEvents,
      activeEvents,
      draftEvents,
      totalTeams,
      checkedInTeams,
      totalUsers,
      mentorCount,
      totalReviews,
      draftReviews,
      recentEvents,
    ] = await Promise.all([
      prisma.event.count({ where: { deletedAt: null } }),
      prisma.event.count({ where: { status: 'active', deletedAt: null } }),
      prisma.event.count({ where: { status: 'draft', deletedAt: null } }),
      prisma.team.count({ where: { deletedAt: null } }),
      prisma.team.count({ where: { attendanceStatus: 'checked_in', deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { role: { name: 'mentor' }, deletedAt: null } }),
      prisma.review.count({ where: { isDraft: false } }),
      prisma.review.count({ where: { isDraft: true } }),
      prisma.event.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          eventName: true,
          status: true,
          eventDate: true,
          _count: { select: { teams: true, rounds: true } },
        },
      }),
    ]);

    // Calculate review progress for each recent event
    const recentEventsWithProgress = await Promise.all(
      recentEvents.map(async (e) => {
        const submittedReviews = await prisma.review.count({
          where: { team: { eventId: e.id }, isDraft: false },
        });
        return {
          id: e.id,
          eventName: e.eventName,
          status: e.status,
          eventDate: e.eventDate.toISOString(),
          teamCount: e._count.teams,
          roundCount: e._count.rounds,
          reviewsCompleted: submittedReviews,
          reviewProgress: e._count.teams > 0
            ? Math.round((submittedReviews / e._count.teams) * 100)
            : 0,
        };
      })
    );

    // Suggestion compliance
    const totalSuggestions = await prisma.suggestion.count();
    const resolvedSuggestions = await prisma.suggestionStatusLog.count({
      where: { status: 'completed' },
    });

    return successResponse({
      totalEvents,
      activeEvents,
      draftEvents,
      totalTeams,
      checkedInTeams,
      totalUsers,
      mentorCount,
      totalReviews,
      draftReviews,
      pendingReviews: draftReviews,
      suggestionCompliance: totalSuggestions > 0
        ? Math.round((resolvedSuggestions / totalSuggestions) * 100)
        : 0,
      recentEvents: recentEventsWithProgress,
    });
  }, ['super_admin', 'admin']);
}
