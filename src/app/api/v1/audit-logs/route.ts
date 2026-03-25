export const runtime = 'nodejs';

import { db } from '@/db';
import { auditLogs, users } from '@/db/schema';
import { eq, or, ilike, and, desc, count } from 'drizzle-orm';
import { withAuth, successResponse, parsePagination, paginationMeta } from '@/lib/api-utils';

// GET /api/v1/audit-logs — Admin only
export async function GET(request: Request) {
  return withAuth(request, async () => {
    const url = new URL(request.url);
    const { page, limit, skip, q } = parsePagination(url);
    const entityType = url.searchParams.get('entityType') || undefined;
    const userId = url.searchParams.get('userId') || undefined;
    const action = url.searchParams.get('action') || undefined;

    const conditions = [];
    if (entityType) conditions.push(eq(auditLogs.entityType, entityType));
    if (userId) conditions.push(eq(auditLogs.userId, userId));
    if (action) conditions.push(ilike(auditLogs.action, `%${action}%`));

    // For full-text cross-table search, we might need a join or specific query mapping
    // But since audit logs search by user name requires a join, we prepare a safe dynamic where clause.
    
    // Manual join required for filtering on user's name
    let results: any[] = [];
    let totalCount: number = 0;

    if (q) {
        const fetchQuery = db.select()
            .from(auditLogs)
            .leftJoin(users, eq(auditLogs.userId, users.id))
            .where(
                and(
                    ...(conditions),
                    or(
                        ilike(auditLogs.action, `%${q}%`),
                        ilike(auditLogs.entityType, `%${q}%`),
                        ilike(users.fullName, `%${q}%`)
                    )
                )
            )
            .orderBy(desc(auditLogs.createdAt))
            .limit(limit)
            .offset(skip);
            
        const countQuery = db.select({ value: count() })
            .from(auditLogs)
            .leftJoin(users, eq(auditLogs.userId, users.id))
            .where(
                and(
                    ...(conditions),
                    or(
                        ilike(auditLogs.action, `%${q}%`),
                        ilike(auditLogs.entityType, `%${q}%`),
                        ilike(users.fullName, `%${q}%`)
                    )
                )
            );

        const [fetchedLogs, totalObj] = await Promise.all([fetchQuery, countQuery]);
        
        // Load relationships fully
        const ids = fetchedLogs.map(f => f.audit_logs.id);
        
        if (ids.length > 0) {
            const logsRelational = await db.query.auditLogs.findMany({
                orderBy: [desc(auditLogs.createdAt)],
                with: {
                  user: { columns: { fullName: true, email: true }, with: { role: { columns: { name: true } } } },
                },
            });
            results = logsRelational.filter(r => ids.includes(r.id));
        } else {
            results = [];
        }
        totalCount = totalObj[0].value;
    } else {
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        const [logs, totalObj] = await Promise.all([
          db.query.auditLogs.findMany({
            where: whereClause,
            limit,
            offset: skip,
            orderBy: [desc(auditLogs.createdAt)],
            with: {
              user: { columns: { fullName: true, email: true }, with: { role: { columns: { name: true } } } },
            },
          }),
          db.select({ value: count() }).from(auditLogs).where(whereClause),
        ]);
        results = logs;
        totalCount = totalObj[0].value;
    }

    const data = results.map((l) => ({
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

    return successResponse(data, 200, { meta: paginationMeta(totalCount, page, limit) });
  }, ['super_admin', 'admin']);
}
