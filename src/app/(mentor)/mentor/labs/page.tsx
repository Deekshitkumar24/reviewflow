'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FlaskConical, CheckCircle2, Clock, RefreshCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';

interface LabItem {
  id: string;
  labId: string;
  labName: string;
  building: string | null;
  floor: string | null;
  roundId: string;
  roundName: string;
  roundStatus: string;
  eventId: string;
  teamCount?: number;
  reviewedCount?: number;
}

export default function MentorLabsPage() {
  const router = useRouter();
  const [labs, setLabs] = useState<LabItem[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, { total: number; reviewed: number }>>({});
  const [loading, setLoading] = useState(true);

  const fetchLabs = async () => {
    setLoading(true);
    try {
      // mentor-assignments returns only the current mentor's assignments (enforced server-side)
      const { data } = await apiClient.get('/mentor-assignments');
      const assignments: LabItem[] = data.data ?? [];
      setLabs(assignments);

      // Fetch progress for each lab/round combo
      const progress: Record<string, { total: number; reviewed: number }> = {};
      await Promise.all(
        assignments.map(async (asn) => {
          try {
            const key = `${asn.labId}::${asn.roundId}`;
            const [teamsRes, reviewsRes] = await Promise.all([
              apiClient.get(`/teams?labId=${asn.labId}&roundId=${asn.roundId}&limit=1`),
              apiClient.get(`/reviews?labId=${asn.labId}&roundId=${asn.roundId}&isDraft=false&limit=1`),
            ]);
            progress[key] = {
              total: teamsRes.data.meta?.meta?.total ?? 0,
              reviewed: reviewsRes.data.meta?.meta?.total ?? 0,
            };
          } catch { /* ignore per-lab errors */ }
        })
      );
      setProgressMap(progress);
    } catch {
      toast.error('Failed to load your labs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLabs(); }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">My Labs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Labs assigned to you for active rounds</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchLabs} disabled={loading}>
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : labs.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-gray-400">
          <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No labs assigned yet. Contact your coordinator.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {labs.map((lab, i) => {
            const key = `${lab.labId}::${lab.roundId}`;
            const prog = progressMap[key] ?? { total: 0, reviewed: 0 };
            const progress = prog.total > 0 ? Math.round((prog.reviewed / prog.total) * 100) : 0;
            return (
              <motion.div key={lab.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card
                  className="border border-gray-200 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer shadow-sm hover:shadow-md"
                  onClick={() => router.push(`/mentor/labs/${lab.labId}?roundId=${lab.roundId}`)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                          <FlaskConical className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">{lab.labName}</h3>
                          <p className="text-xs text-gray-500">{[lab.building, lab.floor ? `Floor ${lab.floor}` : null].filter(Boolean).join(', ')}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{lab.roundName}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className={
                        progress === 100 ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                        : lab.roundStatus === 'open' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                        : 'bg-gray-100 text-gray-600'
                      }>
                        {progress === 100 ? 'Complete' : lab.roundStatus === 'open' ? 'Active' : lab.roundStatus}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {progress === 100
                        ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                        : <Clock className="w-4 h-4 text-amber-500" />}
                      <span>{prog.reviewed}/{prog.total} teams reviewed</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Progress value={progress} className="flex-1 h-2.5" />
                      <span className="text-sm font-bold text-[#1A56DB] w-10 text-right">{progress}%</span>
                    </div>
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
