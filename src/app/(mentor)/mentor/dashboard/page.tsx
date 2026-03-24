'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FlaskConical, ClipboardList, Clock, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/stores/useAppStore';

interface MentorDashData {
  eventName: string;
  currentRound: string;
  roundStatus: string;
  assignedLabs: {
    id: string;
    labName: string;
    building: string;
    teamCount: number;
    reviewedCount: number;
    status: string;
  }[];
  totalReviewed: number;
  totalPending: number;
}

export default function MentorDashboard() {
  const router = useRouter();
  const { user } = useAppStore();
  const [data, setData] = useState<MentorDashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setData({
        eventName: 'Tech Expo 2026',
        currentRound: 'Round 1 — Preliminary',
        roundStatus: 'open',
        assignedLabs: [
          { id: '1', labName: 'Lab 101', building: 'Block A', teamCount: 7, reviewedCount: 3, status: 'in_progress' },
          { id: '2', labName: 'Lab 102', building: 'Block A', teamCount: 7, reviewedCount: 1, status: 'active' },
        ],
        totalReviewed: 4,
        totalPending: 10,
      });
      setLoading(false);
    }, 400);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Welcome, {user?.fullName?.split(' ')[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {loading ? <Skeleton className="w-48 h-4" /> : `${data?.eventName} · ${data?.currentRound}`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border border-gray-200 dark:border-gray-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {loading ? <Skeleton className="w-8 h-7" /> : data?.totalReviewed}
              </p>
              <p className="text-xs text-gray-500">Reviewed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 dark:border-gray-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {loading ? <Skeleton className="w-8 h-7" /> : data?.totalPending}
              </p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Round Status */}
      {data?.roundStatus === 'open' && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <p className="text-sm text-green-700 dark:text-green-400 font-medium">
            Round is open — Reviews are active
          </p>
        </div>
      )}

      {/* Assigned Labs */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">My Assigned Labs</h2>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        ) : (
          <div className="space-y-3">
            {data?.assignedLabs.map((lab, i) => {
              const progress = lab.teamCount > 0 ? Math.round((lab.reviewedCount / lab.teamCount) * 100) : 0;
              return (
                <motion.div
                  key={lab.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card
                    className="border border-gray-200 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer shadow-sm hover:shadow-md"
                    onClick={() => router.push(`/mentor/labs/${lab.id}`)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                            <FlaskConical className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{lab.labName}</h3>
                            <p className="text-xs text-gray-500">{lab.building}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className={
                          lab.status === 'in_progress' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' :
                          lab.status === 'completed' ? 'bg-green-100 text-green-700' : ''
                        }>
                          {lab.status === 'in_progress' ? 'In Progress' : lab.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {lab.reviewedCount}/{lab.teamCount} teams reviewed
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <Progress value={progress} className="flex-1 h-2" />
                        <span className="text-xs font-medium text-gray-500 w-9 text-right">{progress}%</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
