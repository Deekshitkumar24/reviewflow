import { NextResponse } from "next/server";
import { BiasAnalysisResult } from "@/types/ai";
import { logAIAction } from "@/lib/auditLogger";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const eventId = body?.eventId;

    if (!eventId) {
      return NextResponse.json({ error: true, message: "Missing eventId" }, { status: 400 });
    }

    // In a real application, you would run an aggregation query using Drizzle:
    // e.g. select avg(score), stddev(score) from review_scores group by judgeId
    
    // We mock robust statistical calculations on realistic data for Phase 1.
    const mockJudgesData = [
      { id: "j1", name: "Sarah Connor", scores: [80, 82, 79, 81, 85, 78, 80] },
      { id: "j2", name: "John Smith", scores: [50, 95, 60, 85, 45, 90, 75] },
      { id: "j3", name: "Alice Lee", scores: [98, 97, 99, 96, 98, 97, 99] }, // Too high + low stdDev
      { id: "j4", name: "Bob Martin", scores: [40, 42, 38, 41, 45, 39, 40] },   // Too low
      { id: "j5", name: "Dr. Lanning", scores: [70, 70, 70, 70, 70, 70, 70] },  // zero stdDev
    ];

    let allScores: number[] = [];
    mockJudgesData.forEach(j => allScores.push(...j.scores));
    
    const eventMean = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
    
    const maxZScore = 1.5;
    const minStdDev = 2.0;

    const judges = mockJudgesData.map(j => {
      const mean = j.scores.reduce((a, b) => a + b, 0) / j.scores.length;
      const variance = j.scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / j.scores.length;
      const stdDev = Math.sqrt(variance);
      
      // Calculate global standard deviation for the entire event to establish baseline
      // For simplicity, we just use the deviation of the judge's mean from the event mean mapping roughly to a z-score relative to the theoretical score variance.
      const stdDevEvent = 15; // assumed event global stdDev for z-score calculation
      const zScore = (mean - eventMean) / stdDevEvent;
      
      let flag: "none" | "too-high" | "too-low" | "low-discrimination" = "none";
      let flagReason = "";

      if (zScore > maxZScore) {
        flag = "too-high";
        flagReason = `Scores average ${mean.toFixed(1)} vs event mean ${eventMean.toFixed(1)} (Z-score: ${zScore.toFixed(2)})`;
      } else if (zScore < -maxZScore) {
        flag = "too-low";
        flagReason = `Scores average ${mean.toFixed(1)} vs event mean ${eventMean.toFixed(1)} (Z-score: ${zScore.toFixed(2)})`;
      } else if (stdDev < minStdDev) {
        flag = "low-discrimination";
        flagReason = `Too little score variance (StdDev: ${stdDev.toFixed(2)}). All scores are identical or tightly grouped.`;
      }

      return {
        judgeId: j.id,
        judgeName: j.name,
        mean: Number(mean.toFixed(2)),
        stdDev: Number(stdDev.toFixed(2)),
        zScore: Number(zScore.toFixed(2)),
        submissionsScored: j.scores.length,
        flag,
        ...(flagReason ? { flagReason } : {})
      };
    });

    const result: BiasAnalysisResult = {
      eventMean: Number(eventMean.toFixed(2)),
      judges
    };

    await logAIAction({
      userId: body?.userId || "system",
      eventId,
      feature: "Judge Bias Detector",
      input: { eventId },
      output: { flaggedCount: judges.filter(j => j.flag !== "none").length },
    });

    return NextResponse.json(result);
  } catch (error: any) {
    await logAIAction({
      feature: "Judge Bias Detector",
      input: {}, output: { error: true, message: error.message }
    });
    
    return NextResponse.json(
      { error: true, message: "Failed to run bias detection", retryable: true },
      { status: 500 }
    );
  }
}
