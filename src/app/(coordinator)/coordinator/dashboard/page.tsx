'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, UserCheck, ClipboardList, AlertTriangle, 
  CheckCircle, Clock, CheckSquare, RefreshCcw
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';

interface CoordStats {
  totalTeams: number;
  totalStudents: number;
  attendanceCompleted: number;
  projectsReady: number;
  projectsNotReady: number;
  evaluated: number;
  pendingEvaluation: number;
  issuesRaised: number;
}

export default function CoordinatorDashboardPage() {
  const [stats, setStats] = useState<CoordStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/coordinator/dashboard');
      setStats(data.data);
    } catch {
      toast.error('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const kpis = stats ? [
    { label: 'Registered Teams', value: stats.totalTeams, icon: Users, color: 'text-blue-600' },
    { label: 'Registered Students', value: stats.totalStudents, icon: UserCheck, color: 'text-indigo-600' },
    { label: 'Attendance Recorded', value: stats.attendanceCompleted, icon: CheckSquare, color: 'text-green-600' },
    { label: 'Projects Ready (PPT)', value: stats.projectsReady, icon: CheckCircle, color: 'text-emerald-600' },
    { label: 'Projects Not Ready', value: stats.projectsNotReady, icon: Clock, color: 'text-orange-600' },
    { label: 'Evaluated Teams', value: stats.evaluated, icon: ClipboardList, color: 'text-purple-600' },
    { label: 'Pending Evaluation', value: stats.pendingEvaluation, icon: Clock, color: 'text-pink-600' },
    { label: 'Issues Raised', value: stats.issuesRaised, icon: AlertTriangle, color: 'text-red-600' },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Lab Dashboard</h1>
          <p className="text-sm text-gray-500">Overview of your assigned labs</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading} className="gap-2">
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))
          : kpis.map((kpi, i) => (
              <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{kpi.label}</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{kpi.value}</p>
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
    </div>
  );
}
