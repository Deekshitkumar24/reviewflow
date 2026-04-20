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

    const systemPrompt = `You are an expert event architect and judge. Return a JSON object with a single key "criteria" containing an array of scoring criteria objects. 
Each object must have:
- "key" (string, camelCase identifier)
- "label" (string, human readable name)
- "guidance" (string, short description of what to look for)
- "weight" (number, representing the percentage weight)
The sum of all weights MUST be exactly 1.0 (or 100 on a 1-100 scale, but please use integers that sum to 100 representing percentage).
Make the criteria tailored to the provided theme, usually 4 to 6 criteria total.
Example JSON:
{
  "criteria": [
    { "key": "technical", "label": "Technical Implementation", "guidance": "Quality of code and arch", "weight": 40 },
    { "key": "innovation", "label": "Innovation", "guidance": "How novel is it?", "weight": 30 },
    { "key": "design", "label": "Design & UX", "guidance": "User interface quality", "weight": 30 }
  ]
}`;
    
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
