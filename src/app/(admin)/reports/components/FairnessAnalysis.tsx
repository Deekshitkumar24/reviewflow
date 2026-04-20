"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BiasAnalysisResult } from "@/types/ai";
import { AIBadge } from "@/components/ui/AIBadge";
import { AILoadingState } from "@/components/ui/AILoadingState";
import { AIErrorState } from "@/components/ui/AIErrorState";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Scale } from "lucide-react";

export function FairnessAnalysis({ eventId }: { eventId?: string }) {
  const [data, setData] = useState<BiasAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchBias = async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await fetch("/api/v1/ai/bias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: eventId || "all" }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.message);
      setData(d);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBias();
  }, [eventId]);

  if (loading && !data) {
    return <div className="mt-8"><AILoadingState /></div>;
  }

  if (error) {
    return <div className="mt-8"><AIErrorState onRetry={fetchBias} message="Failed to load fairness analysis." /></div>;
  }

  if (!data) return null;

  const flaggedCount = data.judges.filter(j => j.flag !== "none").length;

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold tracking-tight text-white">Fairness Analysis</h2>
        <AIBadge />
        <button onClick={fetchBias} className="p-1.5 ml-1 text-gray-400 hover:text-white rounded-md hover:bg-white/5 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <Card className="bg-[#111] border-white/5">
        <CardHeader className="pb-3 border-b border-white/5 bg-black/20">
            <CardTitle className="text-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-purple-400" />
                    Judge Scoring Bias
                </div>
                {flaggedCount === 0 ? (
                    <span className="text-sm font-medium text-green-400 px-2 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                        {data.judges.length} judges analyzed â€” No issues
                    </span>
                ) : (
                    <span className="text-sm font-medium text-amber-500 px-2 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
                        {flaggedCount} of {data.judges.length} judges flagged for review
                    </span>
                )}
            </CardTitle>
            <CardDescription className="text-gray-500">
                Statistical analysis of judge scoring patterns to identify harshness, leniency, or low discrimination. 
                Event mean: <strong className="text-gray-300">{data.eventMean.toFixed(1)}</strong>
            </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
            {data.judges.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">No scoring data available.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-black/40 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-3 font-medium">Judge Name</th>
                                <th className="px-6 py-3 font-medium text-right">Mean</th>
                                <th className="px-6 py-3 font-medium text-right">Std Dev</th>
                                <th className="px-6 py-3 font-medium text-right">Z-Score</th>
                                <th className="px-6 py-3 font-medium">Status / Flag</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {data.judges.map(j => (
                                <tr key={j.judgeId} className="hover:bg-white/[0.02]">
                                    <td className="px-6 py-4 font-medium text-gray-300">{j.judgeName} <span className="text-gray-600 text-xs font-normal">({j.submissionsScored} scored)</span></td>
                                    <td className="px-6 py-4 font-mono text-gray-400 text-right">{j.mean.toFixed(1)}</td>
                                    <td className="px-6 py-4 font-mono text-gray-400 text-right">{j.stdDev.toFixed(2)}</td>
                                    <td className="px-6 py-4 font-mono text-gray-400 text-right">{j.zScore > 0 ? '+' : ''}{j.zScore.toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        {j.flag === "none" ? (
                                            <Badge className="bg-green-500/10 text-green-400 shadow-none hover:bg-green-500/10 border border-green-500/20">Normal</Badge>
                                        ) : j.flag === "too-high" ? (
                                            <Badge className="bg-amber-500/10 text-amber-500 shadow-none hover:bg-amber-500/10 border border-amber-500/20">Lenient</Badge>
                                        ) : j.flag === "too-low" ? (
                                            <Badge className="bg-red-500/10 text-red-500 shadow-none hover:bg-red-500/10 border border-red-500/20">Harsh</Badge>
                                        ) : (
                                            <Badge className="bg-purple-500/10 text-purple-400 shadow-none hover:bg-purple-500/10 border border-purple-500/20">Low Variance</Badge>
                                        )}
                                        {j.flagReason && <p className="text-xs text-gray-500 mt-1 max-w-[250px]">{j.flagReason}</p>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
