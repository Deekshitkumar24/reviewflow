import { db } from '@/db';
import { attendanceSlots, labAttendanceSubmissions, memberAttendance, labs } from '@/db/schema';
import { eq, and, count, sql, desc, asc } from 'drizzle-orm';
import { withAuth, errorResponse, successResponse } from '@/lib/api-utils';

export const runtime = 'nodejs';

// GET — Admin attendance overview with aggregated stats
export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId');
    if (!eventId) return errorResponse('BAD_REQUEST', 'eventId is required', 400);

    const slotId = url.searchParams.get('slotId');
    const labId = url.searchParams.get('labId');

    // Get all slots for event
    const allSlots = await db.query.attendanceSlots.findMany({
      where: (s, { eq: e }) => e(s.eventId, eventId),
      orderBy: (s) => [asc(s.slotDate), asc(s.slotNumber)],
    });

    // Get all labs for event
    const allLabs = await db.query.labs.findMany({
      where: (l, { eq: e, isNull: isN }) => and(e(l.eventId, eventId), isN(l.deletedAt)),
      columns: { id: true, labName: true },
    });

    // Get all submissions
    const slotIds = slotId ? [slotId] : allSlots.map(s => s.id);
    let submissions: any[] = [];
    if (slotIds.length > 0) {
      const allSubs = await db.query.labAttendanceSubmissions.findMany({
        where: (ls, { inArray: inA }) => inA(ls.slotId, slotIds),
        with: {
          lab: { columns: { labName: true } },
          submittedBy: { columns: { fullName: true } },
        },
      });
      if (labId) {
        submissions = allSubs.filter(s => s.labId === labId);
      } else {
        submissions = allSubs;
      }
    }

    // Get member attendance records for these submissions
    const subIds = submissions.map(s => s.id);
    let memberRecords: any[] = [];
    if (subIds.length > 0) {
      memberRecords = await db.query.memberAttendance.findMany({
        where: (ma, { inArray: inA }) => inA(ma.submissionId, subIds),
        with: {
          member: { columns: { fullName: true, rollNumber: true } },
          team: { columns: { teamName: true } },
        },
      });
    }

    // Aggregate stats
    const totalLabs = allLabs.length;
    const totalSlots = allSlots.length;
    const submittedCount = submissions.filter(s => s.status === 'submitted').length;
    const pendingCount = (totalSlots * totalLabs) - submittedCount;
    const presentCount = memberRecords.filter(r => r.isPresent).length;
    const absentCount = memberRecords.filter(r => !r.isPresent).length;

    // Missed submissions (slot past grace, no submission)
    const now = new Date();
    let missedCount = 0;
    for (const slot of allSlots) {
      const graceEnd = new Date(slot.dueTime.getTime() + slot.gracePeriodMinutes * 60 * 1000);
      if (now > graceEnd) {
        for (const lab of allLabs) {
          const hasSub = submissions.some(s => s.slotId === slot.id && s.labId === lab.id && s.status === 'submitted');
          if (!hasSub) missedCount++;
        }
      }
    }

    // Build slot-wise data
    const slotData = allSlots.map(slot => {
      const slotSubs = submissions.filter(s => s.slotId === slot.id);
      const slotRecords = memberRecords.filter(r => slotSubs.some(s => s.id === r.submissionId));
      const graceEnd = new Date(slot.dueTime.getTime() + slot.gracePeriodMinutes * 60 * 1000);
      const isEscalation = now > graceEnd && slotSubs.length < totalLabs;

      return {
        id: slot.id,
        slotName: slot.slotName,
        slotNumber: slot.slotNumber,
        slotDate: slot.slotDate.toISOString(),
        startTime: slot.startTime.toISOString(),
        dueTime: slot.dueTime.toISOString(),
        status: slot.status,
        submittedLabs: slotSubs.length,
        totalLabs,
        presentCount: slotRecords.filter(r => r.isPresent).length,
        absentCount: slotRecords.filter(r => !r.isPresent).length,
        isEscalation,
        labs: allLabs.map(lab => {
          const sub = slotSubs.find(s => s.labId === lab.id);
          return {
            labId: lab.id,
            labName: lab.labName,
            status: sub ? sub.status : (now > graceEnd ? 'missed' : 'pending'),
            submittedBy: sub?.submittedBy?.fullName || null,
            submittedAt: sub?.submittedAt?.toISOString() || null,
          };
        }),
      };
    });

    return successResponse({
      summary: {
        totalSlots,
        totalLabs,
        totalSubmissions: submittedCount,
        pendingSubmissions: pendingCount,
        missedSubmissions: missedCount,
        totalPresent: presentCount,
        totalAbsent: absentCount,
        totalMembers: presentCount + absentCount,
      },
      slots: slotData,
    });
  }, ['super_admin', 'admin']);
}
