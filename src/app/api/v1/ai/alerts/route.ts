import { NextResponse } from "next/server";
import { Alert } from "@/types/ai";
import { logAIAction } from "@/lib/auditLogger";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const eventId = body?.eventId || "unknown";

    const alerts: Alert[] = [];

    // Real implementation would execute actual DB queries here using drizzle:
    // e.g. const inactiveJudges = await db.select().from(reviews).where(...)

    // Simulated Statistical Rules for Demo/MVP (safely additive)
    const now = new Date();
    
    // Condition 1: SUBMISSION_MISSING
    alerts.push({
      id: `alert-sub-${Date.now()}`,
      type: "SUBMISSION_MISSING",
      severity: "warning",
      message: "Team 'Neon Knights' registered but has no submission with under 45 mins left.",
      affectedEntity: "Team Neon Knights",
      timestamp: now.toISOString(),
      resolved: false,
    });

    // Condition 2: JUDGE_INACTIVE
    alerts.push({
      id: `alert-judge-${Date.now()}`,
      type: "JUDGE_INACTIVE",
      severity: "critical",
      message: "Judge Sarah Connor has not scored anything in 2+ hours during the judging window.",
      affectedEntity: "Sarah Connor (Judge)",
      timestamp: now.toISOString(),
      resolved: false,
    });

    // Condition 3: SCORE_INCONSISTENCY
    alerts.push({
      id: `alert-score-${Date.now()}`,
      type: "SCORE_INCONSISTENCY",
      severity: "warning",
      message: "Team 'Syntax Errors' scored by 2+ judges with more than 4 point gap.",
      affectedEntity: "Team Syntax Errors",
      timestamp: now.toISOString(),
      resolved: false,
    });

    // Condition 4: CAPACITY_ISSUE
    alerts.push({
      id: `alert-cap-${Date.now()}`,
      type: "CAPACITY_ISSUE",
      severity: "info",
      message: "Lab 4B has more active teams than its listed capacity (12/10).",
      affectedEntity: "Lab 4B",
      timestamp: now.toISOString(),
      resolved: false,
    });

    await logAIAction({
      userId: body?.userId || "system",
      eventId,
      feature: "Real-Time Anomaly Alerts",
      input: { eventId },
      output: { alertsCount: alerts.length },
    });

    return NextResponse.json({ alerts });
  } catch (error: any) {
    await logAIAction({
      feature: "Real-Time Anomaly Alerts",
      input: {}, output: { error: true, message: error.message }
    });
    
    return NextResponse.json(
      { error: true, message: "Failed to generate alerts", retryable: true },
      { status: 500 }
    );
  }
}
