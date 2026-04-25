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

  const contents: any[] = [];
  if (params.history && params.history.length > 0) {
    const validHistory = params.history.filter(m => m.role !== 'system');
    
    let expectedRole = 'user';
    for (const msg of validHistory) {
       const role = msg.role === 'assistant' ? 'model' : 'user';
       if (role === expectedRole) {
         contents.push({ role, parts: [{ text: msg.content }] });
         expectedRole = role === 'user' ? 'model' : 'user';
       }
    }
  }

  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
     contents[contents.length - 1].parts[0].text += '\n\n' + params.userInput;
  } else {
     contents.push({ role: "user", parts: [{ text: params.userInput }] });
  }

  let geminiError: any = null;
  let geminiSuccess = false;
  let responseData: any = null;
  let attempt = 0;

  // 2. Gemini Execution (Wrapped in try/catch)
  while (attempt < 2 && !geminiSuccess) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: params.systemPrompt,
        generationConfig: params.jsonMode ? { responseMimeType: "application/json" } : undefined
      });

      const response = await model.generateContent({ contents }, { signal: controller.signal });
      clearTimeout(timeoutId);

      const candidate = response.response.candidates?.[0];
      const resultText = candidate?.content?.parts?.[0]?.text || "";
      const tokensUsed = response.response.usageMetadata?.totalTokenCount || 0;

      if (!resultText && !candidate) {
        throw new Error("AI returned an empty response or was blocked.");
      }

      let parsedData = resultText;
      if (params.jsonMode && resultText) {
        try {
          parsedData = JSON.parse(resultText);
        } catch {
          throw new Error("Failed to parse AI output as JSON.");
        }
      }

      responseData = {
        data: parsedData,
        usage: { totalTokenCount: tokensUsed },
        providerUsed: "gemini",
        fallbackTriggered: false,
        // Existing return format for compatibility
        result: parsedData,
        tokensUsed,
        ...(typeof parsedData === 'object' ? parsedData : {})
      };
      geminiSuccess = true;
    } catch (error: any) {
      geminiError = error;
      const isTimeout = error.name === "AbortError" || error.code === "ABORT_ERR";
      const status = error.status || error.response?.status || 'unknown';
      
      const isQuota = status === 429 || error.message?.includes("429") || error.message?.includes("quota");
      
      if (isTimeout || isQuota) {
        break; // Break loop immediately to allow Vertex fallback
      }
      
      attempt++;
      if (attempt >= 2) {
        break;
      }
      await new Promise(res => setTimeout(res, 2000));
    }
  }

  if (geminiSuccess) {
    return responseData;
  }

  // 3. Error Classification
  const status = geminiError?.status || geminiError?.response?.status || 'unknown';
  const isTimeout = geminiError?.name === "AbortError" || geminiError?.code === "ABORT_ERR";
  const doNotFallback = status === 400 || status === 401;

  if (doNotFallback || !process.env.VERTEX_API_KEY) {
    throw geminiError || new Error("Gemini API failed");
  }

  // 4. Vertex Fallback
  let vertexAttempt = 0;
  let vertexError: any = null;

  while (vertexAttempt < 2) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const vertexKey = process.env.VERTEX_API_KEY;
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${vertexKey}`;

      const payload = {
        contents,
        systemInstruction: { parts: [{ text: params.systemPrompt }] },
        generationConfig: params.jsonMode ? { responseMimeType: "application/json" } : undefined
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Vertex API error: ${res.status} ${res.statusText} - ${errBody}`);
      }

      const response = await res.json();

      // 5. Response Normalization
      const candidate = response.candidates?.[0];
      const resultText = candidate?.content?.parts?.[0]?.text || "";
      const tokensUsed = response.usageMetadata?.totalTokenCount || 0;

      if (!resultText && !candidate) {
        throw new Error("Vertex returned an empty response or was blocked.");
      }

      let parsedData = resultText;
      if (params.jsonMode && resultText) {
        try {
          parsedData = JSON.parse(resultText);
        } catch {
          throw { message: "Failed to parse AI output as JSON." };
        }
      }

      return {
        data: parsedData,
        usage: { totalTokenCount: tokensUsed },
        providerUsed: "vertex",
        fallbackTriggered: true,
        geminiError: geminiError?.message || "Unknown Gemini Error",
        // Existing return format for compatibility
        result: parsedData,
        tokensUsed,
        ...(typeof parsedData === 'object' ? parsedData : {})
      };

    } catch (error: any) {
      vertexError = error;
      vertexAttempt++;
      if (vertexAttempt >= 2) {
        break;
      }
      await new Promise(res => setTimeout(res, 2000));
    }
  }

  // 7. Error Handling (Both failed)
  throw {
    message: "AI request failed on all providers",
    geminiError: geminiError?.message || String(geminiError),
    vertexError: vertexError?.message || String(vertexError)
  };
}
