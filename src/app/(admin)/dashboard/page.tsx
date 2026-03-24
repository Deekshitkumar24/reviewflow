'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, Users, ClipboardList, CheckCircle,
  AlertCircle, TrendingUp, BarChart2, RefreshCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface DashboardStats {
  totalEvents: number;
  activeEvents: number;
  draftEvents: number;
  totalTeams: number;
  checkedInTeams: number;
  totalUsers: number;
  mentorCount: number;
  totalReviews: number;
  draftReviews: number;
  suggestionCompliance: number;
  recentEvents: {
    id: string;
    eventName: string;
    status: string;
    eventDate: string;
    teamCount: number;
    roundCount: number;
    reviewsCompleted: number;
    reviewProgress: number;
  }[];
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  active: { label: 'Active', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  archived: { label: 'Archived', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/dashboard/stats');
      setStats(data.data);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed to load dashboard data';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const kpis = stats ? [
    { label: 'Total Events', value: stats.totalEvents, sub: `${stats.activeEvents} active`, icon: Calendar, color: 'text-blue-600' },
    { label: 'Total Teams', value: stats.totalTeams, sub: `${stats.checkedInTeams} checked in`, icon: Users, color: 'text-green-600' },
    { label: 'Reviews Submitted', value: stats.totalReviews, sub: `${stats.draftReviews} drafts`, icon: ClipboardList, color: 'text-purple-600' },
    { label: 'Suggestion Compliance', value: `${stats.suggestionCompliance}%`, sub: 'across all rounds', icon: TrendingUp, color: 'text-orange-600' },
  ] : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Real-time event and review activity overview</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading} className="gap-2">
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && !loading && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Failed to load dashboard</p>
            <p className="text-sm">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStats} className="ml-auto">Retry</Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))
          : kpis.map((kpi, i) => (
              <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{kpi.label}</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{kpi.value}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{kpi.sub}</p>
                      </div>
                      <div className={`p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 ${kpi.color}`}>
                        <kpi.icon className="w-5 h-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
        }
      </div>

      {/* Recent Events */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-gray-400" />
            Recent Events
          </CardTitle>
          <Link href="/events" className="text-xs text-[#1A56DB] hover:underline">View all →</Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : stats?.recentEvents.length === 0 ? (
            <div className="text-center py-10 text-gray-400 dark:text-gray-600">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No events yet. <Link href="/events/new" className="text-[#1A56DB] hover:underline">Create your first event</Link></p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {stats?.recentEvents.map((event) => {
                const s = STATUS_MAP[event.status] ?? STATUS_MAP.draft;
                return (
                  <Link key={event.id} href={`/events/${event.id}`} className="flex items-center justify-between py-3.5 hover:bg-gray-50 dark:hover:bg-gray-900/50 -mx-6 px-6 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{event.eventName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {event.teamCount} teams · {event.roundCount} round{event.roundCount !== 1 ? 's' : ''}
                        {event.eventDate ? ` · ${formatDistanceToNow(new Date(event.eventDate), { addSuffix: true })}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      {/* Review progress bar */}
                      <div className="hidden sm:flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#1A56DB] rounded-full transition-all"
                            style={{ width: `${event.reviewProgress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{event.reviewProgress}%</span>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                      {event.status === 'active' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
