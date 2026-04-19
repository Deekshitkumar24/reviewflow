import { NextRequest } from 'next/server';
import { db } from '@/db';
import { issues, teams, events, labs, coordinatorAssignments } from '@/db/schema';
import { eq, inArray, desc, and } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth';
import { errorResponse, successResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !['super_admin', 'admin', 'coordinator'].includes(user.role)) {
      return errorResponse('FORBIDDEN', 'Forbidden', 403);
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');

    let conditions = undefined;

    if (user.role === 'coordinator') {
      // Find labs assigned to this coordinator
      const assignments = await db.query.coordinatorAssignments.findMany({
        where: eq(coordinatorAssignments.coordinatorId, user.sub),
      });
      const labIds = assignments.map(a => a.labId);

      if (labIds.length === 0) {
        return successResponse([], 200, { meta: { total: 0 } });
      }
      
      conditions = inArray(issues.labId, labIds);
    }

    const allIssues = await db.query.issues.findMany({
      where: conditions,
      with: {
        team: { columns: { teamName: true, projectTitle: true } },
        event: { columns: { eventName: true } },
        lab: { columns: { labName: true } },
        resolvedBy: { columns: { fullName: true } },
      },
      orderBy: [desc(issues.createdAt)],
      limit,
    });

    return successResponse(allIssues, 200, { meta: { total: allIssues.length } });
  } catch (error) {
    console.error('Issues GET error:', error);
    return errorResponse('SERVER_ERROR', 'Failed to fetch issues', 500);
  }
}
