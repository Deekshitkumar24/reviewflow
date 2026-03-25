export const runtime = 'nodejs';

import { db } from '@/db';
import { teams } from '@/db/schema';
import { eq, or, ilike, and, isNull, desc, count } from 'drizzle-orm';
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
});

// GET /api/v1/teams — List teams
export async function GET(request: Request) {
  return withAuth(request, async () => {
    const url = new URL(request.url);
    const { page, limit, skip, q } = parsePagination(url);
    const eventIdParam = url.searchParams.get('eventId') || undefined;
    const attendanceStatusParam = url.searchParams.get('attendanceStatus') || undefined;

    const conditions = [isNull(teams.deletedAt)];
    if (eventIdParam) conditions.push(eq(teams.eventId, eventIdParam)!);
    if (attendanceStatusParam) conditions.push(eq(teams.attendanceStatus, attendanceStatusParam)!);
    
    if (q) {
      conditions.push(or(
        ilike(teams.teamName, `%${q}%`),
        ilike(teams.projectTitle, `%${q}%`)
      )!);
    }

    const whereClause = and(...conditions);

    const [teamList, totalObj] = await Promise.all([
      db.query.teams.findMany({
        where: whereClause,
        limit,
        offset: skip,
        orderBy: [desc(teams.createdAt)],
        with: {
          event: { columns: { eventName: true } },
          labAssignments: { 
            limit: 1,
            with: { lab: { columns: { labName: true } } }
          },
          members: { columns: { id: true } }
        },
      }),
      db.select({ value: count() }).from(teams).where(whereClause),
    ]);

    const data = teamList.map((t) => ({
      id: t.id,
      teamName: t.teamName,
      projectTitle: t.projectTitle,
      domain: t.domain,
      department: t.department,
      attendanceStatus: t.attendanceStatus,
      memberCount: t.members.length,
      eventName: t.event.eventName,
      labName: t.labAssignments[0]?.lab.labName || null,
      createdAt: t.createdAt.toISOString(),
    }));

    return successResponse(data, 200, { meta: paginationMeta(totalObj[0].value, page, limit) });
  });
}

// POST /api/v1/teams — Create team
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const validation = await validateBody(request, createTeamSchema);
    if (validation.error) return validation.error;
    const data = validation.data!;

    const existing = await db.query.teams.findFirst({
      where: and(
        eq(teams.eventId, data.eventId),
        eq(teams.teamName, data.teamName),
        isNull(teams.deletedAt)
      )
    });

    if (existing) {
      return errorResponse('TEAM_EXISTS', 'Team name must be unique within an event', 409);
    }

    const inserted = await db.insert(teams).values({
      teamName: data.teamName,
      projectTitle: data.projectTitle,
      projectDescription: data.projectDescription || null,
      domain: data.domain || null,
      department: data.department || 'General',
      collegeName: data.collegeName || 'Unknown',
      attendanceStatus: 'registered',
      eventId: data.eventId,
    }).returning();

    const team = inserted[0];

    const teamWithEvent = await db.query.teams.findFirst({
      where: eq(teams.id, team.id),
      with: { event: { columns: { eventName: true } } }
    });

    await createAuditLog({
      userId: user.sub,
      action: 'team.created',
      entityType: 'team',
      entityId: team.id,
      newValues: { teamName: team.teamName, eventId: team.eventId },
    });

    return successResponse(teamWithEvent, 201);
  }, ['super_admin', 'admin']);
}
