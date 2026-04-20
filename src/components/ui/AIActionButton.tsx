import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIActionButtonProps {
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function AIActionButton({ label, onClick, loading, disabled }: AIActionButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled || loading}
      className={`h-9 px-3 gap-2 rounded-lg border bg-blue-600/15 border-blue-500/30 text-blue-300 hover:bg-blue-600/30 hover:text-blue-200 hover:border-blue-500/50 transition-colors ${
        loading || disabled ? "opacity-60 cursor-not-allowed" : ""
      }`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
      ) : (
        <Sparkles className="w-4 h-4" />
      )}
      {loading ? "Generating..." : label}
    </Button>
  );
}
