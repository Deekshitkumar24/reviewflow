// src/lib/ai.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIErrorResponse, AITextResponse } from "@/types/ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function callGemini(params: {
  systemPrompt: string;
  userInput: string;
  routeName: string;
  history?: { role: "system" | "user" | "assistant"; content: string }[];
  jsonMode?: boolean;
}): Promise<any | AIErrorResponse> {

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let attempt = 0;

  while (attempt < 2) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
        systemInstruction: params.systemPrompt,
        generationConfig: params.jsonMode ? { responseMimeType: "application/json" } : undefined
      });

      const contents = [];
      if (params.history) {
        for (const msg of params.history) {
          if (msg.role !== 'system') { // system is mapped via systemInstruction
             const role = msg.role === 'assistant' ? 'model' : 'user';
             contents.push({ role, parts: [{ text: msg.content }] });
          }
        }
      }
      contents.push({ role: "user", parts: [{ text: params.userInput }] });

      const response = await model.generateContent({ contents }, { signal: controller.signal });
      clearTimeout(timeoutId);

      const resultText = response.response.text();
      const tokensUsed = response.response.usageMetadata?.totalTokenCount || 0;

      if (params.jsonMode && resultText) {
        try {
          const parsed = JSON.parse(resultText);
          const finalRes = { ...parsed, tokensUsed };
          return finalRes;
        } catch {
          return {
            error: true,
            message: "Failed to parse AI output as JSON.",
            retryable: true,
          } as AIErrorResponse;
        }
      }

      const finalResponse = {
        result: resultText,
        tokensUsed,
      };

      return finalResponse;
    } catch (error: any) {
      if (error.name === "AbortError" || error.code === "ABORT_ERR") {
        clearTimeout(timeoutId);
        return {
          error: true,
          message: "AI request timed out.",
          retryable: true,
        } as AIErrorResponse;
      }
      
      if (error.status === 429 || error.message?.includes("429") || error.message?.includes("quota")) {
        clearTimeout(timeoutId);
        return {
          error: true,
          message: "AI service temporarily unavailable due to quota limits. Please try again later.",
          retryable: false,
        } as AIErrorResponse;
      }
      attempt++;
      if (attempt >= 2) {
        clearTimeout(timeoutId);
        return {
          error: true,
          message: error.message || "AI temporarily unavailable",
          retryable: true,
        } as AIErrorResponse;
      }
    }
  }
}

