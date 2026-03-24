'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Save, Send, ChevronDown, ChevronUp, Info, AlertTriangle, CheckCircle2, XCircle, Zap, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAppStore } from '@/stores/useAppStore';
import { SCORING_CRITERIA, calculateCompositeScore, VERDICT_CONFIG, type ReviewScores, type VerdictType, type SuggestionItem, type SuggestionStatus } from '@/types';

interface TeamInfo {
  id: string;
  teamName: string;
  projectTitle: string;
  projectDescription: string;
  domain: string;
  department: string;
  collegeName: string;
  memberCount: number;
  labName: string;
  roundName: string;
  roundOrder: number;
}

interface PreviousReview {
  scores: ReviewScores;
  compositeScore: number;
  verdict: VerdictType;
  suggestions: SuggestionItem[];
}

interface SuggestionDraft {
  text: string;
  category: string;
  orderIndex: number;
}

interface SuggestionStatusDraft {
  suggestionId: string;
  text: string;
  status: SuggestionStatus | '';
}

const VERDICT_OPTIONS: { value: VerdictType; label: string; color: string; bg: string }[] = [
  { value: 'selected', label: '✅ Selected', color: 'border-green-500 bg-green-50 dark:bg-green-950/20', bg: 'hover:bg-green-100 dark:hover:bg-green-950/30' },
  { value: 'shortlisted', label: '🔵 Shortlisted', color: 'border-blue-500 bg-blue-50 dark:bg-blue-950/20', bg: 'hover:bg-blue-100' },
  { value: 'hold', label: '🟡 Hold', color: 'border-amber-500 bg-amber-50 dark:bg-amber-950/20', bg: 'hover:bg-amber-100' },
  { value: 'needs_improvement', label: '🟣 Needs Improvement', color: 'border-purple-500 bg-purple-50 dark:bg-purple-950/20', bg: 'hover:bg-purple-100' },
  { value: 'not_selected', label: '🔴 Not Selected', color: 'border-red-500 bg-red-50 dark:bg-red-950/20', bg: 'hover:bg-red-100' },
];

export default function ReviewFormPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params);
  const router = useRouter();
  const { user } = useAppStore();

  // Team info
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [previousReview, setPreviousReview] = useState<PreviousReview | null>(null);
  const [showTeamDetails, setShowTeamDetails] = useState(false);
  const [loading, setLoading] = useState(true);

  // Scores
  const [scores, setScores] = useState<ReviewScores>({
    innovationScore: 5,
    technicalScore: 5,
    presentationScore: 5,
    feasibilityScore: 5,
    problemSolvingScore: 5,
    communicationScore: 5,
  });

  // Text fields
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [overallComments, setOverallComments] = useState('');

  // Verdict
  const [verdict, setVerdict] = useState<VerdictType | ''>('');

  // Suggestions from this review
  const [suggestions, setSuggestions] = useState<SuggestionDraft[]>([]);

  // Previous suggestion statuses
  const [suggestionStatuses, setSuggestionStatuses] = useState<SuggestionStatusDraft[]>([]);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const compositeScore = calculateCompositeScore(scores);

  // Load team data
  useEffect(() => {
    setTimeout(() => {
      setTeam({
        id: teamId,
        teamName: 'AlgoX',
        projectTitle: 'AI-Powered Code Review Assistant',
        projectDescription: 'An intelligent system that reviews code pull requests using LLMs and provides actionable feedback.',
        domain: 'AI/ML',
        department: 'CSE',
        collegeName: 'VJIT',
        memberCount: 3,
        labName: 'Lab 101',
        roundName: 'Round 1 — Preliminary',
        roundOrder: 1,
      });
      // Simulate if Round 2 has previous review
      // setPreviousReview({ ... });
      setLoading(false);
    }, 300);
  }, [teamId]);

  // Auto-save to localStorage
  useEffect(() => {
    const timer = setInterval(() => {
      if (team) {
        const draft = { scores, strengths, weaknesses, overallComments, verdict, suggestions, suggestionStatuses };
        localStorage.setItem(`reviewflow-draft-${teamId}`, JSON.stringify(draft));
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [scores, strengths, weaknesses, overallComments, verdict, suggestions, suggestionStatuses, teamId, team]);

  // Restore draft
  useEffect(() => {
    const saved = localStorage.getItem(`reviewflow-draft-${teamId}`);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.scores) setScores(draft.scores);
        if (draft.strengths) setStrengths(draft.strengths);
        if (draft.weaknesses) setWeaknesses(draft.weaknesses);
        if (draft.overallComments) setOverallComments(draft.overallComments);
        if (draft.verdict) setVerdict(draft.verdict);
        if (draft.suggestions) setSuggestions(draft.suggestions);
        toast.info('Draft restored from auto-save');
      } catch { /* ignore */ }
    }
  }, [teamId]);

  const updateScore = (key: keyof ReviewScores, value: number) => {
    setScores(prev => ({ ...prev, [key]: value }));
  };

  const addSuggestion = () => {
    if (suggestions.length >= 5) return;
    setSuggestions([...suggestions, { text: '', category: 'Technical', orderIndex: suggestions.length }]);
  };

  const removeSuggestion = (idx: number) => {
    setSuggestions(suggestions.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!isDraft) {
      if (!verdict) { toast.error('Please select a verdict'); return; }
      const hasZeroScore = Object.values(scores).some(s => s === 0);
      if (hasZeroScore) { toast.error('All scores must be at least 1'); return; }
      if (previousReview?.suggestions && previousReview.suggestions.length > 0) {
        const unmarked = suggestionStatuses.some(s => !s.status);
        if (unmarked) { toast.error('Please mark all previous suggestions'); return; }
      }
    }

    isDraft ? setSavingDraft(true) : setSubmitting(true);
    try {
      // API call would go here
      await new Promise(r => setTimeout(r, 800));
      localStorage.removeItem(`reviewflow-draft-${teamId}`);
      toast.success(isDraft ? 'Draft saved' : 'Review submitted successfully');
      if (!isDraft) router.back();
    } catch {
      toast.error('Failed to submit review');
    } finally {
      setSavingDraft(false);
      setSubmitting(false);
    }
  };

  if (loading || !team) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="relative pb-32">
      {/* ─── STICKY HEADER ─── */}
      <div className="sticky top-14 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 -mx-4 px-4 py-3">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-gray-900 dark:text-gray-100 text-base">{team.teamName}</h1>
              <p className="text-xs text-gray-500">{team.roundName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm font-bold px-3 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
              {compositeScore.toFixed(1)}
              <span className="text-xs font-normal ml-1">/100</span>
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto mt-4 space-y-5">
        {/* ─── SECTION 1: TEAM INFO ─── */}
        <Card className="border border-gray-200 dark:border-gray-800">
          <CardContent className="p-4">
            <button
              onClick={() => setShowTeamDetails(!showTeamDetails)}
              className="w-full flex items-center justify-between"
            >
              <div className="text-left">
                <p className="font-semibold text-gray-900 dark:text-gray-100">{team.projectTitle}</p>
                <p className="text-sm text-gray-500 mt-0.5">{team.domain} · {team.department} · {team.collegeName} · {team.memberCount} members</p>
              </div>
              {showTeamDetails ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {showTeamDetails && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <p className="text-sm text-gray-600 dark:text-gray-400">{team.projectDescription}</p>
                <p className="text-xs text-gray-500 mt-2">Lab: {team.labName}</p>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* ─── SECTION 2: PREVIOUS ROUND ─── */}
        {team.roundOrder === 1 ? (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center text-sm text-gray-400 border border-gray-200 dark:border-gray-700">
            First round — No previous review data
          </div>
        ) : previousReview ? (
          <Card className="border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Previous Round Scores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-2 text-xs">
                {SCORING_CRITERIA.map(c => (
                  <Badge key={c.key} variant="secondary" className="bg-white dark:bg-gray-800">
                    {c.label.split(' ')[0]}: {previousReview.scores[c.key]}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Composite: {previousReview.compositeScore}</span>
                <Badge className={`${VERDICT_CONFIG[previousReview.verdict].bg} text-xs`} style={{ color: VERDICT_CONFIG[previousReview.verdict].color }}>
                  {VERDICT_CONFIG[previousReview.verdict].label}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* ─── SECTION 3: SUGGESTION CHECKER ─── */}
        {previousReview?.suggestions && previousReview.suggestions.length > 0 && (
          <Card className="border-2 border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Check implementation of Round {team.roundOrder - 1} feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestionStatuses.map((ss, i) => (
                <div key={ss.suggestionId} className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{ss.text}</p>
                  <div className="flex gap-2">
                    {[
                      { val: 'completed' as const, icon: CheckCircle2, label: 'Completed', cls: 'border-green-500 bg-green-50 text-green-700' },
                      { val: 'partial' as const, icon: Zap, label: 'Partial', cls: 'border-amber-500 bg-amber-50 text-amber-700' },
                      { val: 'not_done' as const, icon: XCircle, label: 'Not Done', cls: 'border-red-500 bg-red-50 text-red-700' },
                    ].map(opt => (
                      <button
                        key={opt.val}
                        onClick={() => {
                          const updated = [...suggestionStatuses];
                          updated[i].status = opt.val;
                          setSuggestionStatuses(updated);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all min-h-[44px] ${
                          ss.status === opt.val ? opt.cls : 'border-gray-200 text-gray-400 hover:border-gray-300'
                        }`}
                      >
                        <opt.icon className="w-3.5 h-3.5" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ─── SECTION 4: SCORE INPUTS ─── */}
        <Card className="border border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Scoring</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {SCORING_CRITERIA.map(criterion => (
              <div key={criterion.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">{criterion.label}</Label>
                    <p className="text-xs text-gray-400 mt-0.5">{criterion.guidance}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={scores[criterion.key]}
                      onChange={(e) => updateScore(criterion.key, Math.min(10, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-14 h-9 text-center font-bold text-lg"
                    />
                    <span className="text-xs text-gray-400">/10</span>
                  </div>
                </div>
                <Slider
                  value={[scores[criterion.key]]}
                  onValueChange={(v) => updateScore(criterion.key, Array.isArray(v) ? v[0] : v as number)}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-gray-400 px-0.5">
                  <span>Poor</span>
                  <span>Average</span>
                  <span>Excellent</span>
                </div>
              </div>
            ))}

            {/* Weight summary */}
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Weighted Composite Score</p>
              <p className="text-3xl font-bold text-[#1A56DB]">{compositeScore.toFixed(1)}<span className="text-lg font-normal text-gray-400">/100</span></p>
            </div>
          </CardContent>
        </Card>

        {/* ─── SECTION 5: TEXT FIELDS ─── */}
        <Card className="border border-gray-200 dark:border-gray-800">
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label>Strengths</Label>
              <Textarea
                placeholder="What did the team do well?"
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-gray-400 text-right">{strengths.length} chars</p>
            </div>
            <div className="space-y-2">
              <Label>Weaknesses <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="Areas for improvement (min 10 characters)"
                value={weaknesses}
                onChange={(e) => setWeaknesses(e.target.value)}
                rows={3}
              />
              <p className={`text-xs text-right ${weaknesses.length < 10 && weaknesses.length > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                {weaknesses.length} chars {weaknesses.length < 10 && weaknesses.length > 0 && '(min 10)'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Overall Comments <span className="text-gray-400">(optional)</span></Label>
              <Textarea
                placeholder="Any additional notes..."
                value={overallComments}
                onChange={(e) => setOverallComments(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── SECTION 6: SUGGESTION BUILDER ─── */}
        <Card className="border border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Feedback for Next Round</CardTitle>
              <Button variant="outline" size="sm" onClick={addSuggestion} disabled={suggestions.length >= 5}>
                <Plus className="w-3 h-3 mr-1" />
                Add ({suggestions.length}/5)
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No suggestions yet. Add feedback for the team to implement.
              </p>
            ) : (
              suggestions.map((sug, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <GripVertical className="w-4 h-4 text-gray-300 mt-2.5 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Suggestion text..."
                      value={sug.text}
                      onChange={(e) => {
                        const updated = [...suggestions];
                        updated[i].text = e.target.value;
                        setSuggestions(updated);
                      }}
                    />
                    <Select
                      value={sug.category}
                      onValueChange={(v) => {
                        const updated = [...suggestions];
                        updated[i].category = v || '';
                        setSuggestions(updated);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Technical">Technical</SelectItem>
                        <SelectItem value="Design">Design</SelectItem>
                        <SelectItem value="Business">Business</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeSuggestion(i)} className="text-gray-400 hover:text-red-500 mt-1">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── STICKY FOOTER: VERDICT + ACTIONS ─── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 p-4 z-20 sm:bottom-0">
        <div className="max-w-3xl mx-auto space-y-3">
          {/* Verdict Selection */}
          <div className="flex flex-wrap gap-2">
            {VERDICT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setVerdict(opt.value)}
                className={`flex-1 min-w-[100px] min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                  verdict === opt.value ? opt.color : 'border-gray-200 dark:border-gray-700 text-gray-500 ' + opt.bg
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => handleSubmit(true)}
              disabled={savingDraft}
              className="gap-2"
            >
              {savingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Draft
            </Button>
            <Button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="gap-2 bg-[#1A56DB] hover:bg-[#1044A5] min-w-[160px]"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Review
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
