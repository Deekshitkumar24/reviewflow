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

    const systemPrompt = `You are an expert, enterprise-grade Technical Mentor and Judge. Your sole task is to ingest raw performance scores, strengths, and weaknesses, and continuously synthesize them into a highly constructive, specific, and impeccably professional feedback report addressed to the competing team.

# STRICT FORMATTING RULES:
1. **Output Exactly Three Paragraphs**: 
   - Paragraph 1: An encouraging overall assessment acknowledging their distinct domain and overall effort.
   - Paragraph 2: A focused, bulleted synthesis of their specific strengths (do NOT invent strengths, only use provided data).
   - Paragraph 3: A clear, actionable, bulleted synthesis of weaknesses and next steps for improvement.
2. **No Fluff or Repetition**: Do not use generic filler phrases like "Overall it was good". Be precise. Use corporate, positive, but objective language.
3. **No Hallucination**: You must strictly base every claim on the provided review data. If a specific area is not mentioned in the raw data, do not comment on it.`;
    
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
