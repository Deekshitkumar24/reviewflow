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
  complete: 'bg-green-500/10 text-green-400 border border-green-500/20',
  on_track: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  slow: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  delayed: 'bg-red-500/10 text-red-400 border border-red-500/20',
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
          <h1 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight">
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              <span className="text-xs text-red-400 font-bold uppercase tracking-widest">Live</span>
            </div>
            Monitor
          </h1>
          <p className="text-sm text-gray-400 mt-1">Real-time lab review progress across all labs</p>
        </div>
        <div className="flex items-center gap-2">
          {events.length > 0 && (
            <Select value={eventId} onValueChange={(v) => setEventId(v ?? '')}>
              <SelectTrigger className="w-52 h-9 bg-[#111] border-white/10 text-gray-300 focus:ring-blue-500"><SelectValue placeholder="Select event" /></SelectTrigger>
              <SelectContent className="bg-[#111] border-white/10 text-gray-300">{events.map((e) => <SelectItem key={e.id} value={e.id} className="hover:bg-white/5 focus:bg-white/5 focus:text-white cursor-pointer">{e.eventName}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Button
            variant={polling ? 'default' : 'outline'} size="sm"
            onClick={() => setPolling(!polling)}
            className={`gap-2 ${polling ? 'bg-green-600 hover:bg-green-500 text-white border-0' : 'bg-transparent border-white/10 text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Zap className="w-4 h-4" />{polling ? 'Auto (30s)' : 'Auto-refresh'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchMonitor} disabled={loading} className="bg-transparent border-white/10 text-gray-400 hover:text-white hover:bg-white/5">
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      {data && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Teams', value: data.totalTeams, icon: '👥' },
            { label: 'Checked In', value: data.totalCheckedIn, icon: '✅' },
            { label: 'Reviewed', value: data.totalReviewed, icon: '📋' },
            { label: 'Overall Progress', value: `${data.overallProgress}%`, icon: '📊' },
          ].map(({ label, value, icon }, i) => (
            <Card key={label} className="bg-[#111] border-white/5 card-spotlight">
              <CardContent className="p-5 flex flex-col items-center sm:items-start text-center sm:text-left gap-1">
                <p className="text-2xl mb-1 opacity-80">{icon}</p>
                <p className="text-xs text-gray-400 uppercase tracking-widest">{label}</p>
                <p className="text-3xl font-bold text-white tracking-tighter">{value}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Rounded name */}
      {data?.activeRoundName && (
        <div className="flex items-center gap-2 text-sm text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
          <Activity className="w-4 h-4" />
          Active round: <span className="font-semibold text-white tracking-tight">{data.activeRoundName}</span>
        </div>
      )}

      {/* Lab Cards */}
      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl bg-white/5" />)}
        </div>
      ) : !data || data.labs.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center flex flex-col items-center">
          <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>
            <AlertCircle className="w-12 h-12 text-blue-500 mb-4" />
          </motion.div>
          <p className="text-lg font-medium text-white tracking-tight">No live data found</p>
          <p className="text-sm text-gray-500 mt-1">Select an active event above or wait for data.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.labs.map((lab, i) => {
            const statusColor = STATUS_COLORS[lab.status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.delayed;
            const barColor = BAR_COLORS[lab.status as keyof typeof BAR_COLORS] ?? BAR_COLORS.delayed;
            return (
              <motion.div key={lab.labId} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
                <Card className="h-full bg-[#111] border-white/5 hover:shadow-[0_0_15px_rgba(37,99,235,0.1)] transition-all">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 pr-4">
                        <h3 className="font-bold text-white text-lg tracking-tight truncate">{lab.labName}</h3>
                        {lab.building && <p className="text-sm text-gray-400 truncate">{lab.building}</p>}
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider whitespace-nowrap ${statusColor}`}>
                        {lab.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Progress */}
                    <div className="pt-2 border-t border-white/5">
                      <div className="flex justify-between text-xs text-gray-400 mb-2">
                        <span><span className="text-white font-medium">{lab.reviewed}</span> / {lab.totalTeams} reviewed</span>
                        <span className="font-semibold text-white">{lab.progressPct}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${barColor}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${lab.progressPct}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.04 }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 text-xs">
                      <span className="flex items-center gap-1.5 text-gray-400"><CheckCircle className="w-3.5 h-3.5 text-green-500" /><span className="text-white font-medium">{lab.checkedIn}</span> present</span>
                      <span className="flex items-center gap-1.5 text-gray-400"><Clock className="w-3.5 h-3.5 text-orange-500" /><span className="text-white font-medium">{lab.pending}</span> pending</span>
                    </div>

                    {lab.mentors.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2 truncate"><span className="text-gray-400">Mentors:</span> {lab.mentors.join(', ')}</p>
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
