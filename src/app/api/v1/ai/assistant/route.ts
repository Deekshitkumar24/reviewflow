export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { events, teams, users, roles, labs, reviews, issues, results } from '@/db/schema';
import { eq, and, isNull, count, isNotNull } from 'drizzle-orm';
import { withAuth, errorResponse } from '@/lib/api-utils';
import { callGemini } from '@/lib/ai';

// POST /api/v1/ai/assistant
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    try {
      const body = await request.json();
      if (!body.message) {
        return errorResponse('VALIDATION_ERROR', 'Message is required', 400);
      }

      // Gather aggregate data to feed to the AI context
      const [
        totalEvents,
        activeEvents,
        totalTeams,
        checkedInTeams,
        totalLabs,
        totalUsers,
        totalReviewsSubmitted,
        issueCounts,
        topTeamsRes,
        judgeProgressRes,
      ] = await Promise.all([
        db.select({ value: count() }).from(events).where(isNull(events.deletedAt)),
        db.select({ value: count() }).from(events).where(and(eq(events.status, 'active'), isNull(events.deletedAt))),
        db.select({ value: count() }).from(teams).where(isNull(teams.deletedAt)),
        db.select({ value: count() }).from(teams).where(and(eq(teams.attendanceStatus, 'checked_in'), isNull(teams.deletedAt))),
        db.select({ value: count() }).from(labs),
        db.select({ value: count() }).from(users).where(isNull(users.deletedAt)),
        db.select({ value: count() }).from(reviews).where(eq(reviews.isDraft, false)),
        db.select({ count: count(), status: issues.status }).from(issues).groupBy(issues.status),
        db.select({ teamName: teams.teamName, finalPosition: results.finalPosition })
          .from(results)
          .innerJoin(teams, eq(results.teamId, teams.id))
          .where(isNotNull(results.finalPosition))
          .orderBy(results.finalPosition)
          .limit(5),
        db.select({ mentorName: users.fullName, reviewCount: count() })
          .from(reviews)
          .innerJoin(users, eq(reviews.mentorId, users.id))
          .where(eq(reviews.isDraft, false))
          .groupBy(users.fullName)
      ]);

      const submissionRate = checkedInTeams[0].value > 0 ? Math.round((totalReviewsSubmitted[0].value / checkedInTeams[0].value) * 100) : 0;
      
      const openIssues = issueCounts.find(i => i.status === 'open')?.count || 0;
      const closedIssues = issueCounts.find(i => i.status !== 'open')?.count || 0;

      const topTeamsList = topTeamsRes.map(t => `${t.finalPosition}: ${t.teamName}`).join(', ') || 'No results published yet';

      const judgeProgressStats = judgeProgressRes.length > 0 
        ? judgeProgressRes.map(j => `${j.mentorName}: ${j.reviewCount} reviews`).join(', ') 
        : 'No reviews submitted by any judge yet';

      const systemPrompt = `You are the ReviewFlow AI Assistant. You answer questions from administrators about the system.
      
# Aggregate Statistics
- Total Events: ${totalEvents[0].value} (Active: ${activeEvents[0].value})
- Total Teams: ${totalTeams[0].value} (Checked In: ${checkedInTeams[0].value})
- Total Labs: ${totalLabs[0].value}
- Total System Users: ${totalUsers[0].value}
- Reviews Submitted: ${totalReviewsSubmitted[0].value}
- Submission/Judging Progress Rate: ~${submissionRate}%
- Issue Alerts: ${openIssues} Critical/Open warnings, ${closedIssues} Resolved
- Top Teams (Precomputed): ${topTeamsList}
- Judge Review Progress (Completed Reviews): ${judgeProgressStats}

# RULES
1. Enforce structured replies: Use bullet points or short sections. Avoid long paragraphs.
2. If the user's question cannot be answered using the data provided above: Reply EXACTLY with "I don't have that data available right now." Never guess.
3. Be helpful, professional, and do NOT expose raw scores or PII.`;

      // Safely process history and cap it directly here if needed
      const rawHistory = Array.isArray(body.history) ? body.history : [];
      // token control: cap to last 6 elements
      const historyTruncated = rawHistory.slice(-6).map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: String(msg.content)
      }));

      const aiResponse = await callGemini({
        systemPrompt,
        userInput: body.message,
        history: historyTruncated,
        routeName: 'ai-assistant',
      });

      if (aiResponse.error) {
        return errorResponse('AI_ERROR', aiResponse.message, 500);
      }

      return NextResponse.json({
        success: true,
        data: {
          reply: aiResponse.result,
        }
      });
    } catch (error: any) {
      console.error('[AI Assistant API Error]:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to generate AI response', 500);
    }
  }, ['super_admin', 'admin']);
}
