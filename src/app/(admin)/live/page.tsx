'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, RefreshCcw, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';

interface LabStat {
  labId: string;
  labName: string;
  building: string | null;
  status: string;
  progressPct: number;
  totalTeams: number;
  reviewed: number;
  pending: number;
  checkedIn: number;
  mentors: string[];
}

interface MonitorData {
  eventId: string | null;
  activeRoundId: string | null;
  activeRoundName: string | null;
  totalTeams: number;
  totalReviewed: number;
  totalCheckedIn: number;
  totalPending: number;
  overallProgress: number;
  labs: LabStat[];
}

interface EventOption { id: string; eventName: string; status: string; }

const STATUS_COLORS = {
  complete: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  on_track: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  slow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  delayed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const BAR_COLORS = {
  complete: 'bg-green-500',
  on_track: 'bg-blue-500',
  slow: 'bg-yellow-500',
  delayed: 'bg-red-500',
};

export default function LiveMonitorPage() {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState('');
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    apiClient.get('/events?status=active&limit=20').then(({ data }) => {
      setEvents(data.data ?? []);
      if (data.data?.[0]) setEventId(data.data[0].id);
    });
  }, []);

  const fetchMonitor = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const { data: res } = await apiClient.get(`/live-monitor?eventId=${eventId}`);
      setData(res.data);
    } catch { toast.error('Failed to load monitor data'); }
    finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => {
    fetchMonitor();
    if (pollTimer.current) clearInterval(pollTimer.current);
    if (polling) {
      pollTimer.current = setInterval(fetchMonitor, 30000);
    }
    return () => clearInterval(pollTimer.current);
  }, [eventId, fetchMonitor, polling]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#1A56DB]" />Live Monitor
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time lab review progress across all labs</p>
        </div>
        <div className="flex items-center gap-2">
          {events.length > 0 && (
            <Select value={eventId} onValueChange={(v) => setEventId(v ?? '')}>
              <SelectTrigger className="w-52 h-9"><SelectValue placeholder="Select event" /></SelectTrigger>
              <SelectContent>{events.map((e) => <SelectItem key={e.id} value={e.id}>{e.eventName}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Button
            variant={polling ? 'default' : 'outline'} size="sm"
            onClick={() => setPolling(!polling)}
            className={`gap-2 ${polling ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
          >
            <Zap className="w-4 h-4" />{polling ? 'Auto (30s)' : 'Auto-refresh'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchMonitor} disabled={loading}>
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Teams', value: data.totalTeams, icon: '👥' },
            { label: 'Checked In', value: data.totalCheckedIn, icon: '✅' },
            { label: 'Reviewed', value: data.totalReviewed, icon: '📋' },
            { label: 'Overall Progress', value: `${data.overallProgress}%`, icon: '📊' },
          ].map(({ label, value, icon }) => (
            <Card key={label}><CardContent className="p-4">
              <p className="text-2xl">{icon}</p>
              <p className="text-xs text-gray-400 mt-1">{label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
            </CardContent></Card>
          ))}
        </div>
      )}

      {/* Rounded name */}
      {data?.activeRoundName && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-lg px-4 py-2">
          <Activity className="w-4 h-4 text-blue-500" />
          Active round: <span className="font-medium text-blue-700 dark:text-blue-400">{data.activeRoundName}</span>
        </div>
      )}

      {/* Lab Cards */}
      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : !data || data.labs.length === 0 ? (
        <Card><CardContent className="py-14 text-center text-gray-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No labs or no active event found. Select an active event above.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.labs.map((lab, i) => {
            const statusColor = STATUS_COLORS[lab.status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.delayed;
            const barColor = BAR_COLORS[lab.status as keyof typeof BAR_COLORS] ?? BAR_COLORS.delayed;
            return (
              <motion.div key={lab.labId} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
                <Card className="h-full">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{lab.labName}</h3>
                        {lab.building && <p className="text-xs text-gray-400">{lab.building}</p>}
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColor}`}>
                        {lab.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{lab.reviewed}/{lab.totalTeams} reviewed</span>
                        <span>{lab.progressPct}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${barColor}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${lab.progressPct}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.04 }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" />{lab.checkedIn} present</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-orange-400" />{lab.pending} pending</span>
                    </div>

                    {lab.mentors.length > 0 && (
                      <p className="text-xs text-gray-400">Mentors: {lab.mentors.join(', ')}</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
