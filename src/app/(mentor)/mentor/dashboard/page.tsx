'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FlaskConical, Clock, CheckCircle2, RefreshCcw, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/stores/useAppStore';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';

interface AssignedLab {
  id: string;
  labId: string;
  labName: string;
  building: string | null;
  floor: string | null;
  roundId: string;
  roundName: string;
  roundStatus: string;
  eventId: string;
}

interface LabProgress {
  lab: AssignedLab;
  totalTeams: number;
  reviewedCount: number;
  progress: number;
}

export default function MentorDashboard() {
  const router = useRouter();
  const { user } = useAppStore();
  const [labsData, setLabsData] = useState<LabProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get mentor assignments — mentor role filter applied server-side
      const { data: assnData } = await apiClient.get('/mentor-assignments');
      const assignments: AssignedLab[] = assnData.data ?? [];

      // For each assignment, get the team queue + review counts
      const withProgress = await Promise.all(
        assignments.map(async (asn) => {
          try {
            const [teamsRes, reviewsRes] = await Promise.all([
              apiClient.get(`/teams?labId=${asn.labId}&roundId=${asn.roundId}&limit=200`),
              apiClient.get(`/reviews?labId=${asn.labId}&roundId=${asn.roundId}&isDraft=false&limit=200`),
            ]);
            const totalTeams = teamsRes.data.meta?.meta?.total ?? (teamsRes.data.data?.length ?? 0);
            const reviewedCount = reviewsRes.data.meta?.meta?.total ?? (reviewsRes.data.data?.length ?? 0);
            const progress = totalTeams > 0 ? Math.round((reviewedCount / totalTeams) * 100) : 0;
            return { lab: asn, totalTeams, reviewedCount, progress };
          } catch {
            return { lab: asn, totalTeams: 0, reviewedCount: 0, progress: 0 };
          }
        })
      );
      setLabsData(withProgress);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed to load dashboard';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const activeAssignments = labsData.filter((l) => l.lab.roundStatus === 'open');
  const totalReviewed = labsData.reduce((s, l) => s + l.reviewedCount, 0);
  const totalPending = labsData.reduce((s, l) => s + (l.totalTeams - l.reviewedCount), 0);
  const activeRoundName = activeAssignments[0]?.lab.roundName ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Welcome, {user?.fullName?.split(' ')[0] ?? 'Mentor'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeRoundName ?? (loading ? '...' : 'No active round')}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          <Button variant="outline" size="sm" onClick={fetchData} className="ml-auto">Retry</Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {loading ? <Skeleton className="w-8 h-7" /> : totalReviewed}
            </p>
            <p className="text-xs text-gray-500">Reviewed</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {loading ? <Skeleton className="w-8 h-7" /> : totalPending}
            </p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
        </CardContent></Card>
      </div>

      {/* Active round badge */}
      {activeAssignments.length > 0 && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <p className="text-sm text-green-700 dark:text-green-400 font-medium">
            {activeRoundName} is open — Reviews are active
          </p>
        </div>
      )}

      {/* Assigned Labs */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">My Assigned Labs</h2>
        {loading ? (
          <div className="space-y-3"><Skeleton className="h-28 rounded-xl" /><Skeleton className="h-28 rounded-xl" /></div>
        ) : labsData.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-gray-400">
            <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No labs assigned for the current round.</p>
            <p className="text-xs mt-1">Contact your coordinator if this seems wrong.</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {labsData.map(({ lab, totalTeams, reviewedCount, progress }, i) => (
              <motion.div key={lab.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card
                  className="border border-gray-200 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer shadow-sm hover:shadow-md"
                  onClick={() => router.push(`/mentor/labs/${lab.labId}?roundId=${lab.roundId}`)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                          <FlaskConical className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{lab.labName}</h3>
                          <p className="text-xs text-gray-500">{[lab.building, lab.floor].filter(Boolean).join(', ')}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className={
                        progress === 100 ? 'bg-green-100 text-green-700' :
                        lab.roundStatus === 'open' ? 'bg-amber-100 text-amber-700' : ''
                      }>
                        {progress === 100 ? 'Complete' : lab.roundStatus === 'open' ? 'Active' : lab.roundStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {progress === 100
                        ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                        : <Clock className="w-4 h-4 text-amber-500" />}
                      <span>{reviewedCount}/{totalTeams} teams reviewed</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={progress} className="flex-1 h-2" />
                      <span className="text-xs font-bold text-[#1A56DB] w-9 text-right">{progress}%</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
