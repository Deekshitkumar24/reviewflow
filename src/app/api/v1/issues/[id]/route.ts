import { NextRequest } from 'next/server';
import { db } from '@/db';
import { issues, coordinatorAssignments } from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth';
import { errorResponse, successResponse } from '@/lib/api-utils';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getAuthUser(request);
    if (!user || !['super_admin', 'admin', 'coordinator'].includes(user.role)) {
      return errorResponse('FORBIDDEN', 'Forbidden', 403);
    }

    const body = await request.json();
    const { status, resolutionNote } = body;

    // Authorization: if coordinator, ensure they can access this lab
    if (user.role === 'coordinator') {
      const issueDetails = await db.query.issues.findFirst({
        where: eq(issues.id, id),
        columns: { labId: true }
      });
      if (!issueDetails || !issueDetails.labId) return errorResponse('NOT_FOUND', 'Issue or Lab logic broken', 404);

      const assignments = await db.query.coordinatorAssignments.findMany({
        where: eq(coordinatorAssignments.coordinatorId, user.sub),
      });
      const labIds = assignments.map(a => a.labId);
      if (!labIds.includes(issueDetails.labId)) {
        return errorResponse('FORBIDDEN', 'Forbidden - Not your lab', 403);
      }
    }

    const [updatedIssue] = await db.update(issues)
      .set({
        status,
        resolutionNote,
        resolvedById: status === 'resolved' ? user.sub : null,
        resolvedAt: status === 'resolved' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(issues.id, id))
      .returning();

    return successResponse(updatedIssue);
  } catch (error) {
    console.error('Issues PATCH error:', error);
    return errorResponse('SERVER_ERROR', 'Failed to update issue', 500);
  }
}
