export const runtime = 'nodejs';

import { db } from '@/db';
import { users, roles } from '@/db/schema';
import { eq, and, or, ilike, isNull, desc, count } from 'drizzle-orm';
import { withAuth, successResponse, errorResponse, validateBody, parsePagination, paginationMeta, createAuditLog } from '@/lib/api-utils';
import { createUserSchema } from '@/validators';
import { hashPassword, generateTempPassword } from '@/lib/auth';

// GET /api/v1/users — List users
export async function GET(request: Request) {
  return withAuth(request, async () => {
    const url = new URL(request.url);
    const { page, limit, skip, q } = parsePagination(url);
    const roleParam = url.searchParams.get('role') || undefined;
    const statusParam = url.searchParams.get('status') || undefined;

    const conditions = [isNull(users.deletedAt)];
    
    if (roleParam) {
      const roleRecord = await db.query.roles.findFirst({ where: eq(roles.name, roleParam) });
      if (roleRecord) conditions.push(eq(users.roleId, roleRecord.id));
      else conditions.push(eq(users.roleId, '00000000-0000-0000-0000-000000000000')); // force empty
    }
    
    if (statusParam) conditions.push(eq(users.status, statusParam));
    
    if (q) {
      conditions.push(or(
        ilike(users.fullName, `%${q}%`),
        ilike(users.email, `%${q}%`)
      )!);
    }

    const whereClause = and(...conditions);

    const [usersList, totalObj] = await Promise.all([
      db.query.users.findMany({
        where: whereClause,
        limit,
        offset: skip,
        orderBy: [desc(users.createdAt)],
        with: { role: { columns: { name: true, displayName: true } } },
      }),
      db.select({ value: count() }).from(users).where(whereClause),
    ]);

    const data = usersList.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      role: u.role.name,
      roleDisplayName: u.role.displayName,
      status: u.status,
      lastLoginAt: u.lastLoginAt?.toISOString() || null,
      createdAt: u.createdAt.toISOString(),
    }));

    return successResponse(data, 200, { meta: paginationMeta(totalObj[0].value, page, limit) });
  }, ['super_admin', 'admin']);
}

// POST /api/v1/users — Create user
export async function POST(request: Request) {
  return withAuth(request, async (authUser) => {
    const validation = await validateBody(request, createUserSchema);
    if (validation.error) return validation.error;
    const data = validation.data!;

    // Check email uniqueness
    const existing = await db.query.users.findFirst({ where: eq(users.email, data.email.toLowerCase()) });
    if (existing) {
      return errorResponse('EMAIL_EXISTS', 'A user with this email already exists', 409);
    }

    // Find role
    const roleRecord = await db.query.roles.findFirst({ where: eq(roles.name, data.role) });
    if (!roleRecord) {
      return errorResponse('INVALID_ROLE', 'Role not found', 400);
    }

    // Generate temp password
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const insertedUsers = await db.insert(users).values({
      roleId: roleRecord.id,
      fullName: data.fullName,
      email: data.email.toLowerCase(),
      phone: data.phone || null,
      passwordHash,
      mustChangePassword: true,
      status: 'active',
    }).returning();

    const user = insertedUsers[0];

    await createAuditLog({
      userId: authUser.sub,
      action: 'user.created',
      entityType: 'user',
      entityId: user.id,
      newValues: { fullName: data.fullName, email: data.email, role: data.role },
    });

    return successResponse({ 
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      status: user.status,
      createdAt: user.createdAt,
      tempPassword, 
      role: data.role 
    }, 201);
  }, ['super_admin', 'admin']);
}

// DELETE /api/v1/users?id=... — Soft delete user
export async function DELETE(request: Request) {
  return withAuth(request, async (authUser) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return errorResponse('MISSING_ID', 'User ID is required', 400);

    const user = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!user) return errorResponse('NOT_FOUND', 'User not found', 404);

    // Prevent self-deletion
    if (user.id === authUser.sub) {
      return errorResponse('FORBIDDEN', 'Cannot delete your own account', 403);
    }

    await db.update(users)
      .set({ deletedAt: new Date(), status: 'inactive' })
      .where(eq(users.id, id));

    await createAuditLog({
      userId: authUser.sub,
      action: 'user.deleted',
      entityType: 'user',
      entityId: id,
      oldValues: { fullName: user.fullName, email: user.email },
    });

    return successResponse({ deleted: true }, 200);
  }, ['super_admin', 'admin']);
}
