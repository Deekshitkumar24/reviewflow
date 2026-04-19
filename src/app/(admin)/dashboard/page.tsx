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
  draft: { label: 'Draft', color: 'bg-gray-500/10 text-gray-400' },
  active: { label: 'Active', color: 'bg-green-500/10 text-green-400' },
  completed: { label: 'Completed', color: 'bg-blue-500/10 text-blue-400' },
  archived: { label: 'Archived', color: 'bg-yellow-500/10 text-yellow-400' },
};

import { useQuery } from '@tanstack/react-query';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function AdminDashboardPage() {
  const { data: stats, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const { data } = await apiClient.get('/dashboard/stats');
      return data.data as DashboardStats;
    },
    refetchInterval: 30000,
  });

  const error = queryError 
    ? (queryError as any)?.response?.data?.error?.message ?? 'Failed to load dashboard data' 
    : null;
  const fetchStats = () => refetch();

  const kpis = stats ? [
    { label: 'Total Events', value: stats.totalEvents, sub: `${stats.activeEvents} active`, icon: Calendar, color: 'text-blue-600' },
    { label: 'Total Teams', value: stats.totalTeams, sub: `${stats.checkedInTeams} checked in`, icon: Users, color: 'text-green-600' },
    { label: 'Reviews Submitted', value: stats.totalReviews, sub: `${stats.draftReviews} drafts`, icon: ClipboardList, color: 'text-purple-600' },
    { label: 'Suggestion Compliance', value: `${stats.suggestionCompliance}%`, sub: 'across all rounds', icon: TrendingUp, color: 'text-orange-600' },
  ] : [];

  const mockChartData = [
    { name: 'Mon', reviews: 120, active: 40 },
    { name: 'Tue', reviews: 200, active: 80 },
    { name: 'Wed', reviews: 150, active: 90 },
    { name: 'Thu', reviews: 280, active: 110 },
    { name: 'Fri', reviews: 220, active: 160 },
    { name: 'Sat', reviews: 340, active: 200 },
    { name: 'Sun', reviews: 400, active: 250 },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Real-time event and review activity overview</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading} className="gap-2 bg-[#111] text-white border-white/10 hover:bg-white/5 hover:text-white">
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && !loading && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Failed to load dashboard</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStats} className="ml-auto border-white/10 hover:bg-white/5 bg-transparent">Retry</Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full bg-white/5" /></CardContent></Card>
            ))
          : kpis.map((kpi, i) => (
              <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-gray-400 font-medium">{kpi.label}</p>
                        <p className="text-3xl font-bold text-white mt-2 tracking-tight">{kpi.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{kpi.sub}</p>
                      </div>
                      <div className={`p-2.5 rounded-lg bg-white/5 border border-white/5 ${kpi.color}`}>
                        <kpi.icon className="w-5 h-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
        }
      </div>

      {/* Activity Chart Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="p-1">
          <CardHeader className="pb-6">
            <CardTitle className="text-lg font-semibold text-white">Activity Overview</CardTitle>
            <p className="text-sm text-gray-400">Review frequency and active sessions over the last 7 days.</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="reviews" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, stroke: '#2563EB', strokeWidth: 2, fill: '#111' }} />
                  <Line type="monotone" dataKey="active" stroke="#7C3AED" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, stroke: '#7C3AED', strokeWidth: 2, fill: '#111' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Events */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-white/5">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
              <BarChart2 className="w-4 h-4 text-blue-400" />
              Recent Events
            </CardTitle>
            <Link href="/events" className="text-xs text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-3 py-1.5 rounded-full">View all events</Link>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full bg-white/5" />)}</div>
            ) : stats?.recentEvents.length === 0 ? (
              <div className="text-center py-10 text-gray-600">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40 text-gray-500" />
                <p className="text-sm">No events yet. <Link href="/events/new" className="text-blue-500 hover:text-blue-400 transition-colors">Create your first event</Link></p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {stats?.recentEvents.map((event) => {
                  const s = STATUS_MAP[event.status] ?? STATUS_MAP.draft;
                  return (
                    <Link key={event.id} href={`/events/${event.id}`} className="flex items-center justify-between py-3.5 hover:bg-white/[0.04] -mx-6 px-6 transition-colors group">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-200 group-hover:text-white transition-colors truncate">{event.eventName}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {event.teamCount} teams · {event.roundCount} round{event.roundCount !== 1 ? 's' : ''}
                          {event.eventDate ? ` · ${formatDistanceToNow(new Date(event.eventDate), { addSuffix: true })}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                        {/* Review progress bar */}
                        <div className="hidden sm:flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                              style={{ width: `${event.reviewProgress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 font-medium">{event.reviewProgress}%</span>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border border-white/5 ${s.color}`}>{s.label}</span>
                        {event.status === 'active' && <CheckCircle className="w-4 h-4 text-green-500" />}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
