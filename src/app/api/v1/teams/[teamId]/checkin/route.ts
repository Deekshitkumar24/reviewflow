import prisma from '@/lib/prisma';
import { withAuth, successResponse, errorResponse, validateBody, createAuditLog } from '@/lib/api-utils';
import { z } from 'zod';

export const runtime = 'nodejs';

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

    const team = await prisma.team.findFirst({ where: { id: teamId, deletedAt: null } });
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

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        attendanceStatus,
        ...(checkedInAt ? { checkedInAt, checkedInById } : {}),
        ...(action === 'undo' ? { checkedInAt: null, checkedInById: null } : {}),
      },
    });

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
