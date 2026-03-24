import { NextResponse } from 'next/server';
import { ZodError, type ZodSchema } from 'zod';
import { getAuthUser, type JWTPayload } from './auth';
import type { RoleName } from '@/types';

// ═══════════════════════════════════════
// Standard API Response Helpers
// ═══════════════════════════════════════
export function successResponse<T>(data: T, status = 200, meta?: Record<string, unknown>) {
  return NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) }, { status });
}

export function errorResponse(code: string, message: string, status = 400, details?: { field: string; message: string }[]) {
  return NextResponse.json(
    { success: false, error: { code, message, ...(details ? { details } : {}) } },
    { status }
  );
}

// ═══════════════════════════════════════
// Auth Middleware for API Routes
// ═══════════════════════════════════════
export async function withAuth(
  request: Request,
  handler: (user: JWTPayload) => Promise<NextResponse>,
  allowedRoles?: RoleName[]
): Promise<NextResponse> {
  const user = await getAuthUser(request);
  
  if (!user) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return errorResponse('FORBIDDEN', 'Insufficient permissions', 403);
  }

  return handler(user);
}

// ═══════════════════════════════════════
// Zod Validation Helper
// ═══════════════════════════════════════
export async function validateBody<T>(request: Request, schema: ZodSchema<T>): Promise<{ data?: T; error?: NextResponse }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { data };
  } catch (err) {
    if (err instanceof ZodError) {
      return {
        error: errorResponse('VALIDATION_ERROR', 'Validation failed', 400,
          (err as any).errors.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
        ),
      };
    }
    return { error: errorResponse('BAD_REQUEST', 'Invalid request body', 400) };
  }
}

// ═══════════════════════════════════════
// Pagination Helper
// ═══════════════════════════════════════
export function parsePagination(url: URL) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '25')));
  const sort = url.searchParams.get('sort') || 'created_at';
  const order = (url.searchParams.get('order') || 'desc') as 'asc' | 'desc';
  const q = url.searchParams.get('q') || undefined;
  const skip = (page - 1) * limit;

  return { page, limit, sort, order, q, skip };
}

export function paginationMeta(total: number, page: number, limit: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

// ═══════════════════════════════════════
// Audit Log Helper
// ═══════════════════════════════════════
export async function createAuditLog(params: {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  // Dynamic import to avoid circular dependency
  const { default: prisma } = await import('./prisma');
  await prisma.auditLog.create({ data: params as any });
}
