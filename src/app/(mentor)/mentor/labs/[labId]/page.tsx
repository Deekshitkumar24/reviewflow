'use client';

import { useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Clock, FlaskConical, ClipboardList, RefreshCcw, ShieldCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { VERDICT_CONFIG, type VerdictType } from '@/types';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';

interface LabTeam {
  id: string;
  teamName: string;
  projectTitle: string;
  domain: string | null;
  members: { id: string }[];
  latestVerdict: VerdictType | null;
  latestScore: number | null;
  isReviewed: boolean;
  isReady: boolean;
}

interface LabInfo {
  labName: string;
  building: string | null;
}

export default function MentorLabPage({ params }: { params: Promise<{ labId: string }> }) {
  const { labId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const roundId = searchParams.get('roundId') ?? '';

  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ['mentor-lab-queue', labId, roundId],
    queryFn: async () => {
      let labInfo: LabInfo | null = null;
      try {
        const { data: labData } = await apiClient.get(`/labs/${labId}`);
        labInfo = { labName: labData.data.labName, building: labData.data.building };
      } catch { labInfo = { labName: `Lab ${labId.slice(0, 6)}`, building: null }; }

      const teamsParams = new URLSearchParams({ labId, limit: '200' });
      if (roundId) teamsParams.set('roundId', roundId);
      const { data: teamsData } = await apiClient.get(`/teams?${teamsParams}`);
      const rawTeams = teamsData.data ?? [];

      const reviewParams = new URLSearchParams({ labId, isDraft: 'false', limit: '200' });
      if (roundId) reviewParams.set('roundId', roundId);
      const { data: reviewsData } = await apiClient.get(`/reviews?${reviewParams}`);
      const reviews = reviewsData.data ?? [];

      const reviewMap = new Map<string, { verdict: string; totalScore: number }>();
      for (const r of reviews) {
        reviewMap.set(r.teamId, { verdict: r.verdict, totalScore: r.totalScore });
      }

      const enrichedTeams: LabTeam[] = rawTeams.map((t: any) => {
        const rev = reviewMap.get(t.id);
        const isReady = !!(t.isProjectReady && t.isPptReady && t.isDemoReady && t.isFinalSubmissionReady);
        return {
          id: t.id,
          teamName: t.teamName,
          projectTitle: t.projectTitle,
          domain: t.domain,
          members: t.members ?? [],
          latestVerdict: (rev?.verdict as VerdictType) ?? null,
          latestScore: rev?.totalScore ?? null,
          isReviewed: !!rev,
          isReady,
        };
      });

      enrichedTeams.sort((a, b) => {
        if (a.isReviewed === b.isReviewed) return 0;
        return a.isReviewed ? 1 : -1;
      });

      return { teams: enrichedTeams, lab: labInfo };
    },
    refetchInterval: 30000,
  });

  const teams = data?.teams ?? [];
  const lab = data?.lab ?? null;
  const fetchQueue = () => refetch();

  const reviewed = teams.filter((t) => t.isReviewed).length;
  const total = teams.length;
  const progress = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/mentor/dashboard')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[#1A56DB]" />
            {loading && !lab ? <Skeleton className="w-24 h-6" /> : (lab?.labName ?? 'Lab')}
          </h1>
          <p className="text-sm text-gray-500">{reviewed}/{total} teams reviewed</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchQueue} disabled={loading}>
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl p-4">
        <Progress value={progress} className="flex-1 h-3" />
        <span className="text-sm font-bold text-[#1A56DB]">{progress}%</span>
      </div>

      {/* Queue Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <ClipboardList className="w-4 h-4" />Review Queue
        </h2>
        <Badge variant="secondary">{total - reviewed} remaining</Badge>
      </div>

      {/* Team List */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : teams.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-400">
          <p>No teams assigned to this lab for the current round.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {teams.map((team, i) => (
            <motion.div key={team.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card
                className={`border transition-all cursor-pointer ${
                  team.isReviewed
                    ? 'border-gray-200 dark:border-gray-800 opacity-70'
                    : 'border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 shadow-sm hover:shadow-md'
                }`}
                onClick={() => router.push(`/mentor/review/${team.id}?labId=${labId}${roundId ? `&roundId=${roundId}` : ''}`)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${team.isReviewed ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{team.teamName}</h3>
                      {team.isReady && !team.isReviewed && (
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 gap-1 px-1.5 py-0">
                          <ShieldCheck className="w-3 h-3" /> Ready
                        </Badge>
                      )}
                      {team.isReviewed && team.latestVerdict && (
                        <Badge variant="secondary" className="text-[10px]" style={{ backgroundColor: VERDICT_CONFIG[team.latestVerdict].bg, color: VERDICT_CONFIG[team.latestVerdict].color }}>
                          {VERDICT_CONFIG[team.latestVerdict].label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{team.projectTitle}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{team.domain ?? 'General'} · {team.members.length} member{team.members.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {team.isReviewed ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{team.latestScore?.toFixed(1)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">Review</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
