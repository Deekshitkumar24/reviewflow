import { db } from '@/db';
import { teams } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { withAuth, validateBody, errorResponse, successResponse, createAuditLog } from '@/lib/api-utils';
import { updateEvaluationStatusSchema } from '@/validators';

export const runtime = 'nodejs';

// PATCH — Mentor updates evaluation status on a team
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  return withAuth(request, async (user) => {
    const { teamId } = await params;
    const validation = await validateBody(request, updateEvaluationStatusSchema);
    if (validation.error) return validation.error;
    const { evaluationStatus } = validation.data!;

    const team = await db.query.teams.findFirst({
      where: (t, { eq: e, isNull: isN }) => e(t.id, teamId),
    });
    if (!team) return errorResponse('NOT_FOUND', 'Team not found', 404);

    // Business rule: valid status transitions
    const validTransitions: Record<string, string[]> = {
      not_evaluated: ['under_evaluation'],
      under_evaluation: ['evaluated', 're_evaluation_required'],
      evaluated: ['re_evaluation_required'],
      re_evaluation_required: ['under_evaluation'],
    };
    const allowed = validTransitions[team.evaluationStatus] || [];
    if (!allowed.includes(evaluationStatus)) {
      return errorResponse(
        'INVALID_TRANSITION',
        `Cannot change evaluation status from '${team.evaluationStatus}' to '${evaluationStatus}'`,
        400
      );
    }

    await db.update(teams).set({
      evaluationStatus,
      updatedAt: new Date(),
    }).where(eq(teams.id, teamId));

    await createAuditLog({
      userId: user.sub,
      action: 'team.evaluation_status_updated',
      entityType: 'team',
      entityId: teamId,
      oldValues: { evaluationStatus: team.evaluationStatus },
      newValues: { evaluationStatus },
    });

    return successResponse({ teamId, evaluationStatus });
  }, ['mentor', 'admin', 'super_admin']);
}
