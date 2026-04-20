"use client";
import { useEffect, useState } from "react";

type AIStatus = "ready" | "slow" | "unavailable";

export function AIStatusIndicator() {
  const [status, setStatus] = useState<AIStatus>("ready");

  // In a real app, this could ping a health check endpoint.
  // We'll mock it as 'ready' by default.
  useEffect(() => {
    setStatus("ready");
  }, []);

  const config = {
    ready: { color: "bg-green-500", text: "AI Ready" },
    slow: { color: "bg-amber-500", text: "AI Slow" },
    unavailable: { color: "bg-red-500", text: "AI Unavailable" },
  };

  return (
    <div 
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111] border border-white/10" 
      title={status === "unavailable" ? "AI temporarily unavailable" : ""}
    >
      <span className={`w-2 h-2 rounded-full ${config[status].color}`} />
      <span className="text-xs font-medium text-gray-300">{config[status].text}</span>
    </div>
  );
}
