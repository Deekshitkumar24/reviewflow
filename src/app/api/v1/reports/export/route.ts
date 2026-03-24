import prisma from '@/lib/prisma';
import { withAuth, errorResponse } from '@/lib/api-utils';
import { NextResponse } from 'next/server';

// GET /api/v1/reports/export?eventId=...&type=teams|reviews|results
export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId');
    const type = url.searchParams.get('type');

    if (!eventId) return errorResponse('MISSING_EVENT_ID', 'Event ID is required', 400);

    let csvContent = '';

    if (type === 'teams') {
      const teams = await prisma.team.findMany({
        where: { eventId, deletedAt: null },
        include: { members: true },
      });
      csvContent = 'Team Name,Project Title,Domain,College,Status,Member Count\n';
      csvContent += teams.map(t => 
        `"${t.teamName}","${t.projectTitle}","${t.domain || ''}","${t.collegeName}","${t.attendanceStatus}",${t.members.length}`
      ).join('\n');
    } 
    else if (type === 'reviews') {
      const reviews = await prisma.review.findMany({
        where: { team: { eventId } },
        include: { mentor: true, team: true, round: true },
      });
      csvContent = 'Team,Mentor,Round,Composite Score,Verdict\n';
      csvContent += reviews.map(r => 
        `"${r.team.teamName}","${r.mentor.fullName}","${r.round.roundName}",${r.compositeScore},"${r.verdict}"`
      ).join('\n');
    }
    else if (type === 'results') {
      const results = await prisma.result.findMany({
        where: { eventId, isPublished: true },
        include: { team: true },
        orderBy: { finalPosition: 'asc' },
      });
      csvContent = 'Rank,Team,Project,Category,Prize\n';
      csvContent += results.map(r => 
        `${r.finalPosition || ''},"${r.team.teamName}","${r.team.projectTitle}","${r.awardType || ''}",`
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
