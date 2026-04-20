import React from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AILoadingState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center bg-[#111]/60 backdrop-blur-lg rounded-xl border border-blue-500/20 shadow-xl relative overflow-hidden">
      <div className="absolute inset-0 bg-blue-500/5 pulse-bg"></div>
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin relative z-10" />
      <p className="text-sm font-medium text-blue-400 max-w-sm relative z-10">{message}</p>
    </div>
  );
}

export function AIErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const isQuota = message.toLowerCase().includes("quota") || message.includes("429");
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center bg-[#111]/80 backdrop-blur-lg rounded-xl border border-red-500/20 shadow-xl">
      <AlertCircle className={`w-8 h-8 ${isQuota ? 'text-orange-500' : 'text-red-500'}`} />
      <div>
        <h4 className={`text-sm font-semibold mb-1 ${isQuota ? 'text-orange-400' : 'text-red-400'}`}>
          {isQuota ? "AI Quota Exceeded" : "AI Service Error"}
        </h4>
        <p className={`text-xs max-w-sm ${isQuota ? 'text-orange-300/80' : 'text-red-300/80'}`}>{message}</p>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onRetry}
        className={`mt-2 ${isQuota ? 'border-orange-500/20 text-orange-400 hover:bg-orange-500/10' : 'border-red-500/20 text-red-400 hover:bg-red-500/10'}`}
      >
        <RefreshCw className="w-3.5 h-3.5 mr-2" />
        Retry Request
      </Button>
    </div>
  );
}
