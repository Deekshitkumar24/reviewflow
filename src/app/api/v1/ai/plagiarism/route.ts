import { NextResponse } from "next/server";
import { PlagiarismResult } from "@/types/ai";
import { logAIAction } from "@/lib/auditLogger";
import { callGemini } from "@/lib/ai";
import natural from "natural";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const eventId = body?.eventId;

    if (!eventId) {
      return NextResponse.json({ error: true, message: "Missing eventId" }, { status: 400 });
    }

    // Query Real DB
    const { db } = await import("@/db");
    const { teams } = await import("@/db/schema");
    const { eq, and, isNotNull, isNull } = await import("drizzle-orm");

    const realSubmissions = await db.select({
      id: teams.id,
      name: teams.teamName,
      text: teams.projectDescription
    }).from(teams).where(
      and(
        eq(teams.eventId, eventId),
        isNotNull(teams.projectDescription),
        isNull(teams.deletedAt)
      )
    );

    if (realSubmissions.length < 2) {
      return NextResponse.json({
        flaggedPairs: [],
        checkedAt: new Date().toISOString()
      } as PlagiarismResult);
    }

    const TfIdf = natural.TfIdf;
    const tfidf = new TfIdf();

    realSubmissions.forEach(sub => tfidf.addDocument(sub.text || ""));

    const flaggedPairs: PlagiarismResult["flaggedPairs"] = [];
    
    // Quick TF-IDF pass to find candidates
    for (let i = 0; i < realSubmissions.length; i++) {
        for (let j = i + 1; j < realSubmissions.length; j++) {
            let dotProduct = 0, normI = 0, normJ = 0;
            const docI = tfidf.listTerms(i), docJ = tfidf.listTerms(j);
            const termsMapI = new Map<string, number>(), termsMapJ = new Map<string, number>();
            
            docI.forEach(t => termsMapI.set(t.term, t.tfidf));
            docJ.forEach(t => termsMapJ.set(t.term, t.tfidf));

            const allTerms = new Set([...Array.from(termsMapI.keys()), ...Array.from(termsMapJ.keys())]);
            allTerms.forEach(term => {
                const wi = termsMapI.get(term) || 0, wj = termsMapJ.get(term) || 0;
                dotProduct += wi * wj; normI += wi * wi; normJ += wj * wj;
            });

            const similarityScore = (Math.sqrt(normI) && Math.sqrt(normJ)) ? dotProduct / (Math.sqrt(normI) * Math.sqrt(normJ)) : 0;
            const percentage = Math.round(similarityScore * 100);
            
            if (percentage > 50) {
                // If highly similar, use AI to extract the structural insight
                const systemPrompt = `You are an AI similarity analyst. Given two project descriptions that have been statistically flagged for plagiarism (${percentage}% overlap), extract exactly 1-3 crisp bullet points representing the conceptual overlaps or identical phrases. Return ONLY a JSON array of strings. Do not wrap in markdown.`;
                
                const userInput = `Description A: ${realSubmissions[i].text}\n\nDescription B: ${realSubmissions[j].text}`;
                
                let overlappingSections = ["High statistical similarity detected based on lexical overlap."];
                
                try {
                  const aiOverlapResult = await callGemini({ systemPrompt, userInput, routeName: "plagiarism-inspector", jsonMode: true });
                  if (!aiOverlapResult.error && Array.isArray(aiOverlapResult)) {
                     overlappingSections = aiOverlapResult.filter((a: any) => typeof a === 'string').slice(0, 3);
                  }
                } catch(e) {
                  console.error("Gemini overlap analysis failed, falling back to basic terms.");
                }

                flaggedPairs.push({
                    team1: { id: realSubmissions[i].id, name: realSubmissions[i].name },
                    team2: { id: realSubmissions[j].id, name: realSubmissions[j].name },
                    similarityScore: percentage,
                    overlappingSections
                });
            }
        }
    }

    const result: PlagiarismResult = {
        flaggedPairs,
        checkedAt: new Date().toISOString()
    };

    await logAIAction({
      userId: body?.userId || "system",
      eventId,
      feature: "Plagiarism Detector",
      input: { eventId, checkedCount: realSubmissions.length },
      output: { totalPairsFlagged: flaggedPairs.length },
    });

    return NextResponse.json(result);
  } catch (error: any) {
    await logAIAction({
      feature: "Plagiarism Detector",
      input: {}, output: { error: true, message: error.message }
    });
    
    return NextResponse.json(
      { error: true, message: "Failed to run similarity check", retryable: true },
      { status: 500 }
    );
  }
}
