import { AlertCircle, RefreshCw } from "lucide-react";

interface AIErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function AIErrorState({ message = "AI temporarily unavailable", onRetry }: AIErrorStateProps) {
  const isQuota = message?.toLowerCase().includes("quota") || message?.includes("429");
  
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center bg-black/40 backdrop-blur-md border border-red-900/40 rounded-2xl shadow-xl">
      <AlertCircle className={`w-8 h-8 mb-3 ${isQuota ? 'text-orange-500' : 'text-red-500'}`} />
      <h4 className={`text-sm font-semibold mb-1 ${isQuota ? 'text-orange-400' : 'text-red-400'}`}>
        {isQuota ? "AI Quota Exceeded" : "AI Service Error"}
      </h4>
      <p className={`text-xs max-w-sm mb-4 ${isQuota ? 'text-orange-300/80' : 'text-gray-400'}`}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={!onRetry}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${isQuota ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-orange-500/30' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/30'}`}
        >
          <RefreshCw className="w-4 h-4" />
          Retry Request
        </button>
      )}
    </div>
  );
}
