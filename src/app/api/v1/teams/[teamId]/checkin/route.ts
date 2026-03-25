export const runtime = 'nodejs';

import { db } from '@/db';
import { teams } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuth, successResponse, errorResponse, validateBody, createAuditLog } from '@/lib/api-utils';
import { z } from 'zod';

const checkinSchema = z.object({
  action: z.enum(['check_in', 'no_show', 'undo']),
});

// POST /api/v1/teams/[teamId]/checkin
export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  return withAuth(request, async (user) => {
    const { teamId } = await params;
    const validation = await validateBody(request, checkinSchema);
    if (validation.error) return validation.error;
    const { action } = validation.data!;

    const team = await db.query.teams.findFirst({ where: and(eq(teams.id, teamId), isNull(teams.deletedAt)) });
    if (!team) return errorResponse('NOT_FOUND', 'Team not found', 404);

    let attendanceStatus: string;
    let checkedInAt: Date | null = null;
    let checkedInById: string | null = null;

    if (action === 'check_in') {
      attendanceStatus = 'checked_in';
      checkedInAt = new Date();
      checkedInById = user.sub;
    } else if (action === 'no_show') {
      attendanceStatus = 'no_show';
    } else {
      attendanceStatus = 'registered';
    }

    const updatedList = await db.update(teams).set({
      attendanceStatus,
      ...(checkedInAt ? { checkedInAt, checkedInById } : {}),
      ...(action === 'undo' ? { checkedInAt: null, checkedInById: null } : {}),
    } as any).where(eq(teams.id, teamId)).returning();

    const updated = updatedList[0];

    await createAuditLog({
      userId: user.sub,
      action: `team.${action}`,
      entityType: 'team',
      entityId: teamId,
      newValues: { attendanceStatus },
    });

    return successResponse({
      id: updated.id,
      teamName: updated.teamName,
      attendanceStatus: updated.attendanceStatus,
      checkedInAt: updated.checkedInAt?.toISOString() ?? null,
    });
  }, ['super_admin', 'admin', 'coordinator']);
}
