import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimiter";
import { logAIAction } from "@/lib/auditLogger";
import { callGemini } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { eventId, rawFeedback, submissionContext } = body;

    // Validate inputs
    if (!eventId || !rawFeedback || rawFeedback.trim().length === 0) {
      return NextResponse.json(
        { error: true, message: "Missing required fields (eventId or rawFeedback)" },
        { status: 400 }
      );
    }
    
    const trimmedInput = rawFeedback.slice(0, 5000);

    // Rate Limiting
    if (!checkRateLimit(eventId, "review-weaknesses")) {
      return NextResponse.json(
        { error: true, message: "Rate limit exceeded. Try again later.", retryable: true },
        { status: 429 }
      );
    }

    const systemPrompt = "You are an expert hackathon judge. Identify 3-5 areas for improvement. Be constructive. Plain text list, one per line, starting with a dash.";
    const contextStr = submissionContext ? `Context about submission:\n${submissionContext}\n\n` : '';
    const userInput = `${contextStr}Draft Notes:\n${trimmedInput}`;

    const aiResult = await callGemini({
      systemPrompt,
      userInput,
      routeName: "review-weaknesses",
    });

    if (aiResult.error) {
       await logAIAction({ feature: "AI Review Assistant - Weaknesses", input: { eventId }, output: aiResult });
       return NextResponse.json(aiResult, { status: 500 });
    }

    await logAIAction({
      userId: body?.userId || "system",
      eventId,
      feature: "AI Review Assistant - Weaknesses",
      input: { rawFeedback: trimmedInput.substring(0, 50) + "..." },
      output: { tokensUsed: aiResult.tokensUsed },
    });

    return NextResponse.json(aiResult);
  } catch (error: any) {
    await logAIAction({ feature: "AI Review Assistant - Weaknesses", input: {}, output: { error: true, message: error.message } });
    return NextResponse.json(
      { error: true, message: "Processing failed", retryable: true },
      { status: 500 }
    );
  }
}
