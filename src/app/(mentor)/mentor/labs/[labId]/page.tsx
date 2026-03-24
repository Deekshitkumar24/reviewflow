'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, CheckCircle2, Clock, FlaskConical, ClipboardList } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { VERDICT_CONFIG, type VerdictType } from '@/types';

interface LabTeam {
  id: string;
  teamName: string;
  projectTitle: string;
  domain: string;
  memberCount: number;
  latestVerdict: VerdictType | null;
  latestScore: number | null;
  isReviewed: boolean;
}

export default function MentorLabPage({ params }: { params: Promise<{ labId: string }> }) {
  const { labId } = use(params);
  const router = useRouter();
  const [labName, setLabName] = useState('');
  const [teams, setTeams] = useState<LabTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setLabName('Lab 101');
      setTeams([
        { id: '1', teamName: 'AlgoX', projectTitle: 'AI-Powered Code Review', domain: 'AI/ML', memberCount: 3, latestVerdict: 'selected', latestScore: 82.5, isReviewed: true },
        { id: '2', teamName: 'ByteHackers', projectTitle: 'Real-time Collaborative IDE', domain: 'Web Dev', memberCount: 3, latestVerdict: 'shortlisted', latestScore: 71.3, isReviewed: true },
        { id: '3', teamName: 'CyberGuards', projectTitle: 'Intrusion Detection System', domain: 'Security', memberCount: 3, latestVerdict: 'hold', latestScore: 58.0, isReviewed: true },
        { id: '4', teamName: 'EduConnect', projectTitle: 'Virtual Classroom Platform', domain: 'EdTech', memberCount: 3, latestVerdict: null, latestScore: null, isReviewed: false },
        { id: '5', teamName: 'FinFlow', projectTitle: 'Personal Finance Tracker', domain: 'FinTech', memberCount: 3, latestVerdict: null, latestScore: null, isReviewed: false },
        { id: '6', teamName: 'SafeRoute', projectTitle: 'Women Safety Alert System', domain: 'Mobile', memberCount: 3, latestVerdict: null, latestScore: null, isReviewed: false },
        { id: '7', teamName: 'GreenTech', projectTitle: 'Solar Panel Optimizer', domain: 'Energy', memberCount: 3, latestVerdict: null, latestScore: null, isReviewed: false },
      ]);
      setLoading(false);
    }, 300);
  }, [labId]);

  const reviewed = teams.filter(t => t.isReviewed).length;
  const total = teams.length;
  const progress = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  // Sort: unreviewed first, then reviewed
  const sortedTeams = [...teams].sort((a, b) => {
    if (a.isReviewed === b.isReviewed) return 0;
    return a.isReviewed ? 1 : -1;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/mentor/dashboard')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {loading ? <Skeleton className="w-24 h-6" /> : labName}
          </h1>
          <p className="text-sm text-gray-500">
            {reviewed}/{total} teams reviewed
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl p-4">
        <Progress value={progress} className="flex-1 h-3" />
        <span className="text-sm font-bold text-[#1A56DB]">{progress}%</span>
      </div>

      {/* Queue Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <ClipboardList className="w-4 h-4" />
          Review Queue
        </h2>
        <Badge variant="secondary">
          {total - reviewed} remaining
        </Badge>
      </div>

      {/* Team List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedTeams.map((team, i) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card
                className={`border transition-all cursor-pointer ${
                  team.isReviewed
                    ? 'border-gray-200 dark:border-gray-800 opacity-70'
                    : 'border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 shadow-sm hover:shadow-md'
                }`}
                onClick={() => router.push(`/mentor/review/${team.id}`)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  {/* Status indicator */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${team.isReviewed ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{team.teamName}</h3>
                      {team.isReviewed && team.latestVerdict && (
                        <Badge
                          variant="secondary"
                          className="text-[10px]"
                          style={{
                            backgroundColor: VERDICT_CONFIG[team.latestVerdict].bg,
                            color: VERDICT_CONFIG[team.latestVerdict].color,
                          }}
                        >
                          {VERDICT_CONFIG[team.latestVerdict].label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{team.projectTitle}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{team.domain} · {team.memberCount} members</p>
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
