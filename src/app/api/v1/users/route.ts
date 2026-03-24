import prisma from '@/lib/prisma';
import { withAuth, successResponse, errorResponse, validateBody, parsePagination, paginationMeta, createAuditLog } from '@/lib/api-utils';
import { createUserSchema } from '@/validators';
import { hashPassword, generateTempPassword } from '@/lib/auth';

// GET /api/v1/users — List users
export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    const url = new URL(request.url);
    const { page, limit, skip, q } = parsePagination(url);
    const role = url.searchParams.get('role') || undefined;
    const status = url.searchParams.get('status') || undefined;

    const where: Record<string, unknown> = { deletedAt: null };
    if (role) where.role = { name: role };
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          role: { select: { name: true, displayName: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const data = users.map((u: typeof users[number]) => ({
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

    return successResponse(data, 200, { meta: paginationMeta(total, page, limit) });
  }, ['super_admin', 'admin']);
}

// POST /api/v1/users — Create user
export async function POST(request: Request) {
  return withAuth(request, async (authUser) => {
    const validation = await validateBody(request, createUserSchema);
    if (validation.error) return validation.error;
    const data = validation.data!;

    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return errorResponse('EMAIL_EXISTS', 'A user with this email already exists', 409);
    }

    // Find role
    const role = await prisma.role.findUnique({ where: { name: data.role } });
    if (!role) {
      return errorResponse('INVALID_ROLE', 'Role not found', 400);
    }

    // Generate temp password
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const user = await prisma.user.create({
      data: {
        roleId: role.id,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || null,
        passwordHash,
        mustChangePassword: true,
        status: 'active',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });

    await createAuditLog({
      userId: authUser.sub,
      action: 'user.created',
      entityType: 'user',
      entityId: user.id,
      newValues: { fullName: data.fullName, email: data.email, role: data.role },
    });

    return successResponse({ ...user, tempPassword, role: data.role }, 201);
  }, ['super_admin', 'admin']);
}

// DELETE /api/v1/users?id=... — Soft delete user
export async function DELETE(request: Request) {
  return withAuth(request, async (authUser) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return errorResponse('MISSING_ID', 'User ID is required', 400);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return errorResponse('NOT_FOUND', 'User not found', 404);

    // Prevent self-deletion
    if (user.id === authUser.sub) {
      return errorResponse('FORBIDDEN', 'Cannot delete your own account', 403);
    }

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'inactive' },
    });

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
