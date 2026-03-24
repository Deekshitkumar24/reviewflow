import prisma from '@/lib/prisma';
import { withAuth, successResponse, parsePagination, paginationMeta } from '@/lib/api-utils';

export const runtime = 'nodejs';

// GET /api/v1/audit-logs — Admin only
export async function GET(request: Request) {
  return withAuth(request, async () => {
    const url = new URL(request.url);
    const { page, limit, skip, q } = parsePagination(url);
    const entityType = url.searchParams.get('entityType') || undefined;
    const userId = url.searchParams.get('userId') || undefined;
    const action = url.searchParams.get('action') || undefined;

    const where: Record<string, unknown> = {};
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (q) {
      where.OR = [
        { action: { contains: q, mode: 'insensitive' } },
        { entityType: { contains: q, mode: 'insensitive' } },
        { user: { fullName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true, email: true, role: { select: { name: true } } } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const data = logs.map((l) => ({
      id: l.id,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      createdAt: l.createdAt.toISOString(),
      ipAddress: l.ipAddress,
      userName: l.user?.fullName ?? 'System',
      userEmail: l.user?.email,
      userRole: l.user?.role?.name,
      newValues: l.newValues,
      oldValues: l.oldValues,
    }));

    return successResponse(data, 200, { meta: paginationMeta(total, page, limit) });
  }, ['super_admin', 'admin']);
}
