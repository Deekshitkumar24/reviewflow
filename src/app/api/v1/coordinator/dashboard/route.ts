export const runtime = 'nodejs';

import { db } from '@/db';
import { teams, teamMembers, coordinatorAssignments, reviews, issues, memberAttendance } from '@/db/schema';
import { eq, and, isNull, inArray, inArray as drizzleInArray, sql } from 'drizzle-orm';
import { withAuth, successResponse, errorResponse } from '@/lib/api-utils';

// GET /api/v1/coordinator/dashboard
export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    if (user.role !== 'coordinator') {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    // 1. Fetch assigned labs for this coordinator
    const assignments = await db.select({ labId: coordinatorAssignments.labId })
      .from(coordinatorAssignments)
      .where(eq(coordinatorAssignments.coordinatorId, user.sub));

    if (assignments.length === 0) {
      return successResponse({
        totalTeams: 0,
        totalStudents: 0,
        attendanceCompleted: 0,
        projectsReady: 0,
        projectsNotReady: 0,
        evaluated: 0,
        pendingEvaluation: 0,
        issuesRaised: 0,
      });
    }

    const assignedLabIds = assignments.map(a => a.labId);

    // 2. Fetch all teams in these labs
    const labTeams = await db.select({ id: teams.id, isFinalSubmissionReady: teams.isFinalSubmissionReady })
      .from(teams)
      .where(
        and(
          inArray(teams.labId, assignedLabIds),
          isNull(teams.deletedAt)
        )
      );

    const totalTeams = labTeams.length;
    const teamIds = labTeams.map(t => t.id);

    // If no teams, return zeroed metrics
    if (teamIds.length === 0) {
      return successResponse({
        totalTeams: 0,
        totalStudents: 0,
        attendanceCompleted: 0,
        projectsReady: 0,
        projectsNotReady: 0,
        evaluated: 0,
        pendingEvaluation: 0,
        issuesRaised: 0,
      });
    }

    // 3. Members in these teams
    const allMembers = await db.select({ id: teamMembers.id })
      .from(teamMembers)
      .where(
        inArray(teamMembers.teamId, teamIds)
      );
    const totalStudents = allMembers.length;

    // Projects Ready vs Not Ready
    const projectsReady = labTeams.filter(t => t.isFinalSubmissionReady).length;
    const projectsNotReady = totalTeams - projectsReady;

    // Evaluated vs Pending
    // Since we don't have a direct "evaluationStatus" on the team in this schema,
    // we use 'reviews' table to see if it's evaluated.
    // Let's check how many teams have at least one completed review (isDraft = false).
    const allReviews = await db.select({ teamId: reviews.teamId, isDraft: reviews.isDraft })
      .from(reviews)
      .where(inArray(reviews.teamId, teamIds));
    
    // Evaluated if there's at least one non-draft review
    const evaluatedTeamIds = new Set(allReviews.filter(r => !r.isDraft).map(r => r.teamId));
    const evaluated = evaluatedTeamIds.size;
    const pendingEvaluation = totalTeams - evaluated;

    // Issues raised by these teams
    const teamIssues = await db.select({ id: issues.id })
      .from(issues)
      .where(inArray(issues.teamId, teamIds));
    const issuesRaised = teamIssues.length;

    let attendanceCompleted = 0;
    if (allMembers.length > 0) {
      const attendanceRecords = await db.select({ id: memberAttendance.id })
        .from(memberAttendance)
        .where(
          and(
            inArray(memberAttendance.memberId, allMembers.map(m => m.id)),
            eq(memberAttendance.isPresent, true)
          )
        );
      attendanceCompleted = attendanceRecords.length;
    }

    return successResponse({
      totalTeams,
      totalStudents,
      attendanceCompleted,
      projectsReady,
      projectsNotReady,
      evaluated,
      pendingEvaluation,
      issuesRaised,
    });
  }, ['coordinator']);
}
