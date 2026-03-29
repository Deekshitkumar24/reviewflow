export const runtime = 'nodejs';

import { db } from '@/db';
import { memberAttendance, labAttendanceSubmissions, attendanceSlots, teams, teamMembers } from '@/db/schema';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { withAuth, errorResponse } from '@/lib/api-utils';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId');
    if (!eventId) return errorResponse('BAD_REQUEST', 'eventId required', 400);

    // Get slots
    const slots = await db.query.attendanceSlots.findMany({
      where: (s, { eq: e }) => e(s.eventId, eventId),
      orderBy: (s) => [s.slotDate, s.slotNumber],
    });

    const slotIds = slots.map(s => s.id);
    if (slotIds.length === 0) return new NextResponse('No attendance slots found', { status: 404 });

    // Fetch team and member data
    const allTeams = await db.query.teams.findMany({
      where: (t, { eq: e, isNull: isN, and: a }) => a(e(t.eventId, eventId), isN(t.deletedAt)),
      with: {
        event: { columns: { eventName: true } },
        members: true
      }
    });

    // Submissions and attendance records
    const submissions = await db.query.labAttendanceSubmissions.findMany({
      where: (ls, { inArray: inA }) => inA(ls.slotId, slotIds),
      with: { lab: { columns: { labName: true } } },
    });

    const subIds = submissions.map(s => s.id);
    let allAttendanceRecords: any[] = [];
    if (subIds.length > 0) {
      allAttendanceRecords = await db.query.memberAttendance.findMany({
        where: (ma, { inArray: inA }) => inA(ma.submissionId, subIds),
      });
    }

    // Build flat rows based on slots x teams
    const csvRows: string[][] = [];
    
    // Headers
    const headers = [
      'Event Name', 'Slot Name', 'Slot Date', 'Lab Name', 'Team Name', 'Project Title', 
      'Participation Type', 'Team Leader', 'Total Members', 'Total Present', 'Total Absent'
    ];
    for (let i = 1; i <= 6; i++) {
       headers.push(`Member ${i} Name`, `Member ${i} Roll`, `Member ${i} Email`, `Member ${i} Status`);
    }

    csvRows.push(headers);

    for (const slot of slots) {
      const slotSubs = submissions.filter(s => s.slotId === slot.id);
      if (slotSubs.length === 0) continue;

      for (const sub of slotSubs) {
        // Teams assigned to this lab
        const teamsInLab = allTeams.filter(t => t.labId === sub.labId);
        
        for (const team of teamsInLab) {
          // Attendance records for this team in this submission
          const teamAttendance = allAttendanceRecords.filter(a => a.submissionId === sub.id && a.teamId === team.id);
          
          let totalPresent = 0;
          let totalAbsent = 0;
          
          // Map members to their status
          const memberData = team.members.map(m => {
             const rec = teamAttendance.find(a => a.memberId === m.id);
             const status = rec ? (rec.isPresent ? 'Present' : 'Absent') : 'Not Marked';
             if (status === 'Present') totalPresent++;
             else if (status === 'Absent') totalAbsent++;
             return { name: m.fullName, roll: m.rollNumber, email: m.email || '', status };
          });
          
          const leader = team.members.find(m => m.isLeader);

          // Base row
          const row = [
            team.event?.eventName || '',
            slot.slotName,
            slot.slotDate.toISOString().split('T')[0],
            sub.lab?.labName || '',
            team.teamName,
            team.projectTitle,
            team.participationType,
            leader?.fullName || '',
            team.members.length.toString(),
            totalPresent.toString(),
            totalAbsent.toString()
          ];

          // Append up to 6 members
          for (let i = 0; i < 6; i++) {
             if (i < memberData.length) {
                row.push(memberData[i].name, memberData[i].roll || '', memberData[i].email || '', memberData[i].status);
             } else {
                row.push('', '', '', ''); // Empty padding
             }
          }

          csvRows.push(row);
        }
      }
    }

    // Convert to CSV
    const escapeCsv = (str: string) => `"${String(str).replace(/"/g, '""')}"`;
    const csvContent = csvRows.map(row => row.map(escapeCsv).join(',')).join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="attendance_export_${eventId}.csv"`,
      },
    });
  }, ['super_admin', 'admin']);
}
