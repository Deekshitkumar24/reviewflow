export const runtime = 'nodejs';

import { db } from '@/db';
import { events, teams, teamMembers, importBatches } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuth, successResponse, errorResponse, createAuditLog } from '@/lib/api-utils';

interface TeamRow {
  teamName: string;
  projectTitle: string;
  department: string;
  collegeName: string;
  projectDescription?: string;
  domain?: string;
  githubUrl?: string;
  memberName: string;
  memberEmail?: string;
  memberPhone?: string;
  isLeader?: string;
  academicYear?: string;
  memberName2?: string;
  memberEmail2?: string;
  memberName3?: string;
  memberName4?: string;
}

// POST /api/v1/teams/import
// Body: { eventId, rows: TeamRow[] }
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const body = await request.json();
    const { eventId, rows } = body as { eventId: string; rows: TeamRow[] };

    if (!eventId) return errorResponse('BAD_REQUEST', 'eventId required', 400);
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return errorResponse('BAD_REQUEST', 'rows array required', 400);
    }
    if (rows.length > 500) return errorResponse('TOO_MANY', 'Maximum 500 teams per import', 400);

    // Validate event exists
    const event = await db.query.events.findFirst({ where: and(eq(events.id, eventId), isNull(events.deletedAt)) });
    if (!event) return errorResponse('NOT_FOUND', 'Event not found', 404);

    const successRows: string[] = [];
    const errorRows: { row: number; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.teamName?.trim()) throw new Error('teamName is required');
        if (!row.projectTitle?.trim()) throw new Error('projectTitle is required');
        if (!row.department?.trim()) throw new Error('department is required');
        if (!row.collegeName?.trim()) throw new Error('collegeName is required');
        if (!row.memberName?.trim()) throw new Error('memberName (leader) is required');

        // Build members array from flattened columns
        const membersList = [
          { fullName: row.memberName.trim(), email: row.memberEmail || null, phone: row.memberPhone || null, isLeader: true, academicYear: row.academicYear ? parseInt(row.academicYear) : null },
          ...(row.memberName2 ? [{ fullName: row.memberName2.trim(), email: row.memberEmail2 || null, phone: null, isLeader: false, academicYear: null }] : []),
          ...(row.memberName3 ? [{ fullName: row.memberName3.trim(), email: null, phone: null, isLeader: false, academicYear: null }] : []),
          ...(row.memberName4 ? [{ fullName: row.memberName4.trim(), email: null, phone: null, isLeader: false, academicYear: null }] : []),
        ].filter((m) => Boolean(m.fullName));

        await db.transaction(async (tx) => {
            const teamInserts = await tx.insert(teams).values({
                eventId,
                teamName: row.teamName.trim(),
                projectTitle: row.projectTitle.trim(),
                projectDescription: row.projectDescription?.trim() || null,
                domain: row.domain?.trim() || null,
                department: row.department.trim(),
                collegeName: row.collegeName.trim(),
                githubUrl: row.githubUrl?.trim() || null,
            }).returning();

            const newTeam = teamInserts[0];

            await tx.insert(teamMembers).values(
                membersList.map(m => ({ ...m, teamId: newTeam.id }))
            );
        });

        successRows.push(row.teamName);
      } catch (err) {
        errorRows.push({ row: i + 1, error: (err as Error).message });
      }
    }

    const batchInserts = await db.insert(importBatches).values({
      eventId,
      importedById: user.sub,
      fileName: `import-${Date.now()}.csv`,
      totalRows: rows.length,
      successRows: successRows.length,
      failedRows: errorRows.length,
      errorsJson: errorRows as any,
    }).returning();

    const batch = batchInserts[0];

    await createAuditLog({
      userId: user.sub,
      action: 'teams.imported',
      entityType: 'event',
      entityId: eventId,
      newValues: { total: rows.length, success: successRows.length, failed: errorRows.length },
    });

    return successResponse({
      batchId: batch.id,
      total: rows.length,
      success: successRows.length,
      failed: errorRows.length,
      errors: errorRows,
    }, 201);
  }, ['super_admin', 'admin']);
}
