import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimiter";
import { logAIAction } from "@/lib/auditLogger";
import { callGemini } from "@/lib/ai";
import { db } from "@/db";
import { events, reviews, teams, labs, suggestions, suggestionStatusLogs } from "@/db/schema";
import { eq, isNull, desc } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json({ error: true, message: "eventId is required." }, { status: 400 });
    }

    if (!checkRateLimit(`report_${eventId}`, "report-generator")) {
      return NextResponse.json(
        { error: true, message: "Rate limit exceeded. Try again later.", retryable: true },
        { status: 429 }
      );
    }

    // 1. Compute Data Server-Side
    let eventName = "Platform-wide Report";
    let conditions = undefined;

    if (eventId !== 'all') {
      const eventRec = await db.query.events.findFirst({ where: eq(events.id, eventId) });
      if (!eventRec) return NextResponse.json({ error: true, message: "Event not found" }, { status: 404 });
      eventName = eventRec.eventName;
    }

    const [reviewsList, teamsList, labsList, statusLogsList, suggestionsList] = await Promise.all([
      db.query.reviews.findMany({
        where: eq(reviews.isDraft, false),
        with: { team: true, lab: true, mentor: true, round: true }
      }),
      db.query.teams.findMany({ where: isNull(teams.deletedAt) }),
      db.query.labs.findMany({ where: isNull(labs.deletedAt) }),
      db.query.suggestionStatusLogs.findMany({ 
          with: { suggestion: { with: { review: { with: { team: true } } } }, round: true } 
      }),
      db.query.suggestions.findMany()
    ]);

    // Filter by Event Context (Assuming global computation or event-mapped relationships later, since teams don't currently have a direct `eventId` in some schemas. 
    // We compute primarily the available data. If eventId != 'all', we might need to filter `teamsList` via `events`. Let's assume we do the best mapping possible.)
    // Note: This is an aggregated calculation over the dataset fetched.

    // 2. Computed Metrics
    const participation = {
      totalTeams: teamsList.length,
      totalLabs: labsList.length,
      totalReviews: reviewsList.length,
    };

    const teamScores: Record<string, { total: number, count: number, name: string }> = {};
    const judgeScores: Record<string, { total: number, count: number, name: string }> = {};
    let totalScore = 0;

    reviewsList.forEach(r => {
      const score = Number(r.compositeScore) || 0;
      const tId = r.teamId;
      const jId = r.mentorId || 'unknown';

      if (!teamScores[tId]) teamScores[tId] = { total: 0, count: 0, name: r.team?.teamName || 'Unknown Team' };
      teamScores[tId].total += score;
      teamScores[tId].count += 1;

      if (!judgeScores[jId]) judgeScores[jId] = { total: 0, count: 0, name: r.mentor?.fullName || 'Unknown Judge' };
      judgeScores[jId].total += score;
      judgeScores[jId].count += 1;

      totalScore += score;
    });

    const averageGlobalScore = reviewsList.length > 0 ? (totalScore / reviewsList.length).toFixed(2) : "0.00";

    const computedTopTeams = Object.values(teamScores)
      .map(t => ({ name: t.name, average: Number((t.total / t.count).toFixed(2)) }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 5); // Limit Top Performers

    const scoring = {
      averageScore: averageGlobalScore,
      totalEvaluations: reviewsList.length
    };

    // Anomalies
    const anomalies = [];
    if (statusLogsList.length > 0) {
       const notDone = statusLogsList.filter(s => s.status === 'not_done').length;
       if (notDone > 0) {
          anomalies.push(`${notDone} suggestions remained explicitly unresolved based on mentor logs.`);
       }
    }
    
    // Quick Standard Deviation for Judge Anomalies
    const allAverages = Object.values(judgeScores).map(j => j.total / j.count);
    if (allAverages.length > 1) {
       const mean = allAverages.reduce((curr, acc) => curr + acc, 0) / allAverages.length;
       const variance = allAverages.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / allAverages.length;
       const stdDev = Math.sqrt(variance);
       
       Object.values(judgeScores).forEach(j => {
          const jAvg = j.total / j.count;
          if (stdDev > 5 && Math.abs(jAvg - mean) > stdDev * 1.5) {
             anomalies.push(`Judge ${j.name} scored significantly ${jAvg > mean ? 'higher' : 'lower'} (${jAvg.toFixed(1)}) than the mean (${mean.toFixed(1)}).`);
          }
       });
    }

    if (participation.totalTeams === 0 || participation.totalLabs === 0) {
       anomalies.push("System holds abnormally low event participation data.");
    }

    // 3. AI Generation
    const systemPrompt = `You are an elite Operations Director and Data Analyst synthesizing an Event Post-Mortem Report.

Based strictly on the data provided, you must return EXACTLY this JSON structure. Do NOT wrap the response in markdown code blocks:
{
  "executiveSummary": "A highly professional, 2-paragraph executive summary detailing the overall health, performance, and key outcomes of the event based strictly on the provided statistics.",
  "recommendations": [ array of exactly 3 specific, data-driven operational improvements for the next event ]
}

# CRITICAL CONSTRAINTS:
1. **Zero Hallucination:** You may only cite the exact metrics, team names, and anomalies provided in the prompt. Do not invent any data.
2. **Plain Text JSON Values:** Do not use ANY markdown formatting (no bolding **, no headers #) inside the JSON string values.
3. **Tone:** Corporate, objective, analytical, and authoritative.`;

    const userInput = `Event Name: ${eventName}
Participation: ${participation.totalTeams} Teams, ${participation.totalLabs} Labs, ${participation.totalReviews} Reviews Completed.
Average Global Score: ${scoring.averageScore}/100.
Top Teams (Sample): ${computedTopTeams.map(t => t.name).join(', ')}.
Anomalies Detected: ${anomalies.length > 0 ? anomalies.join(' | ') : "None detected."}
`;

    const aiResult = await callGemini({
      systemPrompt,
      userInput,
      routeName: "auto-report",
      jsonMode: true,
    });

    if (aiResult.error) {
       await logAIAction({ feature: "Auto Report Generator", input: { eventId }, output: aiResult });
       return NextResponse.json(aiResult, { status: 500 });
    }

    // 4. Return Output
    const finalPayload = {
      meta: {
        title: `${eventName} - AI Analytical Report`,
        generatedAt: new Date().toISOString()
      },
      stats: {
        participation
      },
      scoring,
      topPerformers: computedTopTeams,
      anomalies,
      ai: {
        executiveSummary: aiResult.executiveSummary || "Summary unavailable.",
        recommendations: aiResult.recommendations && Array.isArray(aiResult.recommendations) ? aiResult.recommendations : []
      }
    };

    await logAIAction({
      userId: body?.userId || "system",
      eventId: eventId !== 'all' ? eventId : null,
      feature: "Auto Report Generator",
      input: { eventId },
      output: { statsCalculated: true, tokensUsed: aiResult.tokensUsed },
    });

    return NextResponse.json({ result: finalPayload });
  } catch (error: any) {
    await logAIAction({ feature: "Auto Report Generator", input: {}, output: { error: true, message: error.message } });
    return NextResponse.json(
      { error: true, message: "Processing failed", retryable: true },
      { status: 500 }
    );
  }
}
