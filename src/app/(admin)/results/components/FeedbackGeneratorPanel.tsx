import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Wand2, Loader2, Save, FileText, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AIBadge } from "@/components/ui/AIBadge";
import { AIActionButton } from "@/components/ui/AIActionButton";
import { ReviewOutputCard } from "@/components/ui/ReviewOutputCard";

interface FeedbackGeneratorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  eventName: string;
  eventId: string;
  teamName: string;
}

export function FeedbackGeneratorPanel({
  isOpen,
  onClose,
  teamId,
  eventName,
  eventId,
  teamName
}: FeedbackGeneratorPanelProps) {
  const [loadingContext, setLoadingContext] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [referenceData, setReferenceData] = useState<any>(null);
  const [draft, setDraft] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [sentAt, setSentAt] = useState<Date | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [tone, setTone] = useState("constructive"); // constructive, encouraging, critical

  // In a real implementation, we'd fetch the team's reviews based on teamId
  const fetchContext = async () => {
    setLoadingContext(true);
    try {
      // Stubbing fetch context: In reality this calls an API to get reviews for the team
      const res = await fetch(`/api/v1/teams/${teamId}`);
      if (res.ok) {
        const data = await res.json();
        setReferenceData(data.data.reviews || [{ score: 8, strengths: "Great idea", weaknesses: "Needs Polish" }]);
      } else {
        // Fallback for simulation
        setReferenceData([{ id: 1, mentor: "Alice", strengths: "Strong tech stack", weaknesses: "Poor presentation" }]);
      }
    } catch {
      toast.error("Failed to load reference data.");
    } finally {
      setLoadingContext(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setDraft("");
      setIsSent(false);
      fetchContext();
    }
  }, [isOpen, teamId]);

  const generateFeedback = async () => {
    if (!referenceData) return;
    setGenerating(true);
    setDraft("");
    setIsSent(false);
    setSentAt(null);
    setShowConfirm(false);
    try {
      const res = await fetch("/api/v1/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          teamId,
          tone,
          reviewsData: referenceData
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to generate");
      setDraft(result.result);
      toast.success("Feedback generated successfully!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = () => {
    // We would fire an API to save this feedback or send an email
    setIsSent(true);
    setSentAt(new Date());
    setShowConfirm(false);
    toast.success(`Feedback dispatched to ${teamName} successfully!`);
    // Keeping modal open so admin can see sent status
  };

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 bottom-0 w-full max-w-xl bg-black/80 backdrop-blur-xl border-l border-white/10 z-50 flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-400" />
              AI Feedback Generator
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Generating constructive feedback for {teamName}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Reference Data Block */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" /> Reference Data
            </h3>
            <div className="bg-[#111] p-3 rounded-xl border border-white/5 text-xs text-gray-400 max-h-32 overflow-y-auto space-y-3">
              {loadingContext ? (
                <div className="flex items-center gap-2 text-blue-400 py-4 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" /> Fetching raw reviews...
                </div>
              ) : referenceData ? (
                <div>
                  <p>Found {referenceData.length} raw review records.</p>
                  <pre className="mt-2 text-[10px] bg-black p-2 rounded">{JSON.stringify(referenceData, null, 2)}</pre>
                </div>
              ) : (
                <p>No reference data available.</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-300">Draft Feedback</h3>
              <div className="flex items-center gap-2">
                <Select value={tone} onValueChange={(val) => setTone(val || '')} disabled={loadingContext || generating || isSent}>
                  <SelectTrigger className="h-8 text-xs bg-[#111] border-white/10 w-[120px]">
                    <SelectValue placeholder="Select Tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="constructive">Constructive</SelectItem>
                    <SelectItem value="encouraging">Encouraging</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={generateFeedback}
                  disabled={loadingContext || generating}
                  className="h-8 gap-2 bg-purple-600/20 text-purple-300 hover:bg-purple-600/40 border border-purple-500/30"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  {draft ? "Regenerate" : "Generate Draft"}
                </Button>
              </div>
            </div>
            
            {generating ? (
              <div className="h-64 rounded-xl border border-purple-500/20 bg-purple-500/5 backdrop-blur-md flex flex-col items-center justify-center gap-3 relative overflow-hidden shadow-inner">
                <div className="absolute inset-0 bg-purple-500/5 pulse-bg"></div>
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin relative z-10" />
                <p className="text-sm font-medium text-purple-300 relative z-10">AI processing request based on {referenceData?.length || 0} reviews...</p>
              </div>
            ) : (
              <div className="relative">
                {isSent && (
                  <div className="absolute inset-0 bg-black/60 rounded-xl z-10 flex flex-col items-center justify-center backdrop-blur-[1px]">
                    <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
                    <p className="text-sm font-semibold text-white">Feedback Sent and Locked</p>
                    <p className="text-xs text-gray-300 mt-1">Sent on {sentAt?.toLocaleDateString()} at {sentAt?.toLocaleTimeString()}</p>
                    <p className="text-xs text-gray-500 mt-4 flex items-center gap-1"><Lock className="w-3 h-3"/> Draft is now read-only</p>
                  </div>
                )}
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={isSent || showConfirm || generating}
                  placeholder="AI will generate a comprehensive report here. You can edit it before sending."
                  className="min-h-[300px] bg-black/40 backdrop-blur-md border-white/10 text-sm text-gray-200 resize-none p-4 pb-10 focus:ring-1 focus:ring-purple-500 whitespace-pre-wrap disabled:opacity-50"
                />
                {draft && !generating && (
                  <div className="absolute bottom-3 right-4 flex items-center gap-3 text-xs text-gray-500 z-20">
                    <span className="bg-white/5 px-2 py-0.5 rounded">Gen: {new Date().toLocaleTimeString()}</span>
                    <span>{draft.trim().split(/\s+/).length} words</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-white/10 bg-[#111] flex justify-between items-center bg-black/10">
          <div>
             {showConfirm && (
                <span className="text-xs text-yellow-400 font-medium ml-2 animate-pulse">Are you sure you want to send this to the team?</span>
             )}
          </div>
          <div className="flex gap-2">
            {showConfirm ? (
              <>
                <Button variant="ghost" onClick={() => setShowConfirm(false)} className="text-gray-400">Cancel</Button>
                <Button
                  onClick={handleSend}
                  disabled={!draft || isSent || generating}
                  className="bg-green-600 hover:bg-green-500 text-white gap-2"
                >
                  <Send className="w-4 h-4" /> Confirm Send
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={onClose} className="text-gray-400">Close</Button>
                <Button
                  onClick={() => setShowConfirm(true)}
                  disabled={!draft || isSent || generating}
                  className={`gap-2 ${isSent ? "bg-green-600 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"}`}
                >
                  {isSent ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  {isSent ? "Sent Successfully" : "Approve & Send to Team"}
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
