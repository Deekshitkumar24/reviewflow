import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimiter";
import { logAIAction } from "@/lib/auditLogger";
import { callGemini } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { teamId, projectTitle, projectDescription, domain, department, githubUrl, pptLink, demoLink, readiness } = body;

    if (!checkRateLimit(`quality_${teamId || 'unknown'}`, "submission-quality")) {
      return NextResponse.json(
        { error: true, message: "Rate limit exceeded. Try again later.", retryable: true },
        { status: 429 }
      );
    }

    // Verify if there's enough meaningful data to evaluate
    const descLength = projectDescription?.trim().length || 0;
    let fieldsCount = 0;
    if (projectTitle) fieldsCount++;
    if (domain) fieldsCount++;
    if (department) fieldsCount++;
    if (descLength > 20) fieldsCount++;
    if (githubUrl) fieldsCount++;
    if (pptLink) fieldsCount++;
    if (demoLink) fieldsCount++;

    if (fieldsCount <= 1) {
        return NextResponse.json({
            error: true,
            isIncomplete: true,
            message: "Not enough data to evaluate. Please add more project details before checking quality."
        }, { status: 400 });
    }

    if (descLength < 20 && !githubUrl && !pptLink && !demoLink) {
        return NextResponse.json({
            error: true,
            isIncomplete: true,
            message: "Incomplete submission. Please add a detailed description or links before checking quality."
        }, { status: 400 });
    }

    const systemPrompt = `You are an elite, enterprise-level Hackathon Judge and Technical Screener. Your objective is to brutally and fairly assess the "readiness" of a team's submission based strictly on the provided data.

You must return EXACTLY the following JSON structure containing your evaluation. Do NOT wrap the JSON in markdown code blocks.
{
  "score": (integer 0 to 100, where 90+ means "perfect submission with detailed description and all links", and <50 means "barebones or missing critical links"),
  "tips": [ array of exactly 3 highly specific, actionable engineering/presentation advice points ],
  "missingFieldsRaw": [ array of exact missing fields ONLY from this list: "Project Description", "GitHub Repository", "Presentation Deck", "Project Domain" ]
}

# CRITICAL RULES FOR TIPS:
- BAD TIP: "Add more details to your project."
- GOOD TIP: "Explain the specific database architecture used for your Decentralized Marketplace in the description."
- BAD TIP: "Improve your GitHub."
- GOOD TIP: "Ensure your GitHub repository contains a clear README with local setup instructions, as it currently appears empty or unlinked."
- Your tips MUST be context-aware, referencing their actual Title and Domain. Do NOT output generic filler.`;

    const userInput = `Team Submission Details:
Title: ${projectTitle || "N/A"}
Domain: ${domain || "N/A"}
Department: ${department || "N/A"}

Description:
${projectDescription || "No description provided."}

Artifacts:
GitHub: ${githubUrl ? "Provided" : "Missing"}
PPT/Presentation: ${pptLink ? "Provided" : "Missing"}
Demo Link: ${demoLink ? "Provided" : "Missing"}

Readiness Flags set by team: ${readiness}/4
`;

    let aiResult = await callGemini({
      systemPrompt,
      userInput,
      routeName: "submission-quality",
      jsonMode: true,
    });

    if (aiResult.error) {
       await logAIAction({ feature: "Submission Quality Score", input: { teamId }, output: aiResult });
       return NextResponse.json(aiResult, { status: 500 });
    }

    // Function to check if tips are generic
    const isGeneric = (tips: string[]) => {
      const g = ['improve your project', 'add more details', 'provide more information', 'be more specific'];
      return tips.some(t => g.some(generic => t.toLowerCase().includes(generic)));
    };

    if (aiResult.tips && isGeneric(aiResult.tips)) {
       // Retry once
       const retryResult = await callGemini({
         systemPrompt,
         userInput,
         routeName: "submission-quality-retry",
         jsonMode: true,
       });
       if (!retryResult.error) {
         aiResult = retryResult;
       }
    }

    // Strict validation
    let { score, tips, missingFieldsRaw } = aiResult;
    
    if (typeof score !== 'number' || isNaN(score)) {
        return NextResponse.json({ error: true, message: "AI returned invalid score format." }, { status: 500 });
    }
    score = Math.max(0, Math.min(100, Math.round(score))); // clamp 0-100
    
    // Server-derived grade
    const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'D';

    if (!Array.isArray(tips) || tips.length === 0 || typeof tips[0] !== 'string') {
        return NextResponse.json({ error: true, message: "AI returned invalid tips format." }, { status: 500 });
    }

    if (isGeneric(tips)) {
        tips = [
           "Add clear explanations of your system architecture.",
           "Highlight the core problem your domain project solves.",
           "Ensure your presentation links explicitly match the repository structure."
        ];
    }

    let missingFields: string[] = [];
    if (Array.isArray(missingFieldsRaw)) {
        const allowed = ["Project Description", "GitHub Repository", "Presentation Deck", "Project Domain"];
        missingFields = missingFieldsRaw.filter(f => allowed.includes(f));
    }

    await logAIAction({
      userId: body?.studentId || "student", // Student context
      eventId: body?.eventId || null,
      feature: "Submission Quality Score",
      input: { teamId, hasDesc: descLength > 0 },
      output: { score, grade, tokensUsed: aiResult.tokensUsed },
    });

    return NextResponse.json({ result: { score, grade, tips, missingFields } });
  } catch (error: any) {
    await logAIAction({ feature: "Submission Quality Score", input: {}, output: { error: true, message: error.message } });
    return NextResponse.json(
      { error: true, message: "Processing failed", retryable: true },
      { status: 500 }
    );
  }
}
