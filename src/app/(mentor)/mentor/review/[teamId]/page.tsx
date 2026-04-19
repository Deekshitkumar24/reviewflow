'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Save, Send, ChevronDown, ChevronUp, Info, AlertTriangle, CheckCircle2, XCircle, Zap, Plus, Trash2, GripVertical, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAppStore } from '@/stores/useAppStore';
import apiClient from '@/lib/apiClient';
import { SCORING_CRITERIA, calculateCompositeScore, VERDICT_CONFIG, type ReviewScores, type VerdictType, type SuggestionStatus } from '@/types';

// ─── Interfaces ─────────────────────────────────────────────
interface TeamInfo {
  id: string;
  teamName: string;
  projectTitle: string;
  projectDescription: string | null;
  domain: string | null;
  department: string;
  collegeName: string;
  members: { id: string; fullName: string; isLeader: boolean }[];
  labAssignments: {
    lab: { labName: string };
    round: { roundName: string; roundOrder: number; status: string };
  }[];
  reviews: {
    id: string;
    mentorId: string;
    innovationScore: number;
    technicalScore: number;
    presentationScore: number;
    feasibilityScore: number;
    problemSolvingScore: number;
    communicationScore: number;
    compositeScore: string;
    verdict: string;
    isDraft: boolean;
    round: { roundName: string; roundOrder: number };
    mentor: { fullName: string };
    suggestions: {
      id: string;
      text: string;
      category: string | null;
      orderIndex: number;
      statusLogs: { id: string; status: string; roundId: string; createdAt: string }[];
    }[];
  }[];
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

// ─── Verdict Options ────────────────────────────────────────
const VERDICT_OPTIONS: { value: VerdictType; label: string; color: string; bg: string }[] = [
  { value: 'selected', label: '✅ Selected', color: 'border-green-500 bg-green-50 dark:bg-green-950/20', bg: 'hover:bg-green-100 dark:hover:bg-green-950/30' },
  { value: 'shortlisted', label: '🔵 Shortlisted', color: 'border-blue-500 bg-blue-50 dark:bg-blue-950/20', bg: 'hover:bg-blue-100' },
  { value: 'hold', label: '🟡 Hold', color: 'border-amber-500 bg-amber-50 dark:bg-amber-950/20', bg: 'hover:bg-amber-100' },
  { value: 'needs_improvement', label: '🟣 Needs Improvement', color: 'border-purple-500 bg-purple-50 dark:bg-purple-950/20', bg: 'hover:bg-purple-100' },
  { value: 'not_selected', label: '🔴 Not Selected', color: 'border-red-500 bg-red-50 dark:bg-red-950/20', bg: 'hover:bg-red-100' },
];

// ─── Component ──────────────────────────────────────────────
export default function ReviewFormPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const labId = searchParams.get('labId') ?? '';
  const roundId = searchParams.get('roundId') ?? '';
  const { user } = useAppStore();

  // Data states
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTeamDetails, setShowTeamDetails] = useState(false);

  // Round context
  const [currentRound, setCurrentRound] = useState<{ roundName: string; roundOrder: number; status: string } | null>(null);
  const [currentLabName, setCurrentLabName] = useState<string>('');
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Previous round review data
  const [previousReview, setPreviousReview] = useState<TeamInfo['reviews'][0] | null>(null);
  const [previousSuggestions, setPreviousSuggestions] = useState<{ id: string; text: string; category: string | null }[]>([]);

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

  // Suggestions for this review
  const [suggestions, setSuggestions] = useState<SuggestionDraft[]>([]);

  // Previous suggestion statuses
  // Suggestion Statuses
  const [suggestionStatuses, setSuggestionStatuses] = useState<SuggestionStatusDraft[]>([]);

  const queryClient = useQueryClient();

  const compositeScore = calculateCompositeScore(scores);

  // ─── Load team data + round context + existing review ─────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: teamData } = await apiClient.get(`/teams/${teamId}`);
      const teamInfo: TeamInfo = teamData.data;
      setTeam(teamInfo);

      // Determine current round context from the lab assignment for this round
      const labAssignment = roundId
        ? teamInfo.labAssignments.find((la: TeamInfo['labAssignments'][0]) => la.round.roundOrder === parseInt(roundId) || roundId === la.round.roundOrder.toString())
        : teamInfo.labAssignments.find((la: TeamInfo['labAssignments'][0]) => la.round.status === 'open');

      // If we have a labAssignment, use it; otherwise try to find the open round
      let activeRound: { roundName: string; roundOrder: number; status: string } | null = null;
      let labName = '';

      if (labAssignment) {
        activeRound = labAssignment.round;
        labName = labAssignment.lab.labName;
      } else if (teamInfo.labAssignments.length > 0) {
        // Fall back: use the last assignment
        const last = teamInfo.labAssignments[teamInfo.labAssignments.length - 1];
        activeRound = last.round;
        labName = last.lab.labName;
      }

      setCurrentRound(activeRound);
      setCurrentLabName(labName);

      // Check if round is locked or completed → read-only
      const readOnly = activeRound ? (activeRound.status === 'locked' || activeRound.status === 'completed') : false;
      setIsReadOnly(readOnly);

      // Find previous round review (from any mentor, for context)
      if (activeRound && activeRound.roundOrder > 1) {
        const prevRoundReview = teamInfo.reviews.find(
          (r: TeamInfo['reviews'][0]) => r.round.roundOrder === activeRound!.roundOrder - 1 && !r.isDraft
        );
        if (prevRoundReview) {
          setPreviousReview(prevRoundReview);
          // Extract suggestions from previous round for verification
          if (prevRoundReview.suggestions && prevRoundReview.suggestions.length > 0) {
            setPreviousSuggestions(prevRoundReview.suggestions);
            setSuggestionStatuses(
              prevRoundReview.suggestions.map((s: TeamInfo['reviews'][0]['suggestions'][0]) => ({
                suggestionId: s.id,
                text: s.text,
                // Check if already verified in this round
                status: (s.statusLogs?.find((l: { roundId: string }) => {
                  // We need to match by the CURRENT round, not previous
                  return true; // Will show unset by default
                })?.status as SuggestionStatus) || '' as SuggestionStatus | '',
              }))
            );
          }
        }
      }

      // Check for existing draft by this mentor for this round
      if (user && activeRound) {
        try {
          const { data: draftData } = await apiClient.get(
            `/reviews?teamId=${teamId}&mentorId=${user.id}&isDraft=true&limit=1`
          );
          const drafts = draftData.data ?? [];
          if (drafts.length > 0) {
            // Load full draft detail from team reviews
            const draftReview = teamInfo.reviews.find(
              (r: TeamInfo['reviews'][0]) => r.isDraft && r.mentorId === user.id
            );
            if (draftReview) {
              setScores({
                innovationScore: draftReview.innovationScore,
                technicalScore: draftReview.technicalScore,
                presentationScore: draftReview.presentationScore,
                feasibilityScore: draftReview.feasibilityScore,
                problemSolvingScore: draftReview.problemSolvingScore,
                communicationScore: draftReview.communicationScore,
              });
              setVerdict((draftReview.verdict as VerdictType) || '');
              if (draftReview.suggestions.length > 0) {
                setSuggestions(
                  draftReview.suggestions.map((s: TeamInfo['reviews'][0]['suggestions'][0]) => ({
                    text: s.text,
                    category: s.category || 'Technical',
                    orderIndex: s.orderIndex,
                  }))
                );
              }
              toast.info('Draft review restored', { duration: 3000 });
            }
          }
        } catch {
          // No draft found — that's fine
        }
      }

      // Check if this mentor already submitted a final review for this round
      if (user && activeRound) {
        const existingFinal = teamInfo.reviews.find(
          (r: TeamInfo['reviews'][0]) =>
            !r.isDraft &&
            r.mentorId === user.id &&
            r.round.roundOrder === activeRound!.roundOrder
        );
        if (existingFinal) {
          // Pre-fill for read-only display
          setScores({
            innovationScore: existingFinal.innovationScore,
            technicalScore: existingFinal.technicalScore,
            presentationScore: existingFinal.presentationScore,
            feasibilityScore: existingFinal.feasibilityScore,
            problemSolvingScore: existingFinal.problemSolvingScore,
            communicationScore: existingFinal.communicationScore,
          });
          setVerdict((existingFinal.verdict as VerdictType) || '');
          setIsReadOnly(true);
          toast.info('You have already submitted a final review for this team in this round.', { duration: 5000 });
        }
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed to load team data';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [teamId, roundId, user]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Score update ─────────────────────────────────────────
  const updateScore = (key: keyof ReviewScores, value: number) => {
    if (isReadOnly) return;
    setScores(prev => ({ ...prev, [key]: value }));
  };

  const addSuggestion = () => {
    if (suggestions.length >= 5 || isReadOnly) return;
    setSuggestions([...suggestions, { text: '', category: 'Technical', orderIndex: suggestions.length }]);
  };

  const removeSuggestion = (index: number) => {
    if (isReadOnly) return;
    setSuggestions(suggestions.filter((_, i) => i !== index));
  };

  const submitMutation = useMutation({
    mutationFn: async ({ payload, isDraft }: { payload: any, isDraft: boolean }) => {
      const res = await apiClient.post('/reviews', payload);
      return { data: res.data, isDraft };
    },
    onSuccess: ({ data, isDraft }) => {
      toast.success(isDraft ? 'Draft saved successfully' : 'Review submitted successfully!');
      
      // Target invalidations
      queryClient.invalidateQueries({ queryKey: ['mentor-lab-queue'] });
      queryClient.invalidateQueries({ queryKey: ['mentor', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['student-evaluation'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['coordinator', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['live-monitor'] });

      if (!isDraft) {
        router.back();
      }
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error?.message ?? 'Failed to submit review';
      toast.error(message);
    }
  });

  // ─── Submit handler (real API) ────────────────────────────
  const handleSubmit = async (isDraft: boolean) => {
    if (isReadOnly) {
      toast.error('This round is locked. Reviews cannot be edited.');
      return;
    }

    if (!currentRound) {
      toast.error('No active round found for this team.');
      return;
    }

    // Validation for final submission
    if (!isDraft) {
      if (!verdict) { toast.error('Please select a verdict'); return; }
      const hasZeroScore = Object.values(scores).some(s => s === 0);
      if (hasZeroScore) { toast.error('All scores must be at least 1'); return; }
      if (weaknesses.length < 10) { toast.error('Weaknesses must be at least 10 characters'); return; }
      if (previousSuggestions.length > 0) {
        const unmarked = suggestionStatuses.some(s => !s.status);
        if (unmarked) { toast.error('Please mark all previous suggestions before submitting'); return; }
      }
    }

    let actualRoundId = roundId;
    if (team?.labAssignments && currentRound) {
      const la = team.labAssignments.find(
        (a: TeamInfo['labAssignments'][0]) => a.round.roundOrder === currentRound.roundOrder
      );
    }

    if (!actualRoundId) {
      toast.error('Missing round context. Please navigate from your lab queue.');
      return;
    }

    const payload = {
      teamId,
      roundId: actualRoundId,
      scores,
      strengths: strengths || undefined,
      weaknesses: weaknesses || 'N/A',
      overallComments: overallComments || undefined,
      verdict: verdict || 'hold',
      isDraft,
      suggestions: suggestions.filter(s => s.text.trim().length > 0).map((s, i) => ({
        text: s.text.trim(),
        category: s.category,
        orderIndex: i,
      })),
      suggestionStatuses: !isDraft && previousSuggestions.length > 0
        ? suggestionStatuses
            .filter(s => s.status)
            .map(s => ({
              suggestionId: s.suggestionId,
              status: s.status as SuggestionStatus,
            }))
        : undefined,
    };

    submitMutation.mutate({ payload, isDraft });
  };

  // ─── Loading state ────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-5 mt-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────
  if (error || !team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <XCircle className="w-10 h-10 text-red-400 mb-3" />
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Failed to load team</h2>
        <p className="text-sm text-gray-500 mb-4">{error || 'Team not found'}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
          <Button onClick={loadData}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative pb-32">
      {/* ─── READ-ONLY BANNER ─── */}
      {isReadOnly && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm text-amber-800 dark:text-amber-400 max-w-3xl mx-auto">
          <Lock className="w-4 h-4 flex-shrink-0" />
          <span>This round is locked or you have already submitted. Review is read-only.</span>
        </div>
      )}

      {/* ─── STICKY HEADER ─── */}
      <div className="sticky top-14 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 -mx-4 px-4 py-3">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-gray-900 dark:text-gray-100 text-base">{team.teamName}</h1>
              <p className="text-xs text-gray-500">
                {currentRound?.roundName ?? 'Unknown Round'} · {currentLabName || 'No lab'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isReadOnly && <Lock className="w-4 h-4 text-amber-500" />}
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
                <p className="text-sm text-gray-500 mt-0.5">
                  {team.domain ?? 'General'} · {team.department} · {team.collegeName} · {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                </p>
              </div>
              {showTeamDetails ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {showTeamDetails && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                {team.projectDescription && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{team.projectDescription}</p>
                )}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500">Team Members</p>
                  {team.members.map(m => (
                    <p key={m.id} className="text-sm text-gray-700 dark:text-gray-300">
                      {m.fullName} {m.isLeader && <Badge variant="secondary" className="text-[9px] ml-1">Leader</Badge>}
                    </p>
                  ))}
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* ─── SECTION 2: PREVIOUS ROUND REVIEW ─── */}
        {currentRound && currentRound.roundOrder === 1 ? (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center text-sm text-gray-400 border border-gray-200 dark:border-gray-700">
            First round — No previous review data
          </div>
        ) : previousReview ? (
          <Card className="border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Previous Round: {previousReview.round.roundName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-2 text-xs">
                {SCORING_CRITERIA.map(c => (
                  <Badge key={c.key} variant="secondary" className="bg-white dark:bg-gray-800">
                    {c.label.split(' ')[0]}: {previousReview[c.key as keyof typeof previousReview] as number}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Composite: {parseFloat(previousReview.compositeScore).toFixed(1)}</span>
                <Badge
                  className="text-xs"
                  style={{
                    backgroundColor: VERDICT_CONFIG[previousReview.verdict as keyof typeof VERDICT_CONFIG]?.bg ?? '#F9FAFB',
                    color: VERDICT_CONFIG[previousReview.verdict as keyof typeof VERDICT_CONFIG]?.color ?? '#6B7280',
                  }}
                >
                  {VERDICT_CONFIG[previousReview.verdict as keyof typeof VERDICT_CONFIG]?.label ?? previousReview.verdict}
                </Badge>
                <span className="text-xs text-gray-400">by {previousReview.mentor.fullName}</span>
              </div>
            </CardContent>
          </Card>
        ) : currentRound && currentRound.roundOrder > 1 ? (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center text-sm text-gray-400 border border-gray-200 dark:border-gray-700">
            No previous round review found for this team
          </div>
        ) : null}

        {/* ─── SECTION 3: SUGGESTION CHECKER ─── */}
        {previousSuggestions.length > 0 && (
          <Card className="border-2 border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Verify Round {(currentRound?.roundOrder ?? 2) - 1} Suggestions ({previousSuggestions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestionStatuses.map((ss, i) => (
                <div key={ss.suggestionId} className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{ss.text}</p>
                  <div className="flex gap-2">
                    {([
                      { val: 'completed' as const, icon: CheckCircle2, label: 'Completed', cls: 'border-green-500 bg-green-50 text-green-700' },
                      { val: 'partial' as const, icon: Zap, label: 'Partial', cls: 'border-amber-500 bg-amber-50 text-amber-700' },
                      { val: 'not_done' as const, icon: XCircle, label: 'Not Done', cls: 'border-red-500 bg-red-50 text-red-700' },
                    ]).map(opt => (
                      <button
                        key={opt.val}
                        disabled={isReadOnly}
                        onClick={() => {
                          const updated = [...suggestionStatuses];
                          updated[i].status = opt.val;
                          setSuggestionStatuses(updated);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all min-h-[44px] ${
                          ss.status === opt.val ? opt.cls : 'border-gray-200 text-gray-400 hover:border-gray-300'
                        } ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
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
                      disabled={isReadOnly}
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
                  disabled={isReadOnly}
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
                disabled={isReadOnly}
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
                disabled={isReadOnly}
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
                disabled={isReadOnly}
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── SECTION 6: SUGGESTION BUILDER ─── */}
        <Card className="border border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Feedback for Next Round</CardTitle>
              {!isReadOnly && (
                <Button variant="outline" size="sm" onClick={addSuggestion} disabled={suggestions.length >= 5}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add ({suggestions.length}/5)
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No suggestions yet. {!isReadOnly && 'Add feedback for the team to implement.'}
              </p>
            ) : (
              suggestions.map((sug, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <GripVertical className="w-4 h-4 text-gray-300 mt-2.5 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Suggestion text..."
                      value={sug.text}
                      disabled={isReadOnly}
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
                      disabled={isReadOnly}
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
                  {!isReadOnly && (
                    <Button variant="ghost" size="icon" onClick={() => removeSuggestion(i)} className="text-gray-400 hover:text-red-500 mt-1">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
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
                disabled={isReadOnly}
                onClick={() => setVerdict(opt.value)}
                className={`flex-1 min-w-[100px] min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                  verdict === opt.value ? opt.color : 'border-gray-200 dark:border-gray-700 text-gray-500 ' + opt.bg
                } ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            {isReadOnly ? (
              <p className="text-sm text-amber-600 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />Read-only — Round is locked or review already submitted
              </p>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSubmit(true)}
                  disabled={submitMutation.isPending}
                  className="gap-2"
                >
                  {submitMutation.isPending && submitMutation.variables?.isDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Draft
                </Button>
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={submitMutation.isPending}
                  className="gap-2 bg-[#1A56DB] hover:bg-[#1044A5] min-w-[160px]"
                >
                  {submitMutation.isPending && !submitMutation.variables?.isDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Review
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
