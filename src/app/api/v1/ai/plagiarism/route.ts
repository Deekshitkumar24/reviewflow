import { NextResponse } from "next/server";
import { PlagiarismResult } from "@/types/ai";
import { logAIAction } from "@/lib/auditLogger";
import natural from "natural";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const eventId = body?.eventId;

    if (!eventId) {
      return NextResponse.json({ error: true, message: "Missing eventId" }, { status: 400 });
    }

    // Real application would query DB for all submission texts
    // e.g. const submissions = await db.select().from(results).where({ eventId });
    
    // Mock simulation data
    const mockSubmissions = [
      { id: "team1", name: "Neon Knights", text: "Our application is a decentralized AI marketplace leveraging smart contracts on Ethereum." },
      { id: "team2", name: "Cyber Punks", text: "We built an AI marketplace using Ethereum smart contracts for decentralized compute." },
      { id: "team3", name: "Algo Rhythms", text: "A fresh new approach to sorting algorithms with visualizers and step-by-step guides." },
      { id: "team4", name: "Data Miners", text: "Predictive modeling and big data analysis for upcoming tech trends." }
    ];

    const TfIdf = natural.TfIdf;
    const tfidf = new TfIdf();

    mockSubmissions.forEach(sub => tfidf.addDocument(sub.text));

    const flaggedPairs: PlagiarismResult["flaggedPairs"] = [];
    
    for (let i = 0; i < mockSubmissions.length; i++) {
        for (let j = i + 1; j < mockSubmissions.length; j++) {
            // Calculate cosine similarity approximation with tf-idf
            let dotProduct = 0;
            let normI = 0;
            let normJ = 0;

            const docI = tfidf.listTerms(i);
            const docJ = tfidf.listTerms(j);
            
            const termsMapI = new Map<string, number>();
            const termsMapJ = new Map<string, number>();
            
            docI.forEach(t => termsMapI.set(t.term, t.tfidf));
            docJ.forEach(t => termsMapJ.set(t.term, t.tfidf));

            const allTerms = new Set([...Array.from(termsMapI.keys()), ...Array.from(termsMapJ.keys())]);

            allTerms.forEach(term => {
                const wi = termsMapI.get(term) || 0;
                const wj = termsMapJ.get(term) || 0;
                dotProduct += wi * wj;
                normI += wi * wi;
                normJ += wj * wj;
            });

            const similarityScore = (Math.sqrt(normI) && Math.sqrt(normJ))
                ? dotProduct / (Math.sqrt(normI) * Math.sqrt(normJ))
                : 0;
            
            const percentage = Math.round(similarityScore * 100);
            
            if (percentage > 70) {
                // Determine overlapping sections (shared terms for explanation)
                const overlapping = docI.filter(t => termsMapJ.has(t.term)).map(t => t.term);
                
                flaggedPairs.push({
                    team1: { id: mockSubmissions[i].id, name: mockSubmissions[i].name },
                    team2: { id: mockSubmissions[j].id, name: mockSubmissions[j].name },
                    similarityScore: percentage,
                    overlappingSections: overlapping.length > 5 ? overlapping.slice(0, 5) : overlapping,
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
      input: { eventId },
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
