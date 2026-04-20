import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AIActionButton } from "./AIActionButton";
import { ReviewOutputCard } from "./ReviewOutputCard";
import { toast } from "sonner";

interface AIReviewSectionProps {
  id: string; // "improve", "strengths", "weaknesses", "nextsteps", "verdict"
  label: string;
  required?: boolean;
  value: string;
  onChange: (val: string) => void;
  eventId: string;
  disabled?: boolean;
  placeholder?: string;
  buttonLabel: string;
}

export function AIReviewSection({
  id,
  label,
  required,
  value,
  onChange,
  eventId,
  disabled,
  placeholder,
  buttonLabel
}: AIReviewSectionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [aiOutput, setAiOutput] = useState("");
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  const generate = async () => {
    if (!value.trim()) return;
    setLoading(true);
    setError(false);
    
    try {
      const res = await fetch(`/api/v1/ai/review/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, rawFeedback: value }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.message);
      setAiOutput(data.result);
      setGeneratedAt(new Date());
    } catch (err: any) {
      setError(true);
      toast.error(err.message || "Failed to generate AI content");
    } finally {
      setLoading(false);
    }
  };

  const handleUseAIOutput = () => {
    if (aiOutput) {
      onChange(aiOutput);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <Label className="text-base font-semibold">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        {!disabled && (
          <AIActionButton 
            label={buttonLabel}
            onClick={generate}
            loading={loading}
            disabled={value.length < 5}
          />
        )}
      </div>

      <div className="flex flex-col gap-4">
        {/* Official input area */}
        <div className="relative">
          <Textarea
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            disabled={disabled}
            className="w-full bg-[#111] border-white/10"
          />
          <p className={`text-xs text-right mt-1 ${required && value.length < 10 && value.length > 0 ? 'text-red-500' : 'text-gray-400'}`}>
            {value.length} chars {required && value.length < 10 && value.length > 0 && '(min 10)'}
            {!required && ' (rough notes)'}
          </p>
        </div>

        {/* AI Output Card underneath */}
        {(aiOutput || loading || error) && (
          <div className="border-t border-white/5 pt-4">
            <ReviewOutputCard
              title={`AI Generated ${label}`}
              value={aiOutput}
              onChange={setAiOutput}
              onRegenerate={generate}
              loading={loading}
              error={error}
              generatedAt={generatedAt}
            />
          </div>
        )}
      </div>
    </div>
  );
}
