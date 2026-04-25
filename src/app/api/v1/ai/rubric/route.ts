import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimiter";
import { logAIAction } from "@/lib/auditLogger";
import { callGemini } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { eventId, theme } = body;

    // Use eventId for rate limiting if provided, otherwise a global fallback
    const rateLimitKey = eventId || "global_builder";

    if (!checkRateLimit(rateLimitKey, "rubric-builder")) {
      return NextResponse.json(
        { error: true, message: "Rate limit exceeded. Try again later.", retryable: true },
        { status: 429 }
      );
    }

    const systemPrompt = `You are a Senior Event Architect and Lead Judge. Your task is to design an elite, production-grade scoring rubric for evaluating projects based strictly on the provided theme. 

Return EXACTLY a JSON object with a single key "criteria" containing an array of scoring criteria objects. Do not wrap in markdown boxes.
Each object must strictly conform to:
- "key" (string, camelCase identifier)
- "label" (string, human readable name)
- "guidance" (string, comprehensive, mutually exclusive description of what to evaluate. E.g., 'Assess the architectural scalability and security')
- "weight" (integer percentage)

# CRITICAL CONSTRAINTS:
1. The sum of all weights MUST be exactly 100.
2. Ensure there are exactly 4 to 6 criteria.
3. Criteria must be mutually exclusive. (Do not overlap UI/UX design with Frontend Technical Implementation).
4. Do NOT output generic keys like "criteria1". Use meaningful keys like "technicalComplexity".`;
    
    const userInput = `Event Theme/Focus: ${theme || "General hackathon project"}\nGenerate the rubric JSON.`;

    const aiResult = await callGemini({
      systemPrompt,
      userInput,
      routeName: "rubric-builder",
      jsonMode: true,
    });

    if (aiResult.error) {
       await logAIAction({ feature: "AI Rubric Builder", input: { theme }, output: aiResult });
       return NextResponse.json(aiResult, { status: 500 });
    }

    // Validate structure and weights strictly
    const criteria = aiResult.criteria;
    if (!Array.isArray(criteria) || criteria.length === 0) {
      return NextResponse.json({ error: true, message: "Invalid rubric model: Ensure criteria is a populated array." }, { status: 500 });
    }
    
    for (const c of criteria) {
      if (!c.key || typeof c.label !== 'string' || typeof c.guidance !== 'string' || typeof c.weight !== 'number' || isNaN(c.weight)) {
        return NextResponse.json({ error: true, message: "Invalid rubric format: AI failed to structure valid fields." }, { status: 500 });
      }
    }
    
    await logAIAction({
      userId: body?.userId || "system",
      eventId: eventId || null,
      feature: "AI Rubric Builder",
      input: { theme },
      output: { criteriaCount: criteria.length, tokensUsed: aiResult.tokensUsed },
    });

    return NextResponse.json({ result: criteria });
  } catch (error: any) {
    await logAIAction({ feature: "AI Rubric Builder", input: {}, output: { error: true, message: error.message } });
    return NextResponse.json(
      { error: true, message: "Processing failed", retryable: true },
      { status: 500 }
    );
  }
}
