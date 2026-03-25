'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  { value: 'winner',           label: 'Winner',             icon: '🥇', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'runner_up',        label: 'Runner Up',          icon: '🥈', color: 'bg-gray-100 text-gray-700' },
  { value: 'second_runner_up', label: '2nd Runner Up',      icon: '🥉', color: 'bg-orange-100 text-orange-700' },
  { value: 'finalist',         label: 'Finalist',           icon: '🏅', color: 'bg-blue-100 text-blue-700' },
  { value: 'special_mention',  label: 'Special Mention',    icon: '⭐', color: 'bg-purple-100 text-purple-700' },
  { value: 'participant',      label: 'Participant',        icon: '📋', color: 'bg-gray-100 text-gray-500' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Publish Results</h2>
            <p className="text-xs text-gray-500">Once published, results become read-only</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{assigned.length}</p>
            <p className="text-xs text-gray-500">Awards Assigned</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${unassigned.length > 0 ? 'bg-yellow-50 dark:bg-yellow-950/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
            <p className={`text-2xl font-bold ${unassigned.length > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>{unassigned.length}</p>
            <p className="text-xs text-gray-500">Without Award</p>
          </div>
        </div>

        {unassigned.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800 dark:text-yellow-400">
                {unassigned.length} team(s) have no award assigned. They will be published with no award designation.
              </p>
            </div>
          </div>
        )}

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          This action will publish all results and make them visible. Results will become read-only after publishing.
        </p>

        <div className="flex items-center gap-3 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button onClick={onConfirm} disabled={loading} className="bg-green-600 hover:bg-green-700 gap-2">
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

  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);

  // ─── Load ─────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await apiClient.get(`/events/${eventId}/results`);
      setData(res.data);
      // Initialize drafts from existing results
      const initDrafts: Record<string, RowDraft> = {};
      for (const t of res.data.teams as TeamResult[]) {
        initDrafts[t.teamId] = {
          awardType: (t.result?.awardType ?? '') as AwardType,
          finalPosition: t.result?.finalPosition?.toString() ?? '',
          dirty: false,
          saving: false,
        };
      }
      setDrafts(initDrafts);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed to load results';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  // ─── Update draft ─────────────────────────────────────────
  const updateDraft = (teamId: string, field: keyof Omit<RowDraft, 'dirty' | 'saving'>, value: string) => {
    setDrafts(prev => ({ ...prev, [teamId]: { ...prev[teamId], [field]: value, dirty: true } }));
  };

  // ─── Save single row ──────────────────────────────────────
  const saveRow = async (teamId: string) => {
    const draft = drafts[teamId];
    if (!draft?.dirty) return;
    setDrafts(prev => ({ ...prev, [teamId]: { ...prev[teamId], saving: true } }));
    try {
      const pos = parseInt(draft.finalPosition);
      await apiClient.post(`/events/${eventId}/results`, {
        teamId,
        awardType: draft.awardType || null,
        finalPosition: isNaN(pos) ? null : pos,
      });
      setDrafts(prev => ({ ...prev, [teamId]: { ...prev[teamId], dirty: false, saving: false } }));
      toast.success('Saved');
      load(); // refresh to get updated result id
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Save failed';
      toast.error(msg);
      setDrafts(prev => ({ ...prev, [teamId]: { ...prev[teamId], saving: false } }));
    }
  };

  // ─── Publish ──────────────────────────────────────────────
  const handlePublish = async () => {
    setPublishing(true);
    try {
      await apiClient.post(`/events/${eventId}/results/publish`, { publish: true });
      toast.success('Results published successfully');
      setShowPublishDialog(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Publish failed';
      toast.error(msg);
    } finally { setPublishing(false); }
  };

  // ─── Unpublish (super_admin only) ─────────────────────────
  const handleUnpublish = async () => {
    if (!window.confirm('Unpublish results? This will make results editable again. This action is logged.')) return;
    setUnpublishing(true);
    try {
      await apiClient.post(`/events/${eventId}/results/publish`, { publish: false });
      toast.success('Results unpublished');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Unpublish failed';
      toast.error(msg);
    } finally { setUnpublishing(false); }
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
        <Button onClick={load}>Retry</Button>
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
            loading={publishing}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={() => router.push(`/events/${eventId}`)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />{data.event.eventName}
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Results Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data.teams.length} teams · sorted by average score</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={load}><RefreshCcw className="w-4 h-4" /></Button>
          {!isLocked && (
            <Button
              className="bg-green-600 hover:bg-green-700 gap-2"
              onClick={() => setShowPublishDialog(true)}
              disabled={dirtyCount > 0}
              title={dirtyCount > 0 ? 'Save all pending changes before publishing' : ''}
            >
              <Upload className="w-4 h-4" />Publish Results
            </Button>
          )}
          {isLocked && canUnpublish && (
            <Button variant="outline" className="gap-2 text-red-600 border-red-300 hover:bg-red-50" onClick={handleUnpublish} disabled={unpublishing}>
              {unpublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
              Unpublish
            </Button>
          )}
        </div>
      </div>

      {/* Status banner */}
      {isPublished ? (
        <div className="flex items-center gap-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-700 rounded-xl p-4">
          <Lock className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800 dark:text-green-400">Results Published &amp; Locked</p>
            <p className="text-xs text-green-700/70 dark:text-green-500 mt-0.5">
              All results are publicly visible and read-only.
              {canUnpublish ? ' As super_admin, you can unpublish to make edits.' : ' Contact a super_admin to unpublish.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
          <Eye className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-400">Unpublished — Draft Mode</p>
            <p className="text-xs text-blue-700/70 dark:text-blue-500 mt-0.5">Assign awards and positions, then publish when ready. Teams cannot see results until published.</p>
          </div>
        </div>
      )}

      {/* Unsaved changes warning */}
      {dirtyCount > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 rounded-xl px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800 dark:text-yellow-400">{dirtyCount} unsaved row(s). Save each row before publishing.</p>
        </motion.div>
      )}

      {/* Results table */}
      {data.teams.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No teams found for this event. Import teams first.</p>
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 w-10">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Team</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 w-16">Reviews</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 w-48">Award</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 w-24">Position</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 w-24">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.teams.map((team, idx) => {
                    const draft = drafts[team.teamId];
                    const award = awardLabel(draft?.awardType || team.result?.awardType || null);
                    const rowLocked = isLocked;
                    return (
                      <motion.tr
                        key={team.teamId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className={`border-b border-gray-100 dark:border-gray-800 ${draft?.dirty ? 'bg-blue-50/30 dark:bg-blue-950/10' : ''}`}
                      >
                        <td className="px-4 py-3 text-gray-400 text-xs font-mono">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{team.teamName}</p>
                          <p className="text-xs text-gray-400 truncate max-w-[160px]">{team.projectTitle}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-lg font-bold text-[#1A56DB]">{team.avgScore.toFixed(1)}</span>
                          <p className="text-[10px] text-gray-400">/{10}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500">{team.reviewCount}</td>
                        <td className="px-4 py-3">
                          {rowLocked ? (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${award.color || 'bg-gray-100 text-gray-500'}`}>
                              {award.icon} {award.label}
                            </span>
                          ) : (
                            <Select
                              value={draft?.awardType ?? ''}
                              onValueChange={(v) => updateDraft(team.teamId, 'awardType', v ?? '')}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {AWARD_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                    {opt.icon} {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {rowLocked ? (
                            <span className="text-gray-600 dark:text-gray-400">{team.result?.finalPosition ?? '—'}</span>
                          ) : (
                            <Input
                              type="number"
                              min={1}
                              placeholder="—"
                              value={draft?.finalPosition ?? ''}
                              onChange={(e) => updateDraft(team.teamId, 'finalPosition', e.target.value)}
                              className="h-8 text-xs w-20"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {rowLocked ? (
                            <Lock className="w-4 h-4 text-gray-300" />
                          ) : (
                            <Button
                              size="sm"
                              variant={draft?.dirty ? 'default' : 'ghost'}
                              className={`h-7 text-xs gap-1 ${draft?.dirty ? 'bg-[#1A56DB] hover:bg-[#1044A5]' : ''}`}
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
