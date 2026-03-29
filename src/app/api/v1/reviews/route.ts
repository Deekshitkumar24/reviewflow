export const runtime = 'nodejs';

import { db } from '@/db';
import { reviews, rounds, mentorAssignments, coordinatorAssignments, suggestions, suggestionStatusLogs } from '@/db/schema';
import { eq, and, desc, count, inArray } from 'drizzle-orm';
import { withAuth, successResponse, errorResponse, validateBody, parsePagination, paginationMeta, createAuditLog } from '@/lib/api-utils';
import { z } from 'zod';
import { calculateCompositeScore } from '@/types';

// The review submission schema maps to the ReviewForm UI
const submitReviewSchema = z.object({
  teamId: z.string().uuid(),
  roundId: z.string().uuid(),
  scores: z.object({
    innovationScore: z.number().min(1).max(10),
    technicalScore: z.number().min(1).max(10),
    presentationScore: z.number().min(1).max(10),
    feasibilityScore: z.number().min(1).max(10),
    problemSolvingScore: z.number().min(1).max(10),
    communicationScore: z.number().min(1).max(10),
  }),
  strengths: z.string().optional(),
  weaknesses: z.string().min(10),
  overallComments: z.string().optional(),
  verdict: z.enum(['selected', 'shortlisted', 'hold', 'needs_improvement', 'not_selected']),
  suggestions: z.array(z.object({
    text: z.string().min(2),
    category: z.string(),
    orderIndex: z.number(),
  })).max(5).optional(),
  suggestionStatuses: z.array(z.object({
    suggestionId: z.string().uuid(),
    status: z.enum(['completed', 'partial', 'not_done']),
  })).optional(),
  isDraft: z.boolean().default(false),
});

// GET /api/v1/reviews — List reviews (Admin/Coordinator/Mentor)
export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    const url = new URL(request.url);
    const { page, limit, skip } = parsePagination(url);
    // eventId search handled safely through relations conceptually
    const teamIdParam = url.searchParams.get('teamId') || undefined;
    const mentorIdParam = url.searchParams.get('mentorId') || undefined;
    const isDraftParam = url.searchParams.has('isDraft') ? url.searchParams.get('isDraft') === 'true' : undefined;

    const conditions = [];
    if (teamIdParam) conditions.push(eq(reviews.teamId, teamIdParam));
    
    if (user.role === 'mentor' && mentorIdParam === user.sub) {
        conditions.push(eq(reviews.mentorId, user.sub));
    } else if (mentorIdParam) {
        conditions.push(eq(reviews.mentorId, mentorIdParam));
    }
    
    if (isDraftParam !== undefined) conditions.push(eq(reviews.isDraft, isDraftParam));

    // Strict Role Scoping
    if (user.role === 'coordinator') {
      const coordAsns = await db.select({ labId: coordinatorAssignments.labId })
        .from(coordinatorAssignments).where(eq(coordinatorAssignments.coordinatorId, user.sub));
      const myLabs = coordAsns.map(a => a.labId);
      if (myLabs.length === 0) return successResponse([], 200, { meta: paginationMeta(0, page, limit) });
      conditions.push(inArray(reviews.labId, myLabs));
    } else if (user.role === 'mentor') {
      const mentorAsns = await db.select({ labId: mentorAssignments.labId })
        .from(mentorAssignments).where(eq(mentorAssignments.mentorId, user.sub));
      const myLabs = mentorAsns.map(a => a.labId);
      if (myLabs.length === 0) return successResponse([], 200, { meta: paginationMeta(0, page, limit) });
      conditions.push(inArray(reviews.labId, myLabs));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [reviewList, totalObj] = await Promise.all([
      db.query.reviews.findMany({
        where: whereClause,
        limit,
        offset: skip,
        orderBy: [desc(reviews.reviewedAt)],
        with: {
          team: { columns: { teamName: true } },
          mentor: { columns: { fullName: true } },
          round: { columns: { roundName: true, roundOrder: true } },
        },
      }),
      db.select({ value: count() }).from(reviews).where(whereClause),
    ]);

    const data = reviewList.map((r) => ({
      id: r.id,
      teamName: r.team.teamName,
      mentorName: r.mentor.fullName,
      roundName: r.round.roundName,
      compositeScore: r.compositeScore,
      verdict: r.verdict,
      isDraft: r.isDraft,
      reviewedAt: r.reviewedAt.toISOString(),
    }));

    return successResponse(data, 200, { meta: paginationMeta(totalObj[0].value, page, limit) });
  });
}

// POST /api/v1/reviews — Submit or Save Draft Review
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const validation = await validateBody(request, submitReviewSchema);
    if (validation.error) return validation.error;
    const data = validation.data!;

    // Find previous review if not a draft to block duplicates
    if (!data.isDraft) {
      const existing = await db.query.reviews.findFirst({
        where: and(
            eq(reviews.teamId, data.teamId),
            eq(reviews.roundId, data.roundId),
            eq(reviews.mentorId, user.sub),
            eq(reviews.isDraft, false)
        )
      });
      if (existing) {
        return errorResponse('REVIEW_EXISTS', 'You have already submitted a final review for this team in this round', 409);
      }
    }

    // Look up the round & lab
    const [roundRecord, labAssignment] = await Promise.all([
      db.query.rounds.findFirst({ where: eq(rounds.id, data.roundId) }),
      db.query.mentorAssignments.findFirst({ 
          where: and(eq(mentorAssignments.mentorId, user.sub), eq(mentorAssignments.roundId, data.roundId)) 
      })
    ]);

    if (!roundRecord) return errorResponse('NOT_FOUND', 'Round not found', 404);
    if (!labAssignment) return errorResponse('NOT_FOUND', 'You are not assigned to a lab for this round. Cannot submit review.', 403);
    if (roundRecord.status !== 'open') {
      return errorResponse('FORBIDDEN', 'This round is not currently open for reviews.', 403);
    }

    const compositeScoreValue = calculateCompositeScore(data.scores);

    // Create review inside transaction to save suggestions & statuses
    const reviewResult = await db.transaction(async (tx) => {
      // Find and delete any existing draft for this mentor/team/round
      const oldDraft = await tx.query.reviews.findFirst({
         where: and(
             eq(reviews.teamId, data.teamId),
             eq(reviews.roundId, data.roundId),
             eq(reviews.mentorId, user.sub),
             eq(reviews.isDraft, true)
         )
      });

      if (oldDraft) {
         await tx.delete(reviews).where(eq(reviews.id, oldDraft.id));
      }

      const inserted = await tx.insert(reviews).values({
          teamId: data.teamId,
          mentorId: user.sub,
          labId: labAssignment.labId,
          roundId: data.roundId,
          innovationScore: data.scores.innovationScore,
          technicalScore: data.scores.technicalScore,
          presentationScore: data.scores.presentationScore,
          feasibilityScore: data.scores.feasibilityScore,
          problemSolvingScore: data.scores.problemSolvingScore,
          communicationScore: data.scores.communicationScore,
          compositeScore: compositeScoreValue.toString(),
          strengths: data.strengths || null,
          weaknesses: data.weaknesses,
          overallComments: data.overallComments || null,
          verdict: data.verdict,
          isDraft: data.isDraft,
          reviewedAt: data.isDraft ? undefined : new Date(),
      }).returning();

      const rev = inserted[0];

      if (data.suggestions && data.suggestions.length > 0) {
          await tx.insert(suggestions).values(
              data.suggestions.map(s => ({
                  reviewId: rev.id,
                  text: s.text,
                  category: s.category,
                  orderIndex: s.orderIndex,
              }))
          );
      }

      // Handle suggestion statuses if any
      if (data.suggestionStatuses && data.suggestionStatuses.length > 0 && !data.isDraft) {
          await tx.insert(suggestionStatusLogs).values(
              data.suggestionStatuses.map(ss => ({
                  suggestionId: ss.suggestionId,
                  roundId: data.roundId,
                  status: ss.status
              }))
          );
      }

      return rev;
    });

    if (!data.isDraft) {
      await createAuditLog({
        userId: user.sub,
        action: 'review.submitted',
        entityType: 'review',
        entityId: reviewResult.id,
        newValues: { teamId: data.teamId, compositeScore: compositeScoreValue, verdict: data.verdict },
      });
    }

    return successResponse(reviewResult, 201);
  }, ['mentor', 'admin', 'super_admin']); // Admins can test/submit reviews
}
