'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Users, FlaskConical, RefreshCcw, AlertCircle,
  ChevronLeft, CheckCircle, Lock, Circle, Play, Archive,
  CheckCircle2, Trophy, Loader2, AlertTriangle, XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/stores/useAppStore';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import Link from 'next/link';
import { format } from 'date-fns';

// ─── Types ──────────────────────────────────────────────────
interface RoundStat {
  id: string; roundName: string; roundOrder: number; status: string;
  opensAt: string | null; lockedAt: string | null;
  labCount: number; mentorCount: number; submittedReviews: number;
  teamCount: number; progress: number;
}
interface LabStat {
  id: string; labName: string; building: string | null; floor: string | null;
  capacity: number; status: string; teamCount: number; mentorCount: number;
}
interface EventDetail {
  id: string; eventName: string; organizerName: string; description: string | null;
  eventDate: string; venue: string; eventType: string; status: string;
  totalRounds: number; suggestionsEnabled: boolean; teamCount: number;
  createdBy: { fullName: string; email: string };
  rounds: RoundStat[]; labs: LabStat[];
}

// ─── Status helpers ──────────────────────────────────────────
const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-gray-100 text-gray-600',
  open:      'bg-green-100 text-green-700',
  locked:    'bg-red-100 text-red-700',
  draft:     'bg-gray-100 text-gray-600',
  active:    'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  archived:  'bg-yellow-100 text-yellow-700',
};

// ─── Lifecycle config ────────────────────────────────────────
const LIFECYCLE_ACTIONS: Record<string, {
  next: string; label: string; icon: React.ElementType;
  color: string; description: string;
  warning?: string;
}> = {
  draft: {
    next: 'active', label: 'Activate Event', icon: Play,
    color: 'bg-green-600 hover:bg-green-700 text-white',
    description: 'Activate this event to allow check-ins, lab assignments, and judge submissions. Requires at least one round and one team.',
  },
  active: {
    next: 'completed', label: 'Mark as Completed', icon: CheckCircle2,
    color: 'bg-blue-600 hover:bg-blue-700 text-white',
    description: 'Mark this event as completed. All rounds should be locked and reviews finalised.',
    warning: 'Open rounds or draft reviews will block completion unless you override.',
  },
};
const ARCHIVE_ACTION = {
  next: 'archived', label: 'Archive Event', icon: Archive,
  color: 'bg-yellow-600 hover:bg-yellow-700 text-white',
  description: 'Archive this event. It will become read-only. Results must be published separately.',
};

// ─── Confirmation Dialog ─────────────────────────────────────
function ConfirmDialog({
  title, description, warning, confirmLabel, confirmClass,
  loading, onConfirm, onCancel, showForce, force, onForceChange,
}: {
  title: string; description: string; warning?: string; confirmLabel: string;
  confirmClass: string; loading: boolean;
  onConfirm: () => void; onCancel: () => void;
  showForce?: boolean; force?: boolean; onForceChange?: (v: boolean) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700"
      >
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>
        {warning && (
          <div className="flex items-start gap-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mb-4">
            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800 dark:text-yellow-400">{warning}</p>
          </div>
        )}
        {showForce && (
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={force}
              onChange={(e) => onForceChange?.(e.target.checked)}
              className="rounded"
            />
            Override validation — proceed even if rounds or reviews are incomplete
          </label>
        )}
        <div className="flex items-center gap-3 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button onClick={onConfirm} disabled={loading} className={confirmClass}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────
export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAppStore();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Lifecycle dialog state
  const [dialog, setDialog] = useState<{ type: 'activate' | 'complete' | 'archive' } | null>(null);
  const [forceComplete, setForceComplete] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);

  const fetchEvent = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/events/${eventId}`);
      setEvent(data.data);
    } catch { toast.error('Failed to load event'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvent(); }, [eventId]);

  // ─── Round actions ────────────────────────────────────────
  const handleRoundAction = async (roundId: string, action: 'open' | 'locked') => {
    setActionLoading(roundId + action);
    try {
      await apiClient.patch(`/rounds/${roundId}`, { status: action });
      toast.success(`Round ${action === 'open' ? 'opened' : 'locked'} successfully`);
      fetchEvent();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Action failed');
    } finally { setActionLoading(null); }
  };

  const handleAdvanceRound = async (roundId: string) => {
    if (!window.confirm('Advance eligible teams (verdict: selected or shortlisted) to the next round?')) return;
    setActionLoading(roundId + 'advance');
    try {
      const { data } = await apiClient.post(`/rounds/${roundId}/advance`, {});
      toast.success(data.data.message);
      fetchEvent();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Advance failed');
    } finally { setActionLoading(null); }
  };

  // ─── Lifecycle action ─────────────────────────────────────
  const confirmStatus = async (newStatus: string, force = false) => {
    setDialogLoading(true);
    setLifecycleError(null);
    try {
      await apiClient.patch(`/events/${eventId}/status`, { status: newStatus, force });
      toast.success(`Event ${newStatus} successfully`);
      setDialog(null);
      fetchEvent();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Status change failed';
      setLifecycleError(msg);
    } finally { setDialogLoading(false); }
  };

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (!event) return (
    <div className="flex flex-col items-center py-20 text-center">
      <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
      <h2 className="font-semibold text-gray-900 dark:text-gray-100">Event not found</h2>
      <Button variant="outline" className="mt-4" onClick={() => router.push('/events')}>Back to Events</Button>
    </div>
  );

  const isArchived = event.status === 'archived';
  const primaryAction = LIFECYCLE_ACTIONS[event.status];
  const canArchive = ['active', 'completed'].includes(event.status);

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {dialog && (
          <ConfirmDialog
            title={
              dialog.type === 'activate' ? 'Activate Event' :
              dialog.type === 'complete' ? 'Mark Event as Completed' : 'Archive Event'
            }
            description={
              dialog.type === 'activate' ? LIFECYCLE_ACTIONS.draft.description :
              dialog.type === 'complete' ? LIFECYCLE_ACTIONS.active.description :
              ARCHIVE_ACTION.description
            }
            warning={dialog.type === 'complete' ? LIFECYCLE_ACTIONS.active.warning : undefined}
            showForce={dialog.type === 'complete'}
            force={forceComplete}
            onForceChange={setForceComplete}
            confirmLabel={
              dialog.type === 'activate' ? 'Activate' :
              dialog.type === 'complete' ? 'Mark Completed' : 'Archive'
            }
            confirmClass={
              dialog.type === 'activate' ? 'bg-green-600 hover:bg-green-700' :
              dialog.type === 'complete' ? 'bg-blue-600 hover:bg-blue-700' :
              'bg-yellow-600 hover:bg-yellow-700'
            }
            loading={dialogLoading}
            onCancel={() => { setDialog(null); setLifecycleError(null); setForceComplete(false); }}
            onConfirm={() => confirmStatus(
              dialog.type === 'activate' ? 'active' :
              dialog.type === 'complete' ? 'completed' : 'archived',
              dialog.type === 'complete' ? forceComplete : false
            )}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={() => router.push('/events')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-2 transition-colors">
            <ChevronLeft className="w-4 h-4" />Events
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{event.eventName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{event.organizerName} · {event.venue}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_BADGE[event.status] ?? STATUS_BADGE.draft}`}>{event.status}</span>
          <Button variant="outline" size="sm" onClick={fetchEvent} disabled={loading}><RefreshCcw className="w-4 h-4" /></Button>
          {/* Results link for completed/active */}
          {(event.status === 'completed' || event.status === 'active') && (
            <Button variant="outline" size="sm" onClick={() => router.push(`/results/${event.id}`)} className="gap-1.5">
              <Trophy className="w-4 h-4" />Results
            </Button>
          )}
        </div>
      </div>

      {/* Lifecycle error banner */}
      {lifecycleError && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-start gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-700 rounded-xl p-4"
        >
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Action Failed</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{lifecycleError}</p>
          </div>
          <button onClick={() => setLifecycleError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <XCircle className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Lifecycle Actions Card */}
      {!isArchived && (
        <Card className="border-2 border-dashed border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Event Lifecycle</p>
                <p className="text-xs text-gray-500 mt-0.5">Current status: <span className="font-semibold capitalize">{event.status}</span></p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {primaryAction && (
                  <Button
                    className={`gap-1.5 ${primaryAction.color}`}
                    size="sm"
                    onClick={() => setDialog({ type: event.status === 'draft' ? 'activate' : 'complete' })}
                  >
                    <primaryAction.icon className="w-4 h-4" />
                    {primaryAction.label}
                  </Button>
                )}
                {canArchive && (
                  <Button
                    className={`gap-1.5 ${ARCHIVE_ACTION.color}`}
                    size="sm"
                    variant="outline"
                    onClick={() => setDialog({ type: 'archive' })}
                  >
                    <Archive className="w-4 h-4" />
                    Archive
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Archived banner */}
      {isArchived && (
        <div className="flex items-center gap-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4">
          <Archive className="w-5 h-5 text-yellow-600" />
          <p className="text-sm text-yellow-800 dark:text-yellow-400">This event is archived and is read-only.</p>
        </div>
      )}

      {/* KPI summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Teams', value: event.teamCount, icon: Users },
          { label: 'Rounds', value: event.totalRounds, icon: Circle },
          { label: 'Labs', value: event.labs.length, icon: FlaskConical },
          { label: 'Event Date', value: format(new Date(event.eventDate), 'MMM d, yyyy'), icon: Calendar },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}><CardContent className="p-4 flex items-center gap-3">
            <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div><p className="text-xs text-gray-400">{label}</p><p className="font-semibold text-gray-900 dark:text-gray-100">{value}</p></div>
          </CardContent></Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rounds" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rounds">Rounds</TabsTrigger>
          <TabsTrigger value="labs">Labs</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        {/* Rounds */}
        <TabsContent value="rounds" className="space-y-3">
          {event.rounds.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-gray-400">No rounds configured for this event.</CardContent></Card>
          ) : event.rounds.map((round) => (
            <Card key={round.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{round.roundName}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_BADGE[round.status] ?? STATUS_BADGE.pending}`}>{round.status}</span>
                    </div>
                    <div className="text-xs text-gray-400 space-x-3">
                      <span>{round.submittedReviews}/{round.teamCount} reviews</span>
                      <span>{round.labCount} labs</span>
                      <span>{round.mentorCount} mentors</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#1A56DB] rounded-full transition-all" style={{ width: `${round.progress}%` }} />
                      </div>
                      <span className="text-xs text-gray-400">{round.progress}%</span>
                    </div>
                  </div>
                  {!isArchived && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {round.status === 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => handleRoundAction(round.id, 'open')} disabled={!!actionLoading} className="gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />Open
                        </Button>
                      )}
                      {round.status === 'open' && (
                        <Button size="sm" variant="outline" onClick={() => handleRoundAction(round.id, 'locked')} disabled={!!actionLoading} className="gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-red-500" />Lock
                        </Button>
                      )}
                      {round.status === 'locked' && (
                        <Button size="sm" className="bg-[#1A56DB] hover:bg-[#1044A5] gap-1.5" onClick={() => handleAdvanceRound(round.id)} disabled={!!actionLoading}>
                          Advance →
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Labs */}
        <TabsContent value="labs" className="space-y-3">
          <div className="flex justify-end">
            <Link href={`/labs?eventId=${event.id}`}>
              <Button size="sm" variant="outline">Manage Labs →</Button>
            </Link>
          </div>
          {event.labs.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-gray-400">No labs configured. <Link href={`/labs?eventId=${event.id}`} className="text-[#1A56DB] hover:underline">Add labs →</Link></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {event.labs.map((lab) => (
                <Card key={lab.id}>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{lab.labName}</h3>
                    {lab.building && <p className="text-xs text-gray-400">{lab.building}{lab.floor ? `, Floor ${lab.floor}` : ''}</p>}
                    <div className="flex gap-4 text-xs text-gray-400 mt-2">
                      <span>{lab.teamCount} teams</span>
                      <span>{lab.mentorCount} mentors</span>
                      <span>Cap. {lab.capacity}</span>
                    </div>
                    <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full ${lab.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{lab.status}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Overview */}
        <TabsContent value="overview">
          <Card><CardContent className="p-6 space-y-3 text-sm">
            {event.description && <p className="text-gray-600 dark:text-gray-400">{event.description}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-400">Event Type</p><p className="font-medium text-gray-900 dark:text-gray-100 capitalize">{event.eventType.replace('_', ' ')}</p></div>
              <div><p className="text-xs text-gray-400">Suggestions</p><p className="font-medium text-gray-900 dark:text-gray-100">{event.suggestionsEnabled ? 'Enabled' : 'Disabled'}</p></div>
              <div><p className="text-xs text-gray-400">Created By</p><p className="font-medium text-gray-900 dark:text-gray-100">{event.createdBy.fullName}</p></div>
              <div><p className="text-xs text-gray-400">Event Date</p><p className="font-medium text-gray-900 dark:text-gray-100">{format(new Date(event.eventDate), 'MMMM d, yyyy')}</p></div>
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
