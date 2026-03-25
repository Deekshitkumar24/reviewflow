export const runtime = 'nodejs';

import { db } from '@/db';
import { labs, labAssignments, rounds, teams, events } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuth, successResponse, errorResponse } from '@/lib/api-utils';

export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    const url = new URL(request.url);
    let eventId = url.searchParams.get('eventId');

    // If no eventId, default to the first active/completed event
    if (!eventId) {
      const activeEvent = await db.query.events.findFirst({
        where: and(
          isNull(events.deletedAt),
          eq(events.status, 'active')
        ),
        orderBy: (e, { desc }) => [desc(e.updatedAt)]
      });
      if (activeEvent) eventId = activeEvent.id;
    }

    if (!eventId) return successResponse([]);

    // Get all labs for this event
    const eventLabs = await db.query.labs.findMany({
      where: eq(labs.eventId, eventId),
      orderBy: (l, { asc }) => [asc(l.labName)],
    });

    if (eventLabs.length === 0) return successResponse([]);

    // Get all lab assignments for teams in this event's active round (or any round if we just want global assignments)
    // Actually, normally teams are assigned per round. We'll fetch all assignments for the event's rounds
    // and just find the unique teams per lab.
    const allRounds = await db.query.rounds.findMany({
      where: eq(rounds.eventId, eventId),
      columns: { id: true, status: true },
    });
    
    // Pick the most relevant round (open > pending > locked)
    let targetRound = allRounds.find(r => r.status === 'open');
    if (!targetRound) targetRound = allRounds.find(r => r.status === 'pending');
    if (!targetRound && allRounds.length > 0) targetRound = allRounds[allRounds.length - 1];

    if (!targetRound) {
        // No rounds, just return labs with 0 counts
        return successResponse(eventLabs.map(l => ({
            id: l.id,
            labName: l.labName,
            building: [l.building, l.floor ? `Floor ${l.floor}` : null].filter(Boolean).join(', '),
            teamCount: 0,
            checkedInCount: 0,
            capacity: l.capacity,
        })));
    }

    // Get team assignments for the target round
    const assignments = await db.query.labAssignments.findMany({
      where: eq(labAssignments.roundId, targetRound.id),
      with: {
        team: { columns: { id: true, attendanceStatus: true } }
      }
    });

    const result = eventLabs.map(lab => {
      const labAsns = assignments.filter(a => a.labId === lab.id);
      // Ensure unique teams just in case of duplicate assignments
      const uniqueTeams = new Map();
      labAsns.forEach(a => {
        if (a.team) uniqueTeams.set(a.team.id, a.team.attendanceStatus);
      });

      let checkedIn = 0;
      uniqueTeams.forEach(status => {
        if (status === 'checked_in') checkedIn++;
      });

      return {
        id: lab.id,
        labName: lab.labName,
        building: [lab.building, lab.floor ? `Floor ${lab.floor}` : null].filter(Boolean).join(', '),
        teamCount: uniqueTeams.size,
        checkedInCount: checkedIn,
        capacity: lab.capacity,
      };
    });

    return successResponse(result);
  }, ['super_admin', 'admin', 'coordinator']);
}
