import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimiter";
import { logAIAction } from "@/lib/auditLogger";
import { callGemini } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { eventId, teamId, reviewsData } = body;

    if (!eventId || !teamId || !reviewsData) {
      return NextResponse.json(
        { error: true, message: "Missing required fields (eventId, teamId, or reviewsData)" },
        { status: 400 }
      );
    }

    if (!checkRateLimit(eventId, "feedback-generator")) {
      return NextResponse.json(
        { error: true, message: "Rate limit exceeded. Try again later.", retryable: true },
        { status: 429 }
      );
    }

    const systemPrompt = "You are an expert technical mentor. Your job is to take the provided raw scores, strengths, and weaknesses from various judges and synthesise them into a cohesive, highly constructive, and encouraging feedback report addressed directly to the team. Keep it professional, actionable, and 3-4 paragraphs long. Use markdown formatting for readability (bolding key areas, using bullet points for key suggestions).";
    
    // We trim reviewsData to ensure we don't blow up token limits
    const userInput = `Here is the raw review data for the team:\n${JSON.stringify(reviewsData).slice(0, 10000)}\n\nPlease generate the comprehensive feedback report.`;

    const aiResult = await callGemini({
      systemPrompt,
      userInput,
      routeName: "feedback-generator",
    });

    if (aiResult.error) {
       await logAIAction({ feature: "AI Feedback Generator", input: { eventId, teamId }, output: aiResult });
       return NextResponse.json(aiResult, { status: 500 });
    }

    await logAIAction({
      userId: body?.userId || "system",
      eventId,
      feature: "AI Feedback Generator",
      input: { teamId, datasetSize: JSON.stringify(reviewsData).length },
      output: { tokensUsed: aiResult.tokensUsed },
    });

    return NextResponse.json(aiResult);
  } catch (error: any) {
    await logAIAction({ feature: "AI Feedback Generator", input: {}, output: { error: true, message: error.message } });
    return NextResponse.json(
      { error: true, message: "Processing failed", retryable: true },
      { status: 500 }
    );
  }
}
