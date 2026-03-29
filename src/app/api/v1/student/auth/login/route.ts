import { NextResponse } from 'next/server';
import { db } from '@/db';
import { studentTeamAuth, teams } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/lib/auth';
import { validateBody, errorResponse } from '@/lib/api-utils';
import { studentLoginSchema } from '@/validators';
import { SignJWT } from 'jose';

export const runtime = 'nodejs';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-me-in-production-256bit'
);

const STUDENT_ACCESS_TOKEN_EXPIRY = '2h';

async function generateStudentAccessToken(payload: {
  teamId: string;
  loginEmail: string;
  eventId: string;
  labId?: string | null;
}): Promise<string> {
  return new SignJWT({
    sub: payload.teamId,
    email: payload.loginEmail,
    eventId: payload.eventId,
    labId: payload.labId || null,
    role: 'student',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(STUDENT_ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function POST(request: Request) {
  const validation = await validateBody(request, studentLoginSchema);
  if (validation.error) return validation.error;
  const { email, password } = validation.data!;

  // Find student auth record
  const authRecord = await db.query.studentTeamAuth.findFirst({
    where: (sta, { eq: e }) => e(sta.loginEmail, email),
    with: {
      team: {
        columns: { id: true, teamName: true, eventId: true, labId: true, deletedAt: true },
      },
    },
  });

  if (!authRecord || !authRecord.team || authRecord.team.deletedAt) {
    return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  if (authRecord.status === 'disabled') {
    return errorResponse('ACCOUNT_DISABLED', 'This team account has been disabled. Contact your coordinator.', 401);
  }

  // Check lockout
  if (authRecord.failedLoginCount >= 10 && authRecord.lockedUntil && authRecord.lockedUntil > new Date()) {
    const remainingMin = Math.ceil((authRecord.lockedUntil.getTime() - Date.now()) / 60000);
    return errorResponse('ACCOUNT_LOCKED', `Account locked. Try again in ${remainingMin} minute(s)`, 429);
  }

  const passwordValid = await verifyPassword(password, authRecord.passwordHash);
  if (!passwordValid) {
    const newCount = authRecord.failedLoginCount + 1;
    const updateData: Record<string, unknown> = { failedLoginCount: newCount };
    if (newCount >= 10) updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    await db.update(studentTeamAuth).set(updateData as any).where(eq(studentTeamAuth.id, authRecord.id));
    return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  // Reset failed count on success
  await db.update(studentTeamAuth).set({
    failedLoginCount: 0,
    lastLoginAt: new Date(),
    lockedUntil: null,
  }).where(eq(studentTeamAuth.id, authRecord.id));

  const accessToken = await generateStudentAccessToken({
    teamId: authRecord.team.id,
    loginEmail: authRecord.loginEmail,
    eventId: authRecord.team.eventId,
    labId: authRecord.team.labId,
  });

  const res = NextResponse.json({
    success: true,
    data: {
      accessToken,
      team: {
        teamId: authRecord.team.id,
        teamName: authRecord.team.teamName,
        loginEmail: authRecord.loginEmail,
        eventId: authRecord.team.eventId,
        labId: authRecord.team.labId,
      },
    },
  }, { status: 200 });

  // Set student access token cookie (separate from staff)
  res.cookies.set('studentAccessToken', accessToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 2 * 60 * 60, // 2 hours
  });

  return res;
}
