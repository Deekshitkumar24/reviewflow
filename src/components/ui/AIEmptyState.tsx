import { CheckCircle2 } from "lucide-react";

interface AIEmptyStateProps {
  message?: string;
}

export function AIEmptyState({ message = "No issues detected" }: AIEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-[#111] border border-green-900/20 rounded-2xl flex-1">
      <CheckCircle2 className="w-10 h-10 text-green-500 mb-4 opacity-80" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}
