export const runtime = 'nodejs';

import { db } from '@/db';
import { events, teams, users, roles, reviews, suggestions, suggestionStatusLogs } from '@/db/schema';
import { eq, and, isNull, desc, count } from 'drizzle-orm';
import { withAuth, successResponse } from '@/lib/api-utils';

// GET /api/v1/dashboard/stats
export async function GET(request: Request) {
  return withAuth(request, async () => {
    
    // First query the role ID for mentors safely to use in count
    const mentorRole = await db.query.roles.findFirst({ where: eq(roles.name, 'mentor') });
    const mentorRoleId = mentorRole ? mentorRole.id : '00000000-0000-0000-0000-000000000000';

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
      totalSuggestions,
      resolvedSuggestions,
    ] = await Promise.all([
      db.select({ value: count() }).from(events).where(isNull(events.deletedAt)),
      db.select({ value: count() }).from(events).where(and(eq(events.status, 'active'), isNull(events.deletedAt))),
      db.select({ value: count() }).from(events).where(and(eq(events.status, 'draft'), isNull(events.deletedAt))),
      db.select({ value: count() }).from(teams).where(isNull(teams.deletedAt)),
      db.select({ value: count() }).from(teams).where(and(eq(teams.attendanceStatus, 'checked_in'), isNull(teams.deletedAt))),
      db.select({ value: count() }).from(users).where(isNull(users.deletedAt)),
      db.select({ value: count() }).from(users).where(and(eq(users.roleId, mentorRoleId), isNull(users.deletedAt))),
      db.select({ value: count() }).from(reviews).where(eq(reviews.isDraft, false)),
      db.select({ value: count() }).from(reviews).where(eq(reviews.isDraft, true)),
      db.query.events.findMany({
        where: isNull(events.deletedAt),
        orderBy: [desc(events.createdAt)],
        limit: 5,
        columns: {
          id: true,
          eventName: true,
          status: true,
          eventDate: true,
        },
        with: {
          teams: { columns: { id: true } },
          rounds: { columns: { id: true } }
        }
      }),
      db.select({ value: count() }).from(suggestions),
      db.select({ value: count() }).from(suggestionStatusLogs).where(eq(suggestionStatusLogs.status, 'completed')),
    ]);

    // Calculate review progress for each recent event
    const recentEventsWithProgress = await Promise.all(
      recentEvents.map(async (e) => {
        // Drizzle relational count subquery conceptually mapped via manual select for specific event teams
        const submittedReviewsQuery = await db.select({ value: count() })
          .from(reviews)
          .leftJoin(teams, eq(reviews.teamId, teams.id))
          .where(and(eq(teams.eventId, e.id), eq(reviews.isDraft, false)));
          
        const submittedReviews = submittedReviewsQuery[0].value;

        return {
          id: e.id,
          eventName: e.eventName,
          status: e.status,
          eventDate: e.eventDate, // String timestamp stringified natively
          teamCount: e.teams.length,
          roundCount: e.rounds.length,
          reviewsCompleted: submittedReviews,
          reviewProgress: e.teams.length > 0
            ? Math.round((submittedReviews / e.teams.length) * 100)
            : 0,
        };
      })
    );

    return successResponse({
      totalEvents: totalEvents[0].value,
      activeEvents: activeEvents[0].value,
      draftEvents: draftEvents[0].value,
      totalTeams: totalTeams[0].value,
      checkedInTeams: checkedInTeams[0].value,
      totalUsers: totalUsers[0].value,
      mentorCount: mentorCount[0].value,
      totalReviews: totalReviews[0].value,
      draftReviews: draftReviews[0].value,
      pendingReviews: draftReviews[0].value,
      suggestionCompliance: totalSuggestions[0].value > 0
        ? Math.round((resolvedSuggestions[0].value / totalSuggestions[0].value) * 100)
        : 0,
      recentEvents: recentEventsWithProgress,
    });
  }, ['super_admin', 'admin']);
}
