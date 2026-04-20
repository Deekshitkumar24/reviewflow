export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { events, teams, labs, labAssignments } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuth, errorResponse } from '@/lib/api-utils';
import { callGemini } from '@/lib/ai';

// POST /api/assignments/suggest
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { eventId, roundId } = body;

      if (!eventId || !roundId) {
        return errorResponse('VALIDATION_ERROR', 'eventId and roundId are required', 400);
      }

      // Fetch all checked-in teams for the event
      const checkedInTeams = await db.select({
        id: teams.id,
        teamName: teams.teamName,
        domain: teams.domain,
        department: teams.department
      }).from(teams)
        .where(
          and(
            eq(teams.eventId, eventId),
            eq(teams.attendanceStatus, 'checked_in'),
            isNull(teams.deletedAt)
          )
        );

      // Fetch existing lab assignments for this round
      const existingAssignments = await db.select()
        .from(labAssignments)
        .where(eq(labAssignments.roundId, roundId));

      const assignedTeamIds = new Set(existingAssignments.map(a => a.teamId));

      // Filter unassigned teams
      const unassignedTeams = checkedInTeams.filter(t => !assignedTeamIds.has(t.id));

      if (unassignedTeams.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            suggestions: [],
            summary: "All checked-in teams have already been assigned to a lab for this round.",
          }
        });
      }

      // Fetch all active labs with their capacity for this event
      const eventLabs = await db.select({
        id: labs.id,
        labName: labs.labName,
        capacity: labs.capacity,
        notes: labs.notes,
      }).from(labs)
        .where(
          and(
            eq(labs.eventId, eventId),
            eq(labs.status, 'active'),
            isNull(labs.deletedAt)
          )
        );

      if (eventLabs.length === 0) {
        return errorResponse('NO_LABS', 'There are no active labs to assign teams to.', 400);
      }

      // Compute current assigned counts per lab (if any)
      const labLoad = new Map<string, number>();
      eventLabs.forEach(lab => labLoad.set(lab.id, 0));
      existingAssignments.forEach(a => {
        if (labLoad.has(a.labId)) {
          labLoad.set(a.labId, labLoad.get(a.labId)! + 1);
        }
      });

      // Greedy deterministic assignment
      const suggestions: Array<{ teamId: string; teamName: string; labId: string; labName: string; confidence: 'High'|'Medium'|'Low'; reason: string }> = [];
      const labsStatus = eventLabs.map(lab => ({
        ...lab,
        currentLoad: labLoad.get(lab.id) || 0,
        availableSlots: Math.max(0, lab.capacity - (labLoad.get(lab.id) || 0))
      }));

      let unassignedIndex = 0;
      let overflowCount = 0;
      let domainMatches = 0;

      while (unassignedIndex < unassignedTeams.length) {
        const team = unassignedTeams[unassignedIndex];
        // Sort labs by available slots descending
        labsStatus.sort((a, b) => b.availableSlots - a.availableSlots);
        
        let selectedLab = labsStatus[0];
        let confidence: 'High' | 'Medium' | 'Low' = 'Medium';
        let reason = `Assigned based on capacity fit.`;

        // Check for domain match if available slots exist
        if (selectedLab.availableSlots > 0 && team.domain) {
          const matchedLab = labsStatus.find(l => l.availableSlots > 0 && 
            (l.labName.toLowerCase().includes(team.domain!.toLowerCase()) || 
             (l.notes && l.notes.toLowerCase().includes(team.domain!.toLowerCase()))));
          
          if (matchedLab) {
            selectedLab = matchedLab;
            confidence = 'High';
            reason = `Domain match (${team.domain}) with adequate capacity.`;
            domainMatches++;
          }
        }

        if (selectedLab.availableSlots <= 0) {
          // All labs full, over-assign starting with least load
          labsStatus.sort((a, b) => a.currentLoad - b.currentLoad);
          selectedLab = labsStatus[0];
          confidence = 'Low';
          reason = `Capacity overflow fallback (lab capacity: ${selectedLab.capacity}).`;
          overflowCount++;
        }

        suggestions.push({
          teamId: team.id,
          teamName: team.teamName,
          labId: selectedLab.id,
          labName: selectedLab.labName,
          confidence,
          reason
        });
        
        if (selectedLab.availableSlots > 0) {
          selectedLab.availableSlots--;
        }
        selectedLab.currentLoad++;
        unassignedIndex++;
      }

      // Generate summary deterministically
      const summaryText = `Distributed ${unassignedTeams.length} teams across ${eventLabs.length} labs. ` +
        (overflowCount > 0 
          ? `WARNING: ${overflowCount} teams allocated beyond standard capacity. ` 
          : `All teams fit within existing capacity. `) +
        (domainMatches > 0 ? `${domainMatches} teams matched by domain similarity.` : '');

      return NextResponse.json({
        success: true,
        data: {
          suggestions,
          summary: summaryText,
        }
      });
    } catch (error: any) {
      console.error('[Suggest Assignments Error]:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to generate assignments', 500);
    }
  }, ['super_admin', 'admin', 'coordinator']);
}
