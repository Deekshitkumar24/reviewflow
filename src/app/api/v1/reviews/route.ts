import prisma from '@/lib/prisma';
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
    const eventId = url.searchParams.get('eventId') || undefined;
    const teamId = url.searchParams.get('teamId') || undefined;
    const mentorId = url.searchParams.get('mentorId') || undefined;
    const isDraft = url.searchParams.has('isDraft') ? url.searchParams.get('isDraft') === 'true' : undefined;

    const where: Record<string, unknown> = { };
    if (eventId) where.eventId = eventId;
    if (teamId) where.teamId = teamId;
    
    // Non-admins can only see their own drafts, but can see all submitted reviews (or access controlled)
    if (user.role === 'mentor' && mentorId === user.sub) {
      where.mentorId = user.sub;
    } else if (mentorId) {
       where.mentorId = mentorId;
    }
    
    if (isDraft !== undefined) where.isDraft = isDraft;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { reviewedAt: 'desc' },
        include: {
          team: { select: { teamName: true } },
          mentor: { select: { fullName: true } },
          round: { select: { roundName: true, roundOrder: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    const data = reviews.map((r: typeof reviews[number]) => ({
      id: r.id,
      teamName: r.team.teamName,
      mentorName: r.mentor.fullName,
      roundName: r.round.roundName,
      compositeScore: r.compositeScore,
      verdict: r.verdict,
      isDraft: r.isDraft,
      // submittedAt removed since we use reviewedAt
      reviewedAt: r.reviewedAt.toISOString(),
    }));

    return successResponse(data, 200, { meta: paginationMeta(total, page, limit) });
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
      const existing = await prisma.review.findFirst({
        where: { teamId: data.teamId, roundId: data.roundId, mentorId: user.sub, isDraft: false }
      });
      if (existing) {
        return errorResponse('REVIEW_EXISTS', 'You have already submitted a final review for this team in this round', 409);
      }
    }

    // Look up the round & lab
    const [round, labAssignment] = await Promise.all([
      prisma.round.findUnique({ where: { id: data.roundId } }),
      prisma.mentorAssignment.findFirst({ where: { mentorId: user.sub, roundId: data.roundId } })
    ]);
    if (!round) return errorResponse('NOT_FOUND', 'Round not found', 404);
    if (!labAssignment) return errorResponse('NOT_FOUND', 'You are not assigned to a lab for this round. Cannot submit review.', 403);

    const compositeScore = calculateCompositeScore(data.scores);

    // Create review inside transaction to save suggestions & statuses
    const review = await prisma.$transaction(async (tx) => {
      // Find and delete any existing draft for this mentor/team/round
      const oldDraft = await tx.review.findFirst({
         where: { teamId: data.teamId, roundId: data.roundId, mentorId: user.sub, isDraft: true }
      });
      if (oldDraft) {
         await tx.review.delete({ where: { id: oldDraft.id } });
      }

      const rev = await tx.review.create({
        data: {
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
          compositeScore,
          strengths: data.strengths || null,
          weaknesses: data.weaknesses,
          overallComments: data.overallComments || null,
          verdict: data.verdict,
          isDraft: data.isDraft,
          reviewedAt: data.isDraft ? undefined : new Date(),
          
          suggestions: data.suggestions && data.suggestions.length > 0 ? {
            create: data.suggestions.map(s => ({
              text: s.text,
              category: s.category,
              orderIndex: s.orderIndex,
            }))
          } : undefined,
        }
      });

      // Handle suggestion statuses if any
      if (data.suggestionStatuses && data.suggestionStatuses.length > 0 && !data.isDraft) {
        for (const ss of data.suggestionStatuses) {
           await tx.suggestionStatusLog.create({
             data: {
               suggestionId: ss.suggestionId,
               roundId: data.roundId,
               status: ss.status,
             }
           });
        }
      }

      return rev;
    });

    if (!data.isDraft) {
      await createAuditLog({
        userId: user.sub,
        action: 'review.submitted',
        entityType: 'review',
        entityId: review.id,
        newValues: { teamId: data.teamId, compositeScore, verdict: data.verdict },
      });
    }

    return successResponse(review, 201);
  }, ['mentor', 'admin', 'super_admin']); // Admins can test/submit reviews
}
