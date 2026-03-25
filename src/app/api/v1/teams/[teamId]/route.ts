export const runtime = 'nodejs';

import { db } from '@/db';
import { teams } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuth, successResponse, errorResponse, validateBody, createAuditLog } from '@/lib/api-utils';
import { z } from 'zod';

// GET /api/v1/teams/[teamId]
export async function GET(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  return withAuth(request, async () => {
    const { teamId } = await params;
    
    const team = await db.query.teams.findFirst({
      where: and(eq(teams.id, teamId), isNull(teams.deletedAt)),
      with: {
        members: { 
          orderBy: (members, { desc, asc }) => [desc(members.isLeader), asc(members.fullName)] 
        },
        labAssignments: {
          with: {
            lab: { columns: { labName: true, building: true } },
            round: { columns: { roundName: true, roundOrder: true, status: true } },
          },
          // Drizzle relations allows ordering by relation fields if registered appropriately,
          // but Javascript sorting might be required depending on strict driver support
        },
        reviews: {
          // manually filter out draft reviews later
          with: {
            mentor: { columns: { fullName: true } },
            round: { columns: { roundName: true, roundOrder: true } },
            suggestions: { 
              with: { statusLogs: { orderBy: (logs, { desc }) => [desc(logs.createdAt)] } } 
            },
          },
        },
        result: true,
      },
    });

    if (!team) return errorResponse('NOT_FOUND', 'Team not found', 404);

    // Javascript sorts/filters since nested `.where` inside `with` has limitations in drizzle mapping currently
    if (team.labAssignments) {
        team.labAssignments.sort((a, b) => a.round.roundOrder - b.round.roundOrder);
    }
    if (team.reviews) {
        team.reviews = team.reviews.filter(r => !r.isDraft).sort((a, b) => a.round.roundOrder - b.round.roundOrder);
    }

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

    const existing = await db.query.teams.findFirst({ where: and(eq(teams.id, teamId), isNull(teams.deletedAt)) });
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

    if (Object.keys(updateData).length > 0) {
      await db.update(teams).set(updateData as any).where(eq(teams.id, teamId));
    }
    
    const updatedTeam = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });

    await createAuditLog({ userId: user.sub, action: 'team.updated', entityType: 'team', entityId: teamId });
    return successResponse(updatedTeam);
  }, ['super_admin', 'admin', 'coordinator']);
}

// DELETE /api/v1/teams/[teamId]
export async function DELETE(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  return withAuth(request, async (user) => {
    const { teamId } = await params;
    const existing = await db.query.teams.findFirst({ where: and(eq(teams.id, teamId), isNull(teams.deletedAt)) });
    if (!existing) return errorResponse('NOT_FOUND', 'Team not found', 404);

    await db.update(teams).set({ deletedAt: new Date() }).where(eq(teams.id, teamId));

    await createAuditLog({ userId: user.sub, action: 'team.deleted', entityType: 'team', entityId: teamId });
    return successResponse({ message: 'Team removed' });
  }, ['super_admin', 'admin']);
}
