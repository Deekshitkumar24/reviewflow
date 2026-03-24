import prisma from '@/lib/prisma';
import { withAuth, successResponse, errorResponse, validateBody, createAuditLog } from '@/lib/api-utils';
import { z } from 'zod';

export const runtime = 'nodejs';

// GET /api/v1/teams/[teamId]
export async function GET(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  return withAuth(request, async () => {
    const { teamId } = await params;
    const team = await prisma.team.findFirst({
      where: { id: teamId, deletedAt: null },
      include: {
        members: { orderBy: [{ isLeader: 'desc' }, { fullName: 'asc' }] },
        labAssignments: {
          include: {
            lab: { select: { labName: true, building: true } },
            round: { select: { roundName: true, roundOrder: true, status: true } },
          },
          orderBy: { round: { roundOrder: 'asc' } },
        },
        reviews: {
          where: { isDraft: false },
          include: {
            mentor: { select: { fullName: true } },
            round: { select: { roundName: true, roundOrder: true } },
            suggestions: { include: { statusLogs: { orderBy: { createdAt: 'desc' } } } },
          },
          orderBy: { round: { roundOrder: 'asc' } },
        },
        result: true,
      },
    });
    if (!team) return errorResponse('NOT_FOUND', 'Team not found', 404);
    return successResponse(team);
  });
}

// PATCH /api/v1/teams/[teamId]
const updateTeamSchema = z.object({
  teamName: z.string().min(1).max(150).optional(),
  projectTitle: z.string().min(1).max(250).optional(),
  projectDescription: z.string().optional(),
  domain: z.string().max(100).optional(),
  githubUrl: z.string().url().optional().nullable(),
  pptLink: z.string().url().optional().nullable(),
  demoLink: z.string().url().optional().nullable(),
  attendanceStatus: z.enum(['registered', 'checked_in', 'no_show']).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  return withAuth(request, async (user) => {
    const { teamId } = await params;
    const validation = await validateBody(request, updateTeamSchema);
    if (validation.error) return validation.error;
    const d = validation.data!;

    const existing = await prisma.team.findFirst({ where: { id: teamId, deletedAt: null } });
    if (!existing) return errorResponse('NOT_FOUND', 'Team not found', 404);

    const updateData: Record<string, unknown> = {};
    if (d.teamName !== undefined) updateData.teamName = d.teamName;
    if (d.projectTitle !== undefined) updateData.projectTitle = d.projectTitle;
    if (d.projectDescription !== undefined) updateData.projectDescription = d.projectDescription;
    if (d.domain !== undefined) updateData.domain = d.domain;
    if (d.githubUrl !== undefined) updateData.githubUrl = d.githubUrl;
    if (d.pptLink !== undefined) updateData.pptLink = d.pptLink;
    if (d.demoLink !== undefined) updateData.demoLink = d.demoLink;
    if (d.attendanceStatus !== undefined) updateData.attendanceStatus = d.attendanceStatus;

    const team = await prisma.team.update({ where: { id: teamId }, data: updateData });
    await createAuditLog({ userId: user.sub, action: 'team.updated', entityType: 'team', entityId: teamId });
    return successResponse(team);
  }, ['super_admin', 'admin', 'coordinator']);
}

// DELETE /api/v1/teams/[teamId]
export async function DELETE(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  return withAuth(request, async (user) => {
    const { teamId } = await params;
    const existing = await prisma.team.findFirst({ where: { id: teamId, deletedAt: null } });
    if (!existing) return errorResponse('NOT_FOUND', 'Team not found', 404);

    await prisma.team.update({ where: { id: teamId }, data: { deletedAt: new Date() } });
    await createAuditLog({ userId: user.sub, action: 'team.deleted', entityType: 'team', entityId: teamId });
    return successResponse({ message: 'Team removed' });
  }, ['super_admin', 'admin']);
}
