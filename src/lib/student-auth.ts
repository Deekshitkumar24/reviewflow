import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-me-in-production-256bit'
);

export interface StudentJWTPayload {
  sub: string; // teamId
  email: string;
  eventId: string;
  labId: string | null;
  role: 'student';
  iat?: number;
  exp?: number;
}

/**
 * Extract and verify student access token from request.
 * Returns the decoded payload or null if invalid.
 */
export async function getStudentAuthUser(request: Request): Promise<StudentJWTPayload | null> {
  // Check Authorization header first
  const authHeader = request.headers.get('Authorization');
  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else {
    // Fallback to cookie
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/studentAccessToken=([^;]+)/);
    token = match?.[1];
  }

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== 'student') return null;
    return payload as unknown as StudentJWTPayload;
  } catch {
    return null;
  }
}

/**
 * API route middleware for student-authenticated endpoints.
 * Returns the student payload or an error response.
 */
export async function withStudentAuth(
  request: Request,
  handler: (student: StudentJWTPayload) => Promise<Response>,
): Promise<Response> {
  const student = await getStudentAuthUser(request);
  if (!student) {
    const { errorResponse } = await import('@/lib/api-utils');
    return errorResponse('UNAUTHORIZED', 'Student authentication required', 401);
  }
  return handler(student);
}
