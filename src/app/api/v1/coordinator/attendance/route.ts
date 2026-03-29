import { db } from '@/db';
import { labAttendanceSubmissions, memberAttendance, attendanceSlots, teams, teamMembers, mentorAssignments, coordinatorAssignments } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { withAuth, validateBody, errorResponse, successResponse, createAuditLog } from '@/lib/api-utils';
import { submitAttendanceSchema } from '@/validators';

export const runtime = 'nodejs';

// GET — Get teams and members for coordinator's assigned lab and active slot
export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    const url = new URL(request.url);
    const slotId = url.searchParams.get('slotId');
    const labId = url.searchParams.get('labId');

    if (!slotId || !labId) {
      return errorResponse('BAD_REQUEST', 'slotId and labId are required', 400);
    }

    if (user.role === 'coordinator') {
      const assignments = await db.select().from(coordinatorAssignments).where(
        and(eq(coordinatorAssignments.coordinatorId, user.sub))
      );
      const hasLabAccess = assignments.some(a => a.labId === labId);
      if (!hasLabAccess) {
        return errorResponse('FORBIDDEN', 'You do not have access to this lab', 403);
      }
    }

    // Get the slot
    const slot = await db.query.attendanceSlots.findFirst({
      where: (s, { eq: e }) => e(s.id, slotId),
    });
    if (!slot) return errorResponse('NOT_FOUND', 'Slot not found', 404);

    // Get existing submission
    const existingSubmission = await db.query.labAttendanceSubmissions.findFirst({
      where: (ls, { eq: e, and: a }) => a(e(ls.slotId, slotId), e(ls.labId, labId)),
    });

    // Get teams in this lab
    const labTeams = await db.query.teams.findMany({
      where: (t, { eq: e, and: a, isNull: isN }) => a(
        e(t.labId, labId),
        isN(t.deletedAt),
      ),
      with: { members: true },
      orderBy: (t) => [t.teamName],
    });

    // Get existing member attendance if submission exists
    let existingRecords: Record<string, boolean> = {};
    if (existingSubmission) {
      const records = await db.query.memberAttendance.findMany({
        where: (ma, { eq: e }) => e(ma.submissionId, existingSubmission.id),
      });
      records.forEach(r => { existingRecords[r.memberId] = r.isPresent; });
    }

    // Determine time window
    const now = new Date();
    const graceEnd = new Date(slot.dueTime.getTime() + slot.gracePeriodMinutes * 60 * 1000);
    let timeStatus: 'before_start' | 'open' | 'grace_period' | 'expired' = 'before_start';
    if (now >= slot.startTime && now <= slot.dueTime) timeStatus = 'open';
    else if (now > slot.dueTime && now <= graceEnd) timeStatus = 'grace_period';
    else if (now > graceEnd) timeStatus = 'expired';

    return successResponse({
      slot: {
        id: slot.id,
        slotName: slot.slotName,
        slotNumber: slot.slotNumber,
        startTime: slot.startTime.toISOString(),
        dueTime: slot.dueTime.toISOString(),
        gracePeriodMinutes: slot.gracePeriodMinutes,
        status: slot.status,
      },
      timeStatus,
      graceEndTime: graceEnd.toISOString(),
      submission: existingSubmission ? {
        id: existingSubmission.id,
        status: existingSubmission.status,
        submittedAt: existingSubmission.submittedAt?.toISOString() || null,
      } : null,
      teams: labTeams.map(t => ({
        id: t.id,
        teamName: t.teamName,
        members: t.members.map(m => ({
          id: m.id,
          fullName: m.fullName,
          rollNumber: m.rollNumber,
          isPresent: existingRecords[m.id] ?? null,
        })),
      })),
    });
  }, ['coordinator', 'admin', 'super_admin']);
}

// POST — Submit or update attendance
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const validation = await validateBody(request, submitAttendanceSchema);
    if (validation.error) return validation.error;
    const data = validation.data!;

    const url = new URL(request.url);
    const labId = url.searchParams.get('labId');
    if (!labId) return errorResponse('BAD_REQUEST', 'labId query param is required', 400);

    // Verify slot exists and is submittable
    const slot = await db.query.attendanceSlots.findFirst({
      where: (s, { eq: e }) => e(s.id, data.slotId),
    });
    if (!slot) return errorResponse('NOT_FOUND', 'Slot not found', 404);

    const now = new Date();
    const graceEnd = new Date(slot.dueTime.getTime() + slot.gracePeriodMinutes * 60 * 1000);
    if (now < slot.startTime) {
      return errorResponse('TOO_EARLY', 'Attendance window has not opened yet', 400);
    }
    if (now > graceEnd) {
      return errorResponse('EXPIRED', 'Attendance window has closed (grace period expired)', 400);
    }

    if (user.role === 'coordinator') {
      const labAssigns = await db.select().from(coordinatorAssignments).where(
        and(eq(coordinatorAssignments.coordinatorId, user.sub), eq(coordinatorAssignments.labId, labId))
      );
      if (labAssigns.length === 0) {
        return errorResponse('FORBIDDEN', 'You do not have access to this lab', 403);
      }
    }

    // Upsert lab submission
    let submission = await db.query.labAttendanceSubmissions.findFirst({
      where: (ls, { eq: e, and: a }) => a(e(ls.slotId, data.slotId), e(ls.labId, labId)),
    });

    if (!submission) {
      const [newSub] = await db.insert(labAttendanceSubmissions).values({
        slotId: data.slotId,
        labId: labId,
        submittedById: user.sub,
        status: 'submitted',
        submittedAt: now,
      }).returning();
      submission = newSub;
    } else {
      await db.update(labAttendanceSubmissions).set({
        submittedById: user.sub,
        status: 'submitted',
        submittedAt: now,
        updatedAt: now,
      }).where(eq(labAttendanceSubmissions.id, submission.id));
    }

    // Upsert member attendance records
    for (const record of data.records) {
      const existing = await db.query.memberAttendance.findFirst({
        where: (ma, { eq: e, and: a }) => a(
          e(ma.submissionId, submission!.id),
          e(ma.memberId, record.memberId),
        ),
      });

      if (existing) {
        await db.update(memberAttendance).set({
          isPresent: record.isPresent,
          markedById: user.sub,
          markedAt: now,
        }).where(eq(memberAttendance.id, existing.id));
      } else {
        await db.insert(memberAttendance).values({
          submissionId: submission!.id,
          teamId: record.teamId,
          memberId: record.memberId,
          isPresent: record.isPresent,
          markedById: user.sub,
          markedAt: now,
        });
      }
    }

    await createAuditLog({
      userId: user.sub,
      action: 'attendance.submitted',
      entityType: 'lab_attendance_submission',
      entityId: submission!.id,
      newValues: { labId, slotId: data.slotId, recordCount: data.records.length },
    });

    return successResponse({ submissionId: submission!.id, recordCount: data.records.length });
  }, ['coordinator', 'admin', 'super_admin']);
}
