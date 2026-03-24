'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Calendar, Clock, Users, ClipboardList, Trophy,
  BarChart2, FlaskConical, RefreshCcw, AlertCircle,
  ChevronLeft, Settings, CheckCircle, Lock, Circle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import Link from 'next/link';
import { format } from 'date-fns';

interface RoundStat {
  id: string;
  roundName: string;
  roundOrder: number;
  status: string;
  opensAt: string | null;
  lockedAt: string | null;
  labCount: number;
  mentorCount: number;
  submittedReviews: number;
  teamCount: number;
  progress: number;
}

interface LabStat {
  id: string;
  labName: string;
  building: string | null;
  floor: string | null;
  capacity: number;
  status: string;
  teamCount: number;
  mentorCount: number;
}

interface EventDetail {
  id: string;
  eventName: string;
  organizerName: string;
  description: string | null;
  eventDate: string;
  venue: string;
  eventType: string;
  status: string;
  totalRounds: number;
  suggestionsEnabled: boolean;
  teamCount: number;
  createdBy: { fullName: string; email: string };
  rounds: RoundStat[];
  labs: LabStat[];
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  open: 'bg-green-100 text-green-700',
  locked: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-yellow-100 text-yellow-700',
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchEvent = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/events/${eventId}`);
      setEvent(data.data);
    } catch {
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvent(); }, [eventId]);

  const handleRoundAction = async (roundId: string, action: 'open' | 'locked') => {
    setActionLoading(roundId + action);
    try {
      await apiClient.patch(`/rounds/${roundId}`, { status: action });
      toast.success(`Round ${action === 'open' ? 'opened' : 'locked'} successfully`);
      fetchEvent();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdvanceRound = async (roundId: string) => {
    if (!confirm('Advance eligible teams (verdict: selected or shortlisted) to the next round?')) return;
    setActionLoading(roundId + 'advance');
    try {
      const { data } = await apiClient.post(`/rounds/${roundId}/advance`, {});
      toast.success(data.data.message);
      fetchEvent();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Advance failed');
    } finally {
      setActionLoading(null);
    }
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

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.push('/events')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-2 transition-colors">
            <ChevronLeft className="w-4 h-4" />Events
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{event.eventName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{event.organizerName} · {event.venue}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_BADGE[event.status] ?? STATUS_BADGE.draft}`}>{event.status}</span>
          <Button variant="outline" size="sm" onClick={fetchEvent} disabled={loading}><RefreshCcw className="w-4 h-4" /></Button>
        </div>
      </div>

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
          <TabsTrigger value="teams"><Link href={`/teams?eventId=${event.id}`} className="flex items-center gap-1.5">Teams <Users className="w-3 h-3" /></Link></TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        {/* Rounds Tab */}
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
                      <span>{round.submittedReviews}/{round.teamCount} reviews submitted</span>
                      <span>{round.labCount} lab assignments</span>
                      <span>{round.mentorCount} mentor assignments</span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#1A56DB] rounded-full transition-all" style={{ width: `${round.progress}%` }} />
                      </div>
                      <span className="text-xs text-gray-400">{round.progress}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {round.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => handleRoundAction(round.id, 'open')} disabled={!!actionLoading} className="gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500" /> Open Round
                      </Button>
                    )}
                    {round.status === 'open' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleRoundAction(round.id, 'locked')} disabled={!!actionLoading} className="gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-red-500" /> Lock Round
                        </Button>
                      </>
                    )}
                    {round.status === 'locked' && (
                      <Button size="sm" className="bg-[#1A56DB] hover:bg-[#1044A5] gap-1.5" onClick={() => handleAdvanceRound(round.id)} disabled={!!actionLoading}>
                        Advance Teams →
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Labs Tab */}
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
                      <span>Capacity {lab.capacity}</span>
                    </div>
                    <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full ${lab.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{lab.status}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Overview Tab */}
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
