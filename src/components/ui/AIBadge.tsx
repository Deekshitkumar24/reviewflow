import { Sparkles } from "lucide-react";

export function AIBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600/20 px-2 py-0.5 text-xs font-medium text-blue-400 border border-blue-500/30">
      <Sparkles className="w-3 h-3" />
      AI
    </span>
  );
}
