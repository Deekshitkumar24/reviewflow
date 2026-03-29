import { db } from '@/db';
import { issues } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { withStudentAuth } from '@/lib/student-auth';
import { validateBody, errorResponse, successResponse } from '@/lib/api-utils';
import { createIssueSchema } from '@/validators';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  return withStudentAuth(request, async (student) => {
    const teamIssues = await db.query.issues.findMany({
      where: (i, { eq: e }) => e(i.teamId, student.sub),
      orderBy: (i) => [desc(i.createdAt)],
    });

    return successResponse(teamIssues.map(i => ({
      id: i.id,
      category: i.category,
      description: i.description,
      status: i.status,
      resolutionNote: i.resolutionNote,
      resolvedAt: i.resolvedAt?.toISOString() || null,
      createdAt: i.createdAt.toISOString(),
    })));
  });
}

export async function POST(request: Request) {
  return withStudentAuth(request, async (student) => {
    const validation = await validateBody(request, createIssueSchema);
    if (validation.error) return validation.error;
    const data = validation.data!;

    const [newIssue] = await db.insert(issues).values({
      teamId: student.sub,
      eventId: student.eventId,
      labId: student.labId || null,
      category: data.category,
      description: data.description,
    }).returning();

    return successResponse({ id: newIssue.id }, 201);
  });
}
