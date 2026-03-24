'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Users,
  FlaskConical,
  ClipboardList,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/stores/useAppStore';
import apiClient from '@/lib/apiClient';

interface DashboardStats {
  totalEvents: number;
  activeEvents: number;
  totalTeams: number;
  totalMentors: number;
  totalReviews: number;
  pendingReviews: number;
  recentEvents: {
    id: string;
    eventName: string;
    status: string;
    eventDate: string;
    teamCount: number;
    reviewProgress: number;
  }[];
}

const KPI_CARDS = [
  { key: 'activeEvents', label: 'Active Events', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { key: 'totalTeams', label: 'Total Teams', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { key: 'totalReviews', label: 'Reviews Done', icon: ClipboardList, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
  { key: 'pendingReviews', label: 'Pending Reviews', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAppStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated dashboard data — replace with API call
    const timer = setTimeout(() => {
      setStats({
        totalEvents: 3,
        activeEvents: 1,
        totalTeams: 20,
        totalMentors: 2,
        totalReviews: 8,
        pendingReviews: 12,
        recentEvents: [
          {
            id: '1',
            eventName: 'Tech Expo 2026',
            status: 'active',
            eventDate: '2026-04-15',
            teamCount: 20,
            reviewProgress: 40,
          },
        ],
      });
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400';
      case 'draft': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
      case 'completed': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Welcome back, {user?.fullName}
          </p>
        </div>
        <Button onClick={() => router.push('/events/new')} className="bg-[#1A56DB] hover:bg-[#1044A5]">
          <Plus className="w-4 h-4 mr-2" />
          New Event
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map((kpi, i) => (
          <motion.div
            key={kpi.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{kpi.label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {loading ? (
                        <span className="inline-block w-12 h-7 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      ) : (
                        (stats?.[kpi.key as keyof DashboardStats] as number) ?? 0
                      )}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                    <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Events & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events */}
        <div className="lg:col-span-2">
          <Card className="border border-gray-200 dark:border-gray-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Recent Events</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => router.push('/events')} className="text-sm text-[#1A56DB]">
                  View all
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : stats?.recentEvents.length === 0 ? (
                <div className="text-center py-10">
                  <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No events yet</p>
                  <Button size="sm" className="mt-3" onClick={() => router.push('/events/new')}>
                    Create your first event
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats?.recentEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-colors cursor-pointer"
                      onClick={() => router.push(`/events/${event.id}`)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{event.eventName}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(event.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            · {event.teamCount} teams
                          </p>
                        </div>
                        <Badge className={statusColor(event.status)} variant="secondary">
                          {event.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={event.reviewProgress} className="flex-1 h-2" />
                        <span className="text-xs font-medium text-gray-500">{event.reviewProgress}%</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <Card className="border border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start h-11"
              onClick={() => router.push('/events/new')}
            >
              <Plus className="w-4 h-4 mr-2.5 text-blue-500" />
              Create Event
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-11"
              onClick={() => router.push('/users')}
            >
              <Users className="w-4 h-4 mr-2.5 text-purple-500" />
              Manage Users
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-11"
              onClick={() => router.push('/events')}
            >
              <TrendingUp className="w-4 h-4 mr-2.5 text-emerald-500" />
              View Analytics
            </Button>

            <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">System Status</h4>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-gray-600 dark:text-gray-400">Database connected</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-gray-600 dark:text-gray-400">Auth service online</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span className="text-gray-600 dark:text-gray-400">Real-time: polling mode</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
