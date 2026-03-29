export const runtime = 'nodejs';

import { db } from '@/db';
import { teams, reviews, results } from '@/db/schema';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { withAuth, errorResponse } from '@/lib/api-utils';
import { NextResponse } from 'next/server';

// GET /api/v1/reports/export?eventId=...&type=teams|reviews|results
export async function GET(request: Request) {
  return withAuth(request, async () => {
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId');
    const type = url.searchParams.get('type');

    if (!eventId) return errorResponse('MISSING_EVENT_ID', 'Event ID is required', 400);

    let csvContent = '';

    if (type === 'teams') {
      const teamList = await db.query.teams.findMany({
        where: and(eq(teams.eventId, eventId), isNull(teams.deletedAt)),
        with: { members: true },
      });
      csvContent = 'Team Name,Project Title,Domain,College,Status,Member Count\n';
      csvContent += teamList.map(t => 
        `"${t.teamName}","${t.projectTitle}","${t.domain || ''}","${t.collegeName}","${t.attendanceStatus}",${t.members.length}`
      ).join('\n');
    } 
    else if (type === 'reviews') {
      // Find reviews that belong to a specific event ID through teams
      // Because Drizzle standard mappings don't support deep relation queries on the `where` top level directly easily:
      const reviewList = await db.select()
        .from(reviews)
        .leftJoin(teams, eq(reviews.teamId, teams.id))
        .where(eq(teams.eventId, eventId));
      
      const ids = reviewList.map(r => r.reviews.id);
      
      let fetchedReviews: any[] = [];
      if (ids.length > 0) {
          // Fallback to query builder for easy nested include loading
          const dataFetched = await db.query.reviews.findMany({
              with: { mentor: { columns: { fullName: true } }, team: { columns: { teamName: true } }, round: { columns: { roundName: true } } }
          });
          fetchedReviews = dataFetched.filter(r => ids.includes(r.id));
      }

      csvContent = 'Team,Mentor,Round,Composite Score,Verdict\n';
      csvContent += fetchedReviews.map(r => 
        `"${r.team?.teamName || 'Unknown'}","${r.mentor?.fullName || 'Unknown'}","${r.round?.roundName || 'Unknown'}",${r.compositeScore},"${r.verdict}"`
      ).join('\n');
    }
    else if (type === 'results') {
      const resultList = await db.query.results.findMany({
        where: and(eq(results.eventId, eventId), eq(results.isPublished, true)),
        with: { team: { columns: { teamName: true, projectTitle: true } } },
        orderBy: [asc(results.finalPosition)],
      });
      csvContent = 'Rank,Team,Project,Category,Prize\n';
      csvContent += resultList.map(r => 
        `${r.finalPosition || ''},"${r.team?.teamName || 'Unknown'}","${r.team?.projectTitle || 'Unknown'}","${r.awardType || ''}",`
      ).join('\n');
    } 
    else {
      return errorResponse('INVALID_TYPE', 'Invalid export type. Must be teams, reviews, or results', 400);
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="export-${type}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  }, ['super_admin', 'admin']);
}
