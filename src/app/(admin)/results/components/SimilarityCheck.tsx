"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScanSearch, X } from "lucide-react";
import { PlagiarismResult } from "@/types/ai";
import { AIBadge } from "@/components/ui/AIBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AILoadingState } from "@/components/ui/AILoadingState";
import { AIErrorState } from "@/components/ui/AIErrorState";

export function SimilarityCheck({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [result, setResult] = useState<PlagiarismResult | null>(null);

  const runCheck = async () => {
    setLoading(true);
    setError(false);
    setOpen(true);
    try {
      const res = await fetch("/api/v1/ai/plagiarism", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.message);
      setResult(d);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm"
        className="gap-2 bg-transparent border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
        onClick={runCheck}
      >
        <ScanSearch className="w-4 h-4" />
        Similarity Check
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#111] border border-white/10 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanSearch className="w-5 h-5 text-purple-400" />
              Plagiarism & Similarity Detector
              <AIBadge />
            </DialogTitle>
          </DialogHeader>

          {loading && <AILoadingState />}
          {error && <AIErrorState onRetry={runCheck} message="Failed to complete similarity check." />}
          
          {!loading && !error && result && (
            <div className="space-y-4 py-4">
              {result.flaggedPairs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                    <p className="text-green-400 font-semibold mb-1">All Clear</p>
                    <p className="text-sm text-green-500">No high-similarity submissions detected.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {result.flaggedPairs.map((pair, idx) => (
                    <div key={idx} className="p-4 bg-black/50 border border-amber-500/20 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-gray-200">
                              <span className="text-blue-400">{pair.team1.name}</span> vs <span className="text-blue-400">{pair.team2.name}</span>
                          </h4>
                          <span className="px-2 py-1 text-xs font-bold bg-amber-500/10 text-amber-500 rounded border border-amber-500/20">
                              {pair.similarityScore}% Similar
                          </span>
                      </div>
                      <div className="text-sm text-gray-400">
                          <p className="mb-2 font-medium text-gray-300">Overlapping concepts:</p>
                          <div className="flex flex-wrap gap-1.5">
                              {pair.overlappingSections.map((term, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs">{term}</span>
                              ))}
                          </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-2 border-t border-white/5 mt-2">
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-400 hover:text-white" onClick={() => setOpen(false)}>Mark as Reviewed</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300">Escalate to Dispute</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
