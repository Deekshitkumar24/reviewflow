import { NextResponse } from 'next/server';
import { db } from '@/db';
import { teams, teamMembers, studentTeamAuth, coordinatorAssignments, labs as labsSchema } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuth, validateBody, errorResponse, successResponse, createAuditLog } from '@/lib/api-utils';
import { coordinatorRegisterTeamSchema } from '@/validators';
import { hashPassword } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const validation = await validateBody(request, coordinatorRegisterTeamSchema);
    if (validation.error) return validation.error;
    const data = validation.data!;

    // Get coordinator's assigned labs for this event
    const coordLabs = await db.query.labs.findMany({
      where: (labs, { eq, and, isNull: isN }) => and(eq(labs.eventId, data.eventId), isN(labs.deletedAt)),
    });

    const assignments = await db.select()
      .from(coordinatorAssignments)
      .where(eq(coordinatorAssignments.coordinatorId, user.sub));

    const assignedLabIds = assignments.map(a => a.labId);
    const labForRegistration = coordLabs.find(l => assignedLabIds.includes(l.id));

    if (!labForRegistration && user.role === 'coordinator') {
      return errorResponse('FORBIDDEN', 'You are not assigned to any lab in this event', 403);
    }

    // Check team name uniqueness within event
    const existingTeam = await db.query.teams.findFirst({
      where: (t, { eq: e, and: a, isNull: isN }) => a(
        e(t.eventId, data.eventId),
        e(t.teamName, data.teamName),
        isN(t.deletedAt),
      ),
    });
    if (existingTeam) {
      return errorResponse('DUPLICATE', 'A team with this name already exists in this event', 409);
    }

    // Check student login email uniqueness
    const existingAuth = await db.query.studentTeamAuth.findFirst({
      where: (sta, { eq: e }) => e(sta.loginEmail, data.loginEmail),
      with: {
        team: { columns: { eventId: true, deletedAt: true } },
      },
    });
    if (existingAuth && existingAuth.team && existingAuth.team.eventId === data.eventId && !existingAuth.team.deletedAt) {
      return errorResponse('DUPLICATE', 'This student login email is already in use for this event', 409);
    }

    // Hash the student password
    const passwordHash = await hashPassword(data.loginPassword);

    // Create team
    const [newTeam] = await db.insert(teams).values({
      eventId: data.eventId,
      labId: labForRegistration?.id ?? null,
      teamName: data.teamName,
      projectTitle: data.projectTitle,
      projectDescription: data.projectDescription || null,
      domain: data.domain || null,
      department: data.department,
      collegeName: data.collegeName,
      participationType: data.participationType,
      registeredById: user.sub,
    }).returning();

    // Create team members
    await db.insert(teamMembers).values(
      data.members.map((m, i) => ({
        teamId: newTeam.id,
        fullName: m.fullName,
        rollNumber: m.rollNumber,
        email: m.email || null,
        phone: m.phone || null,
        isLeader: m.isLeader,
        academicYear: m.academicYear ?? null,
      }))
    );

    // Create student auth credentials
    await db.insert(studentTeamAuth).values({
      teamId: newTeam.id,
      loginEmail: data.loginEmail,
      passwordHash,
    });

    // Audit log
    await createAuditLog({
      userId: user.sub,
      action: 'team.registered',
      entityType: 'team',
      entityId: newTeam.id,
      newValues: { teamName: data.teamName, participationType: data.participationType },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return successResponse({ team: { id: newTeam.id, teamName: newTeam.teamName } }, 201);
  }, ['coordinator', 'admin', 'super_admin']);
}
