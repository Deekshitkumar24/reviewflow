import { NextResponse } from "next/server";
import { Alert } from "@/types/ai";
import { logAIAction } from "@/lib/auditLogger";

let cachedAlerts: { eventId: string; data: Alert[]; timestamp: number } | null = null;
const CACHE_DURATION_MS = 60000; // 60 seconds

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const eventId = body?.eventId || "unknown";

    // Rate Limiting / Caching trick for polling dashboard
    if (cachedAlerts && cachedAlerts.eventId === eventId && Date.now() - cachedAlerts.timestamp < CACHE_DURATION_MS) {
       return NextResponse.json({ alerts: cachedAlerts.data });
    }

    const { db } = await import("@/db");
    const { issues, teams } = await import("@/db/schema");
    const { eq, and, isNull } = await import("drizzle-orm");
    const { callGemini } = await import("@/lib/ai");

    // Fetch brief system state to feed AI
    let rawAnomalies = "";
    if (eventId !== "unknown") {
       const staleIssuesCount = await db.$count(issues, and(eq(issues.eventId, eventId), eq(issues.status, "open")));
       const noDescTeamsCount = await db.$count(teams, and(eq(teams.eventId, eventId), isNull(teams.projectDescription)));
       rawAnomalies = `Currently there are ${staleIssuesCount} open issues unresolved. There are ${noDescTeamsCount} teams with completely empty project descriptions.`;
    }

    let alerts: Alert[] = [];
    
    // Wire Gemini to dynamically evaluate real system states
    const systemPrompt = `You are a strict System Integrity Monitor. Analyze the provided current system state variables and generate an array of "alerts" identifying any problems.
Return EXACTLY a JSON array of alert objects with the following schema perfectly adhered to:
[{
  "id": "unique-string",
  "type": "SYSTEM_ANOMALY",
  "severity": "info" | "warning" | "critical",
  "message": "Human readable technical alert.",
  "affectedEntity": "Name of component or metric",
  "timestamp": "ISO Date string",
  "resolved": false
}]

# RULES:
- Do NOT hallucinate names.
- If the system state is empty or normal, return an empty array [].
- Only trigger a warning if an anomaly count is > 0.`;

    const userInput = `System State:\n${rawAnomalies || "All standard metrics are green."}`;

    try {
      const aiResult = await callGemini({ systemPrompt, userInput, routeName: "anomaly-alerts", jsonMode: true });
      if (!aiResult.error && Array.isArray(aiResult)) {
        alerts = aiResult;
      } else if (aiResult.alerts && Array.isArray(aiResult.alerts)) {
        alerts = aiResult.alerts;
      }
    } catch(e) {
      console.error("AI Alert Generation parsed failed.");
    }

    cachedAlerts = { eventId, data: alerts, timestamp: Date.now() };

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
