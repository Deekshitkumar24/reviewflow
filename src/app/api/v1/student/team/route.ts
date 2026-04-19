import { NextResponse } from 'next/server';
import { db } from '@/db';
import { teams, teamMembers, issues } from '@/db/schema';
import { eq, and, isNull, count } from 'drizzle-orm';
import { withStudentAuth } from '@/lib/student-auth';
import { errorResponse, successResponse } from '@/lib/api-utils';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  return withStudentAuth(request, async (student) => {
    const team = await db.query.teams.findFirst({
      where: (t, { eq: e, and: a, isNull: isN }) => a(
        e(t.id, student.sub),
        isN(t.deletedAt),
      ),
      with: {
        members: {
          with: {
            attendance: {
              with: { submission: { with: { slot: { columns: { slotName: true, slotDate: true, startTime: true, dueTime: true } } } } }
            }
          }
        },
        lab: { columns: { labName: true, building: true, floor: true } },
        event: { columns: { eventName: true, eventDate: true, venue: true, status: true } },
      },
    });

    if (!team) {
      return errorResponse('NOT_FOUND', 'Team not found', 404);
    }

    // Count issues
    const issueCountResult = await db.select({ value: count() })
      .from(issues)
      .where(eq(issues.teamId, team.id));

    return successResponse({
      id: team.id,
      teamName: team.teamName,
      projectTitle: team.projectTitle,
      projectDescription: team.projectDescription,
      domain: team.domain,
      department: team.department,
      collegeName: team.collegeName,
      participationType: team.participationType,
      evaluationStatus: team.evaluationStatus,
      isProjectReady: team.isProjectReady,
      isPptReady: team.isPptReady,
      isDemoReady: team.isDemoReady,
      isFinalSubmissionReady: team.isFinalSubmissionReady,
      readinessRemarks: team.readinessRemarks,
      labName: team.lab?.labName || null,
      eventName: team.event?.eventName || null,
      eventDate: team.event?.eventDate || null,
      memberCount: team.members.length,
      issueCount: issueCountResult[0]?.value || 0,
      members: team.members.map(m => ({
        id: m.id,
        fullName: m.fullName,
        rollNumber: m.rollNumber,
        email: m.email,
        phone: m.phone,
        isLeader: m.isLeader,
        academicYear: m.academicYear,
        attendance: m.attendance?.map((a: any) => ({
          isPresent: a.isPresent,
          slotName: a.submission?.slot?.slotName,
          slotDate: a.submission?.slot?.slotDate,
          startTime: a.submission?.slot?.startTime,
        })) || [],
      })),
    });
  });
}
