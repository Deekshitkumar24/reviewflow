'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Trophy, Loader2, CheckCircle2, XCircle,
  Lock, Unlock, Eye, Save, AlertTriangle, RefreshCcw,
  AlertCircle, Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/stores/useAppStore';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────
type AwardType = 'winner' | 'runner_up' | 'second_runner_up' | 'finalist' | 'special_mention' | 'participant' | '';

interface TeamResult {
  teamId: string; teamName: string; projectTitle: string;
  department: string; collegeName: string; domain: string | null;
  avgScore: number; reviewCount: number; highestRound: number;
  result: {
    id: string; finalPosition: number | null;
    awardType: string | null; isPublished: boolean; declaredAt: string | null;
  } | null;
}

interface EventMeta {
  id: string; eventName: string; status: string; totalRounds: number;
}

interface ResultsData {
  event: EventMeta;
  teams: TeamResult[];
  isPublished: boolean;
}

// ─── Award config ────────────────────────────────────────────
const AWARD_OPTIONS: { value: AwardType; label: string; icon: string; color: string }[] = [
  { value: '',                 label: '— No Award —',       icon: '',   color: '' },
  { value: 'winner',           label: 'Winner',             icon: '🥇', color: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
  { value: 'runner_up',        label: 'Runner Up',          icon: '🥈', color: 'bg-gray-400/10 text-gray-300 border border-gray-400/20' },
  { value: 'second_runner_up', label: '2nd Runner Up',      icon: '🥉', color: 'bg-orange-500/10 text-orange-400 border border-orange-500/20' },
  { value: 'finalist',         label: 'Finalist',           icon: '🏅', color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  { value: 'special_mention',  label: 'Special Mention',    icon: '⭐', color: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
  { value: 'participant',      label: 'Participant',        icon: '📋', color: 'bg-white/5 text-gray-400 border border-white/10' },
];

function awardLabel(type: string | null) {
  return AWARD_OPTIONS.find(a => a.value === (type ?? '')) ?? AWARD_OPTIONS[0];
}

// ─── Row draft state ─────────────────────────────────────────
interface RowDraft {
  awardType: AwardType;
  finalPosition: string;
  dirty: boolean;
  saving: boolean;
}

// ─── Publish confirmation dialog ─────────────────────────────
function PublishDialog({
  teams, onConfirm, onCancel, loading,
}: {
  teams: TeamResult[]; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  const assigned = teams.filter(t => t.result?.awardType);
  const unassigned = teams.filter(t => !t.result?.awardType);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#111] rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-white/10"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Publish Results</h2>
            <p className="text-xs text-gray-400">Once published, results become read-only</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{assigned.length}</p>
            <p className="text-xs text-gray-500">Awards Assigned</p>
          </div>
          <div className={`rounded-xl p-3 text-center border ${unassigned.length > 0 ? 'bg-yellow-500/5 border-yellow-500/10' : 'bg-white/5 border-white/5'}`}>
            <p className={`text-2xl font-bold ${unassigned.length > 0 ? 'text-yellow-500' : 'text-gray-500'}`}>{unassigned.length}</p>
            <p className="text-xs text-gray-500">Without Award</p>
          </div>
        </div>

        {unassigned.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-400/90">
                {unassigned.length} team(s) have no award assigned. They will be published with no award designation.
              </p>
            </div>
          </div>
        )}

        <p className="text-sm text-gray-400 mb-4">
          This action will publish all results and make them visible. Results will become read-only after publishing.
        </p>

        <div className="flex items-center gap-3 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={loading} className="bg-transparent border-white/10 text-gray-300 hover:bg-white/5 hover:text-white">Cancel</Button>
          <Button onClick={onConfirm} disabled={loading} className="bg-green-600 hover:bg-green-500 text-white gap-2 border-0">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Publish Results
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────
export default function ResultsManagementPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const router = useRouter();
  const { user } = useAppStore();

  const queryClient = useQueryClient();

  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['results', eventId],
    queryFn: async () => {
      const { data: res } = await apiClient.get(`/events/${eventId}/results`);
      return res.data as ResultsData;
    },
    refetchInterval: 15000,
  });

  const error = queryError ? (queryError as any)?.response?.data?.error?.message ?? 'Failed to load results' : null;

  useEffect(() => {
    if (data?.teams) {
      setDrafts((prev) => {
        const newDrafts = { ...prev };
        for (const t of data.teams) {
          if (!newDrafts[t.teamId] || !newDrafts[t.teamId].dirty) {
            newDrafts[t.teamId] = {
              awardType: (t.result?.awardType ?? '') as AwardType,
              finalPosition: t.result?.finalPosition?.toString() ?? '',
              dirty: false,
              saving: false,
            };
          }
        }
        return newDrafts;
      });
    }
  }, [data]);

  // ─── Update draft ─────────────────────────────────────────
  const updateDraft = (teamId: string, field: keyof Omit<RowDraft, 'dirty' | 'saving'>, value: string) => {
    setDrafts(prev => ({ ...prev, [teamId]: { ...prev[teamId], [field]: value, dirty: true } }));
  };

  // ─── Save single row ──────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async ({ teamId, draft }: { teamId: string, draft: RowDraft }) => {
      const pos = parseInt(draft.finalPosition);
      await apiClient.post(`/events/${eventId}/results`, {
        teamId,
        awardType: draft.awardType || null,
        finalPosition: isNaN(pos) ? null : pos,
      });
      return teamId;
    },
    onMutate: ({ teamId }) => {
      setDrafts(prev => ({ ...prev, [teamId]: { ...prev[teamId], saving: true } }));
    },
    onSuccess: (teamId) => {
      setDrafts(prev => ({ ...prev, [teamId]: { ...prev[teamId], dirty: false, saving: false } }));
      toast.success('Saved');
      queryClient.invalidateQueries({ queryKey: ['results', eventId] });
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['coordinator', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['live-monitor'] });
    },
    onError: (err: any, { teamId }) => {
      const msg = err?.response?.data?.error?.message ?? 'Save failed';
      toast.error(msg);
      setDrafts(prev => ({ ...prev, [teamId]: { ...prev[teamId], saving: false } }));
    }
  });

  const saveRow = (teamId: string) => {
    const draft = drafts[teamId];
    if (!draft?.dirty) return;
    saveMutation.mutate({ teamId, draft });
  };

  // ─── Publish ──────────────────────────────────────────────
  const publishMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      await apiClient.post(`/events/${eventId}/results/publish`, { publish });
      return publish;
    },
    onSuccess: (published) => {
      toast.success(published ? 'Results published successfully' : 'Results unpublished');
      setShowPublishDialog(false);
      queryClient.invalidateQueries({ queryKey: ['results', eventId] });
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['live-monitor'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message ?? 'Action failed';
      toast.error(msg);
    }
  });

  const handlePublish = () => publishMutation.mutate(true);
  const handleUnpublish = () => {
    if (!window.confirm('Unpublish results? This will make results editable again. This action is logged.')) return;
    publishMutation.mutate(false);
  };

  if (loading) return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );

  if (error || !data) return (
    <div className="flex flex-col items-center py-20 text-center">
      <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
      <h2 className="font-semibold text-gray-900 dark:text-gray-100">Failed to load results</h2>
      <p className="text-sm text-gray-500 mt-1">{error}</p>
      <div className="flex gap-2 mt-4">
        <Button variant="outline" onClick={() => router.push('/events')}>Back</Button>
      </div>
    </div>
  );

  const isPublished = data.isPublished;
  const isLocked = isPublished;
  const canUnpublish = user?.role === 'super_admin';
  const dirtyCount = Object.values(drafts).filter(d => d.dirty).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <AnimatePresence>
        {showPublishDialog && (
          <PublishDialog
            teams={data.teams}
            onConfirm={handlePublish}
            onCancel={() => setShowPublishDialog(false)}
            loading={publishMutation.isPending && publishMutation.variables === true}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={() => router.push(`/events/${eventId}`)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-white mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />{data.event.eventName}
          </button>
          <h1 className="text-2xl font-bold text-white tracking-tight">Results Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">{data.teams.length} teams · sorted by average score</p>
        </div>
        <div className="flex items-center gap-2">
          {!isLocked && (
            <Button
              className="bg-green-600 hover:bg-green-500 text-white gap-2 border-0"
              onClick={() => setShowPublishDialog(true)}
              disabled={dirtyCount > 0}
              title={dirtyCount > 0 ? 'Save all pending changes before publishing' : ''}
            >
              <Upload className="w-4 h-4" />Publish Results
            </Button>
          )}
          {isLocked && canUnpublish && (
            <Button variant="outline" className="gap-2 text-red-400 border-red-500/20 bg-red-500/5 hover:bg-red-500/10 hover:text-red-300" onClick={handleUnpublish} disabled={publishMutation.isPending && publishMutation.variables === false}>
              {publishMutation.isPending && publishMutation.variables === false ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
              Unpublish
            </Button>
          )}
        </div>
      </div>

      {/* Status banner */}
      {isPublished ? (
        <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <Lock className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-400">Results Published &amp; Locked</p>
            <p className="text-xs text-green-500 mt-0.5">
              All results are publicly visible and read-only.
              {canUnpublish ? ' As super_admin, you can unpublish to make edits.' : ' Contact a super_admin to unpublish.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <Eye className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-400">Unpublished — Draft Mode</p>
            <p className="text-xs text-blue-500 mt-0.5">Assign awards and positions, then publish when ready. Teams cannot see results until published.</p>
          </div>
        </div>
      )}

      {/* Unsaved changes warning */}
      {dirtyCount > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          <p className="text-sm text-yellow-400">{dirtyCount} unsaved row(s). Save each row before publishing.</p>
        </motion.div>
      )}

      {/* Results table */}
      {data.teams.length === 0 ? (
        <Card className="bg-[#111] border-white/5"><CardContent className="py-16 text-center">
          <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No teams found for this event. Import teams first.</p>
        </CardContent></Card>
      ) : (
        <Card className="bg-[#111] border-white/5 rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-black">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-12 tracking-wide uppercase">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 tracking-wide uppercase">Team</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-48 tracking-wide uppercase">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-16 tracking-wide uppercase">Reviews</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-48 tracking-wide uppercase">Award</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-24 tracking-wide uppercase">Position</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-24 tracking-wide uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.teams.map((team, idx) => {
                    const draft = drafts[team.teamId];
                    const award = awardLabel(draft?.awardType || team.result?.awardType || null);
                    const rowLocked = isLocked;
                    
                    // Leaderboard gold/silver/bronze logic
                    let borderClass = 'border-l-4 border-transparent';
                    if (idx === 0) borderClass = 'border-l-4 border-yellow-500';
                    else if (idx === 1) borderClass = 'border-l-4 border-gray-400';
                    else if (idx === 2) borderClass = 'border-l-4 border-[#B45309]';

                    // Progressive score bar animation
                    const scorePct = (team.avgScore / 10) * 100;

                    return (
                      <motion.tr
                        key={team.teamId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${draft?.dirty ? 'bg-blue-900/10' : ''}`}
                      >
                        <td className={`px-4 py-3 text-xs font-mono font-bold ${borderClass}`}>
                          <span className={idx < 3 ? 'text-blue-400 text-sm' : 'text-gray-500'}>{idx + 1}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-white tracking-tight">{team.teamName}</p>
                          <p className="text-[11px] text-gray-400 truncate max-w-[200px] mt-0.5">{team.projectTitle}</p>
                        </td>
                        <td className="px-4 py-3">
                           <div className="flex items-center gap-3">
                             <div className="w-10">
                               <span className="text-base font-bold text-blue-400">{team.avgScore.toFixed(1)}</span>
                               <span className="text-[10px] text-gray-500 ml-0.5">/10</span>
                             </div>
                             <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden min-w-[60px]">
                               <motion.div 
                                 initial={{ width: 0 }} 
                                 animate={{ width: `${scorePct}%` }} 
                                 transition={{ duration: 1, ease: 'easeOut', delay: idx * 0.05 }}
                                 className="h-full bg-gradient-to-r from-blue-600 to-purple-500 rounded-full" 
                               />
                             </div>
                           </div>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-400">{team.reviewCount}</td>
                        <td className="px-4 py-3">
                          {rowLocked ? (
                            <span className={`text-[11px] px-2 py-1 rounded-full font-medium ${award.color || 'bg-white/5 text-gray-500 border border-white/10'}`}>
                              {award.icon} {award.label}
                            </span>
                          ) : (
                            <Select
                              value={draft?.awardType ?? ''}
                              onValueChange={(v) => updateDraft(team.teamId, 'awardType', v ?? '')}
                            >
                              <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-white focus:ring-blue-500">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#111] border-white/10 text-gray-300">
                                {AWARD_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-xs hover:bg-white/5 focus:bg-white/5 focus:text-white cursor-pointer">
                                    {opt.icon} {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {rowLocked ? (
                            <span className="text-gray-400">{team.result?.finalPosition ?? '—'}</span>
                          ) : (
                            <Input
                              type="number"
                              min={1}
                              placeholder="—"
                              value={draft?.finalPosition ?? ''}
                              onChange={(e) => updateDraft(team.teamId, 'finalPosition', e.target.value)}
                              className="h-8 text-xs w-20 bg-white/5 border-white/10 text-white focus-visible:ring-blue-500"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {rowLocked ? (
                            <Lock className="w-4 h-4 text-gray-600" />
                          ) : (
                            <Button
                              size="sm"
                              variant={draft?.dirty ? 'default' : 'ghost'}
                              className={`h-7 text-xs gap-1 ${draft?.dirty ? 'bg-blue-600 hover:bg-blue-500 text-white border-0' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                              disabled={!draft?.dirty || draft?.saving}
                              onClick={() => saveRow(team.teamId)}
                            >
                              {draft?.saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                              {draft?.saving ? '...' : 'Save'}
                            </Button>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
