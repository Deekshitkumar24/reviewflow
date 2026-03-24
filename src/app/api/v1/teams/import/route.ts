import prisma from '@/lib/prisma';
import { withAuth, successResponse, errorResponse, createAuditLog } from '@/lib/api-utils';

export const runtime = 'nodejs';

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
    const event = await prisma.event.findFirst({ where: { id: eventId, deletedAt: null } });
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
        const members = [
          { fullName: row.memberName.trim(), email: row.memberEmail, phone: row.memberPhone, isLeader: true, academicYear: row.academicYear ? parseInt(row.academicYear) : null },
          ...(row.memberName2 ? [{ fullName: row.memberName2.trim(), isLeader: false }] : []),
          ...(row.memberName3 ? [{ fullName: row.memberName3.trim(), isLeader: false }] : []),
          ...(row.memberName4 ? [{ fullName: row.memberName4.trim(), isLeader: false }] : []),
        ].filter((m): m is NonNullable<typeof m> => Boolean(m.fullName));

        await prisma.team.create({
          data: {
            eventId,
            teamName: row.teamName.trim(),
            projectTitle: row.projectTitle.trim(),
            projectDescription: row.projectDescription?.trim(),
            domain: row.domain?.trim(),
            department: row.department.trim(),
            collegeName: row.collegeName.trim(),
            githubUrl: row.githubUrl?.trim() || null,
            members: { create: members },
          },
        });

        successRows.push(row.teamName);
      } catch (err) {
        errorRows.push({ row: i + 1, error: (err as Error).message });
      }
    }

    const batch = await prisma.importBatch.create({
      data: {
        eventId,
        importedById: user.sub,
        fileName: `import-${Date.now()}.csv`,
        totalRows: rows.length,
        successRows: successRows.length,
        failedRows: errorRows.length,
        errorsJson: errorRows as any,
      },
    });

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
