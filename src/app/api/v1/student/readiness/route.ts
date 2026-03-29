import { db } from '@/db';
import { teams } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { withStudentAuth } from '@/lib/student-auth';
import { validateBody, errorResponse, successResponse } from '@/lib/api-utils';
import { updateReadinessSchema } from '@/validators';

export const runtime = 'nodejs';

export async function PATCH(request: Request) {
  return withStudentAuth(request, async (student) => {
    const validation = await validateBody(request, updateReadinessSchema);
    if (validation.error) return validation.error;
    const data = validation.data!;

    await db.update(teams).set({
      isProjectReady: data.isProjectReady,
      isPptReady: data.isPptReady,
      isDemoReady: data.isDemoReady,
      isFinalSubmissionReady: data.isFinalSubmissionReady,
      readinessRemarks: data.readinessRemarks || null,
      updatedAt: new Date(),
    }).where(eq(teams.id, student.sub));

    return successResponse({ updated: true });
  });
}
