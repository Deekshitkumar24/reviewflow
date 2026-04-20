// src/lib/auditLogger.ts

export async function logAIAction(params: {
  userId?: string;
  eventId?: string;
  feature: string;
  input: any;
  output: any;
}) {
  try {
    // This logs to stdout/console directly. 
    // Given the additive-only constraint, we won't modify the existing DB schema or calls here unless necessary.
    // Real implementation goes here or logs gracefully.
    console.log(`[AUDIT LOG] [AI Feature: ${params.feature}]`, {
      userId: params.userId || "system",
      eventId: params.eventId || "N/A",
      timestamp: new Date().toISOString(),
      status: params.output?.error ? "FAILURE" : "SUCCESS"
    });
  } catch (error) {
    console.error("[AUDIT LOG ERROR] Failed to log AI action:", error);
  }
}
