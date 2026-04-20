import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AILoadingState } from "./AILoadingState";
import { AIErrorState } from "./AIErrorState";
import { AIBadge } from "./AIBadge";

interface ReviewOutputCardProps {
  title: string;
  value: string;
  onChange: (val: string) => void;
  onRegenerate: () => void;
  loading: boolean;
  error: boolean;
  generatedAt?: Date | null;
  className?: string;
  placeholder?: string;
  height?: string;
}

export function ReviewOutputCard({
  title,
  value,
  onChange,
  onRegenerate,
  loading,
  error,
  generatedAt,
  className = "",
  placeholder = "Output will appear here...",
  height = "h-32"
}: ReviewOutputCardProps) {
  const [copied, setCopied] = useState(false);

  const wordCount = value.trim().length ? value.trim().split(/\s+/).length : 0;

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className={`w-full bg-[#111] border border-white/10 rounded-2xl p-5 ${className}`}>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">{title}</h4>
        <AILoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`w-full bg-[#111] border border-white/10 rounded-2xl p-5 ${className}`}>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">{title}</h4>
        <AIErrorState onRetry={onRegenerate} message="Failed to generate text." />
      </div>
    );
  }

  if (!value) {
    return (
      <div className={`w-full bg-[#111] border border-white/5 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center ${className}`}>
        <AIBadge />
        <p className="text-sm text-gray-500 mt-2">AI output will appear here after generation.</p>
        <p className="text-xs text-gray-600">You can edit the result before copying it.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`w-full bg-[#111] border border-white/10 rounded-2xl p-5 flex flex-col ${className}`}
    >
      <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <AIBadge />
          <h4 className="text-sm font-semibold text-gray-300">{title}</h4>
        </div>
        <div className="flex items-center gap-2">
          {generatedAt && <span className="text-[10px] text-gray-500 mr-2 bg-white/5 px-2 py-0.5 rounded">Gen: {generatedAt.toLocaleTimeString()}</span>}
          <span className="text-xs text-gray-500 mr-2">{wordCount} words</span>
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            title="Regenerate"
            className="h-8 gap-1.5 text-xs text-blue-400 border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20 hover:text-blue-300"
          >
            <RefreshCw className="w-3 h-3" /> Regenerate
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            title="Copy to clipboard"
            className="w-8 h-8 text-gray-400 hover:text-white hover:bg-white/5 border border-white/10"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y whitespace-pre-wrap ${height}`}
        placeholder={placeholder}
      />
    </motion.div>
  );
}
