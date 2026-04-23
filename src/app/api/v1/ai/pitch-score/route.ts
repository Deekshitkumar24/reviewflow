import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimiter";
import { logAIAction } from "@/lib/auditLogger";
import { callGemini } from "@/lib/ai";
import { z } from "zod";

export const runtime = 'nodejs';

const pitchScoreSchema = z.object({
  title: z.string().min(1, "Project title is required"),
  problemStatement: z.string().min(1, "Problem statement is required"),
  solution: z.string().min(1, "Solution description is required"),
  techStack: z.object({
    frontend: z.string().optional().default(""),
    backend: z.string().optional().default(""),
    database: z.string().optional().default(""),
    cloud: z.string().optional().default(""),
  }),
  features: z.array(z.string()).min(1, "At least one feature is required"),
  explanation: z.string().optional().default(""),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // Validate input
    const parsed = pitchScoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, message: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Rate limit
    const rateLimitKey = body?.teamId || "global_pitch";
    if (!checkRateLimit(rateLimitKey, "pitch-score")) {
      return NextResponse.json(
        { error: true, message: "Rate limit exceeded. Try again later.", retryable: true },
        { status: 429 }
      );
    }

    const techStackStr = [
      data.techStack.frontend && `Frontend: ${data.techStack.frontend}`,
      data.techStack.backend && `Backend: ${data.techStack.backend}`,
      data.techStack.database && `Database: ${data.techStack.database}`,
      data.techStack.cloud && `Cloud/Infra: ${data.techStack.cloud}`,
    ].filter(Boolean).join("\n");

    const featuresStr = data.features.map((f, i) => `${i + 1}. ${f}`).join("\n");

    const systemPrompt = `You are a senior technical reviewer evaluating a student project pitch. You must be realistic, fair, and specific. Do NOT inflate scores. Provide genuinely useful, actionable feedback.

Score each category from 0 to 10 using these guidelines:
- 0-3: Poor/Missing — fundamental gaps
- 4-5: Below average — significant issues
- 6-7: Acceptable — meets basic expectations with room for improvement
- 8-9: Strong — well-executed with minor gaps
- 10: Exceptional — outstanding, production-grade quality

If you cannot assess a category due to missing information, set the score to "not_assessed" and explain why.

You MUST return EXACTLY this JSON structure with no additional keys or wrapping:
{
  "scores": {
    "technicalImplementation": { "score": <number or "not_assessed">, "reason": "<specific explanation>" },
    "innovation": { "score": <number or "not_assessed">, "reason": "<specific explanation>" },
    "problemUnderstanding": { "score": <number or "not_assessed">, "reason": "<specific explanation>" },
    "feasibility": { "score": <number or "not_assessed">, "reason": "<specific explanation>" },
    "uiUx": { "score": <number or "not_assessed">, "reason": "<specific explanation>" },
    "presentation": { "score": <number or "not_assessed">, "reason": "<specific explanation>" }
  },
  "questions": ["<question1>", "<question2>", "<question3>"],
  "summary": {
    "overview": "<2-3 sentence summary>",
    "strengths": ["<strength1>", "<strength2>"],
    "improvements": ["<improvement1>", "<improvement2>"],
    "nextSteps": ["<step1>", "<step2>"]
  }
}

RULES:
1. Scores must reflect actual quality. A simple CRUD app should NOT score 8+ on innovation.
2. Questions must be specific to the actual tech stack provided (e.g., "How does your React state management handle concurrent WebSocket updates?" not "Tell me about your project").
3. If no UI/UX information is provided, set uiUx score to "not_assessed".
4. Strengths and improvements must be concrete and actionable, not generic praise.
5. Return ONLY valid JSON. No markdown, no code blocks, no explanation outside the JSON.`;

    const userInput = `PROJECT PITCH:

Title: ${data.title}

Problem Statement:
${data.problemStatement}

Proposed Solution:
${data.solution}

Tech Stack:
${techStackStr || "Not specified"}

Features:
${featuresStr}

Additional Explanation:
${data.explanation || "None provided"}

Evaluate this pitch now.`;

    const aiResult = await callGemini({
      systemPrompt,
      userInput,
      routeName: "pitch-score",
      jsonMode: true,
    });

    if (aiResult.error) {
      await logAIAction({ feature: "AI Pitch Score", input: { title: data.title }, output: aiResult });
      return NextResponse.json(aiResult, { status: 500 });
    }

    // Validate response structure
    if (!aiResult.scores || !aiResult.questions || !aiResult.summary) {
      await logAIAction({ feature: "AI Pitch Score", input: { title: data.title }, output: { error: true, message: "Invalid AI response structure" } });
      return NextResponse.json(
        { error: true, message: "AI returned an invalid response structure. Please try again.", retryable: true },
        { status: 500 }
      );
    }

    // Validate each score category exists
    const requiredScoreKeys = ["technicalImplementation", "innovation", "problemUnderstanding", "feasibility", "uiUx", "presentation"];
    for (const key of requiredScoreKeys) {
      if (!aiResult.scores[key] || (aiResult.scores[key].score === undefined && aiResult.scores[key].score !== "not_assessed")) {
        aiResult.scores[key] = { score: "not_assessed", reason: "Could not be evaluated from the provided information." };
      }
    }

    // Ensure questions is an array
    if (!Array.isArray(aiResult.questions)) {
      aiResult.questions = [];
    }

    // Ensure summary fields exist
    if (!aiResult.summary.overview) aiResult.summary.overview = "";
    if (!Array.isArray(aiResult.summary.strengths)) aiResult.summary.strengths = [];
    if (!Array.isArray(aiResult.summary.improvements)) aiResult.summary.improvements = [];
    if (!Array.isArray(aiResult.summary.nextSteps)) aiResult.summary.nextSteps = [];

    await logAIAction({
      feature: "AI Pitch Score",
      input: { title: data.title, techStack: data.techStack },
      output: { scores: Object.keys(aiResult.scores), tokensUsed: aiResult.tokensUsed },
    });

    // Remove tokensUsed from client response
    const { tokensUsed, ...clientResult } = aiResult;

    return NextResponse.json({ result: clientResult });
  } catch (error: any) {
    await logAIAction({ feature: "AI Pitch Score", input: {}, output: { error: true, message: error.message } });
    return NextResponse.json(
      { error: true, message: "Processing failed", retryable: true },
      { status: 500 }
    );
  }
}
