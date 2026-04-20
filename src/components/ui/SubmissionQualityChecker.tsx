import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, AlertTriangle, CheckCircle, Lightbulb, Copy, Info, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AILoadingState, AIErrorState } from '@/components/ui/AIStates';
import { toast } from 'sonner';

interface SubmissionQualityCheckerProps {
  teamData: any;
  readinessCount: number;
}

export default function SubmissionQualityChecker({ teamData, readinessCount }: SubmissionQualityCheckerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorDesc, setErrorDesc] = useState<string | null>(null);
  const [isIncomplete, setIsIncomplete] = useState(false);
  const [lastChecked, setLastChecked] = useState<number | null>(null);

  // Load from session storage on mount
  useEffect(() => {
    if (!teamData?.teamId) return;
    const cacheKey = `sqc_${teamData.teamId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setResult(parsed.result);
        setLastChecked(parsed.timestamp);
      } catch (e) {}
    }
  }, [teamData?.teamId]);

  const checkQuality = async () => {
    setIsGenerating(true);
    setErrorDesc(null);
    setIsIncomplete(false);

    try {
      const res = await fetch('/api/v1/ai/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: teamData.teamId,
          projectTitle: teamData.projectTitle,
          projectDescription: teamData.projectDescription,
          domain: teamData.domain,
          department: teamData.department,
          githubUrl: teamData.githubUrl,
          pptLink: teamData.pptLink,
          demoLink: teamData.demoLink,
          readiness: readinessCount,
        }),
      });

      const data = await res.json();
      
      if (data.isIncomplete) {
        setIsIncomplete(true);
        return;
      }

      if (data.error) throw new Error(data.message);

      const passData = data.result;
      setResult(passData);
      
      const now = Date.now();
      setLastChecked(now);
      sessionStorage.setItem(`sqc_${teamData.teamId}`, JSON.stringify({ result: passData, timestamp: now }));

    } catch (err: any) {
      setErrorDesc(err.message || 'AI engine failed to analyze submission.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyTips = () => {
    if (!result?.tips) return;
    const text = result.tips.map((t: string) => `- ${t}`).join('\n');
    navigator.clipboard.writeText(`Submission Tips:\n${text}`);
    toast.success('Tips copied to clipboard');
  };

  const getColorClass = (score: number) => {
    if (score >= 80) return 'text-green-500 border-green-500/20 bg-green-500/10';
    if (score >= 50) return 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10';
    return 'text-red-500 border-red-500/20 bg-red-500/10';
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getTimeAgo = () => {
    if (!lastChecked) return '';
    const mins = Math.floor((Date.now() - lastChecked) / 60000);
    if (mins < 1) return 'Just now';
    return `${mins} min${mins > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="bg-[#111] border border-blue-500/20 rounded-xl overflow-hidden mt-6 shadow-lg shadow-blue-500/5 relative group">
      {/* Header bar indicating AI presence */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-4 py-3 border-b border-white/5 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-gray-100 text-sm flex items-center gap-2">
              Submission Quality Score
              <span className="px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-400 text-[10px] uppercase font-bold tracking-wider leading-none flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> AI
              </span>
            </h3>
         </div>
         {lastChecked && (
           <span className="text-xs text-gray-500 flex items-center gap-1">
             Last checked: {getTimeAgo()}
           </span>
         )}
      </div>

      <div className="p-4">
        {!isGenerating && !result && !errorDesc && !isIncomplete && (
          <div className="text-center py-6">
             <p className="text-sm text-gray-400 mb-4 max-w-md mx-auto">
                Scan your project title, description, and links to see how prepared you are for evaluation. This is a private, advisory check.
             </p>
             <Button onClick={checkQuality} className="bg-blue-600 hover:bg-blue-500 text-white gap-2">
               <Target className="w-4 h-4" />
               Scan Project Quality
             </Button>
          </div>
        )}

        {isGenerating && (
          <div className="py-8">
             <AILoadingState message="Analyzing clarity, completeness, and presentation quality..." />
          </div>
        )}

        {errorDesc && !isGenerating && (
          <div className="py-4">
            <AIErrorState 
               message={errorDesc} 
               onRetry={checkQuality} 
            />
          </div>
        )}

        {isIncomplete && !isGenerating && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-6 text-center">
             <AlertTriangle className="w-8 h-8 text-orange-400 mx-auto mb-3" />
             <h4 className="font-semibold text-orange-400 mb-2">Incomplete Submission</h4>
             <p className="text-sm text-orange-200/70 mb-4 max-w-sm mx-auto">
               You need to provide more project details or link a repository before we can give a meaningful quality score.
             </p>
             <Button onClick={checkQuality} variant="outline" className="border-orange-500/20 text-orange-400 hover:bg-orange-500/10 gap-2">
                Try again
             </Button>
          </div>
        )}

        <AnimatePresence>
          {result && !isGenerating && !errorDesc && !isIncomplete && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Score & Grade Row */}
              <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start p-4 rounded-xl border border-white/5 bg-black/20">
                 <div className="flex flex-col items-center justify-center space-y-1">
                    <motion.div 
                       initial={{ scale: 0.8 }}
                       animate={{ scale: 1 }}
                       transition={{ type: "spring", stiffness: 200, damping: 10 }}
                       className={`w-20 h-20 rounded-full border-4 flex items-center justify-center text-3xl font-bold shadow-lg ${getColorClass(result.score)}`}
                    >
                       {result.score}
                    </motion.div>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">Score</span>
                 </div>
                 
                 <div className="flex-1 space-y-4 w-full text-center sm:text-left">
                    <div>
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          <span className="text-gray-400 text-sm">Estimated Grade:</span>
                          <span className={`text-xl font-bold ${getScoreColor(result.score)}`}>{result.grade}</span>
                          <span className={`text-[10px] uppercase font-bold tracking-wider ml-2 px-2 py-0.5 rounded border ${
                            result.score >= 80 ? 'border-green-500/30 text-green-400 bg-green-500/10' : 
                            result.score >= 50 ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' : 
                            'border-red-500/30 text-red-400 bg-red-500/10'
                          }`}>
                            {result.score >= 80 ? 'Excellent' : result.score >= 50 ? 'Needs Improvement' : 'Critical Risk'}
                          </span>
                        </div>
                       <p className="text-sm text-gray-500 mt-1">
                         {result.score >= 80 ? "Looks great! You are highly prepared." : result.score >= 50 ? "Good start, but room for minor improvements." : "Needs work before evaluation."}
                       </p>
                    </div>
                 </div>
              </div>

              {/* Tips & Missing Rows */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-4 relative group/tips">
                    <h4 className="text-sm font-semibold text-blue-400 flex items-center gap-2 mb-3">
                       <Lightbulb className="w-4 h-4" /> Actionable Tips
                    </h4>
                    <ul className="space-y-2">
                       {result.tips.map((tip: string, idx: number) => (
                         <li key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5">•</span>
                            <span>{tip}</span>
                         </li>
                       ))}
                    </ul>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={copyTips}
                      className="absolute top-2 right-2 h-7 w-7 text-blue-400 opacity-0 group-hover/tips:opacity-100 transition-opacity"
                    >
                       <Copy className="w-3.5 h-3.5" />
                    </Button>
                 </div>

                 <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-3">
                       <CheckCircle className="w-4 h-4 text-gray-400" /> Completeness Check
                    </h4>
                    {result.missingFields && result.missingFields.length > 0 ? (
                      <ul className="space-y-2">
                         {result.missingFields.map((field: string, idx: number) => (
                           <li key={idx} className="text-xs text-gray-400 flex items-start gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                              <span>Missing: <strong className="text-gray-300">{field}</strong></span>
                           </li>
                         ))}
                      </ul>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-green-400 p-2 bg-green-500/10 rounded-md">
                         <CheckCircle className="w-4 h-4" /> All core fields present
                      </div>
                    )}
                 </div>
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-2 bg-[#000] p-3 rounded-md border border-white/5">
                 <Info className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                 <p className="text-xs text-gray-500">
                    This analysis is based on your current submission data. Contact your coordinator to update details if needed.
                 </p>
                 <div className="ml-auto">
                    <Button variant="ghost" size="sm" onClick={checkQuality} className="h-6 text-[10px] flex items-center gap-1 text-gray-400 hover:text-white">
                      Re-scan
                    </Button>
                 </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
