export const runtime = 'nodejs';

import prisma from '@/lib/prisma';
import { withAuth, successResponse, errorResponse, validateBody, parsePagination, paginationMeta, createAuditLog } from '@/lib/api-utils';
import { z } from 'zod';

const createTeamSchema = z.object({
  teamName: z.string().min(2),
  projectTitle: z.string().min(2),
  projectDescription: z.string().optional(),
  domain: z.string().optional(),
  department: z.string().optional(),
  collegeName: z.string().optional(),
  eventId: z.string().uuid(),
  // labId removed from direct team creation validation
});

// GET /api/v1/teams — List teams
export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    const url = new URL(request.url);
    const { page, limit, skip, q } = parsePagination(url);
    const eventId = url.searchParams.get('eventId') || undefined;
    const attendanceStatus = url.searchParams.get('attendanceStatus') || undefined;

    const where: Record<string, unknown> = { deletedAt: null };
    if (eventId) where.eventId = eventId;
    if (attendanceStatus) where.attendanceStatus = attendanceStatus;
    if (q) {
      where.OR = [
        { teamName: { contains: q, mode: 'insensitive' } },
        { projectTitle: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          event: { select: { eventName: true } },
          labAssignments: { select: { lab: { select: { labName: true } } }, take: 1 },
          _count: { select: { members: true, labAssignments: true } },
        },
      }),
      prisma.team.count({ where }),
    ]);

    const data = teams.map((t) => ({
      id: t.id,
      teamName: t.teamName,
      projectTitle: t.projectTitle,
      domain: t.domain,
      department: t.department,
      attendanceStatus: t.attendanceStatus,
      memberCount: t._count.members,
      eventName: t.event.eventName,
      labName: t.labAssignments[0]?.lab.labName || null,
      createdAt: t.createdAt.toISOString(),
    }));

    return successResponse(data, 200, { meta: paginationMeta(total, page, limit) });
  });
}

// POST /api/v1/teams — Create team
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const validation = await validateBody(request, createTeamSchema);
    if (validation.error) return validation.error;
    const data = validation.data!;

    const existing = await prisma.team.findFirst({
      where: {
        eventId: data.eventId,
        teamName: data.teamName,
        deletedAt: null
      }
    });

    if (existing) {
      return errorResponse('TEAM_EXISTS', 'Team name must be unique within an event', 409);
    }

    const team = await prisma.team.create({
      data: {
        teamName: data.teamName,
        projectTitle: data.projectTitle,
        projectDescription: data.projectDescription,
        domain: data.domain,
        department: data.department || 'General',
        collegeName: data.collegeName || 'Unknown',
        attendanceStatus: 'registered',
        eventId: data.eventId,
      },
      include: {
        event: { select: { eventName: true } }
      }
    });

    await createAuditLog({
      userId: user.sub,
      action: 'team.created',
      entityType: 'team',
      entityId: team.id,
      newValues: { teamName: team.teamName, eventId: team.eventId },
    });

    return successResponse(team, 201);
  }, ['super_admin', 'admin']);
}
