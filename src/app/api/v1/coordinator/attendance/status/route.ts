export const runtime = 'nodejs';

import { db } from '@/db';
import { attendanceSlots, labAttendanceSubmissions, coordinatorAssignments } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuth, successResponse } from '@/lib/api-utils';

export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    if (user.role !== 'coordinator') return successResponse([]);

    // Get assigned labs
    const assignments = await db.select({ labId: coordinatorAssignments.labId })
      .from(coordinatorAssignments)
      .where(eq(coordinatorAssignments.coordinatorId, user.sub));

    if (assignments.length === 0) return successResponse([]);

    // We get all active slots
    const activeSlots = await db.select()
      .from(attendanceSlots)
      .where(eq(attendanceSlots.status, 'active'));

    if (activeSlots.length === 0) return successResponse([]);

    const now = new Date();
    const alerts: any[] = [];

    for (const asn of assignments) {
      for (const slot of activeSlots) {
        // Check if submission exists
        const [submission] = await db.select({ id: labAttendanceSubmissions.id })
          .from(labAttendanceSubmissions)
          .where(
            and(
              eq(labAttendanceSubmissions.slotId, slot.id),
              eq(labAttendanceSubmissions.labId, asn.labId)
            )
          );

        if (!submission) {
          // It's missing attendance! Construct a timing alert
          const dueTime = new Date(slot.dueTime);
          const diffMs = dueTime.getTime() - now.getTime();
          const diffMins = Math.round(diffMs / 60000);

          let message = null;
          let level = 'info';

          if (diffMins > 15 && diffMins <= 60) {
            message = `Attendance pending for slot "${slot.slotName}"`;
            level = 'info';
          } else if (diffMins > 5 && diffMins <= 15) {
            message = `Only ${diffMins} minutes left to submit attendance for "${slot.slotName}"!`;
            level = 'warning';
          } else if (diffMins > 0 && diffMins <= 5) {
            message = `URGENT: 5 minutes left to submit attendance for "${slot.slotName}"!`;
            level = 'danger';
          } else if (diffMins <= 0 && diffMins >= -slot.gracePeriodMinutes) {
            message = `Due time reached for "${slot.slotName}". Grace period active!`;
            level = 'danger';
          }

          if (message) {
            alerts.push({
              slotId: slot.id,
              labId: asn.labId,
              message,
              level,
              diffMins
            });
          }
        }
      }
    }

    return successResponse(alerts);
  });
}
