'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Users, CheckCircle2, Clock, XCircle, RefreshCcw,
  FlaskConical, ClipboardList, Trophy, AlertCircle, Star, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import { VERDICT_CONFIG, ATTENDANCE_CONFIG, EVALUATION_STATUS_CONFIG, type VerdictType, type AttendanceStatus, type EvaluationStatus } from '@/types';
import { format } from 'date-fns';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useAppStore } from '@/stores/useAppStore';

// ─── Types ──────────────────────────────────────────────────
interface TeamDetail {
  id: string;
  teamName: string;
  projectTitle: string;
  projectDescription: string | null;
  domain: string | null;
  department: string;
  collegeName: string;
  githubUrl: string | null;
  pptLink: string | null;
  demoLink: string | null;
  attendanceStatus: AttendanceStatus;
  evaluationStatus: string;
  isProjectReady: boolean;
  isPptReady: boolean;
  isDemoReady: boolean;
  isFinalSubmissionReady: boolean;
  readinessRemarks: string | null;
  checkedInAt: string | null;
  createdAt: string;
  members: {
    id: string; fullName: string; email: string | null;
    phone: string | null; isLeader: boolean; academicYear: number | null;
  }[];
  labAssignments: {
    id: string;
    lab: { labName: string; building: string | null };
    round: { roundName: string; roundOrder: number; status: string };
  }[];
  reviews: {
    id: string;
    mentorId: string;
    innovationScore: number; technicalScore: number;
    presentationScore: number; feasibilityScore: number;
    problemSolvingScore: number; communicationScore: number;
    compositeScore: string; verdict: string; isDraft: boolean;
    strengths: string | null; weaknesses: string | null;
    overallComments: string | null;
    reviewedAt: string;
    round: { roundName: string; roundOrder: number };
    mentor: { fullName: string };
    suggestions: {
      id: string; text: string; category: string | null; orderIndex: number;
      statusLogs: { status: string; createdAt: string }[];
    }[];
  }[];
  result: {
    id: string; finalPosition: number | null; awardType: string | null;
    compositeScore: string; isPublished: boolean; declaredAt: string | null;
  } | null;
}

const AWARD_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  winner: { label: 'Winner', icon: '🥇', color: 'bg-yellow-100 text-yellow-800' },
  runner_up: { label: 'Runner Up', icon: '🥈', color: 'bg-gray-100 text-gray-700' },
  second_runner_up: { label: '2nd Runner Up', icon: '🥉', color: 'bg-orange-100 text-orange-700' },
  finalist: { label: 'Finalist', icon: '🏅', color: 'bg-blue-100 text-blue-700' },
  special_mention: { label: 'Special Mention', icon: '⭐', color: 'bg-purple-100 text-purple-700' },
  participant: { label: 'Participant', icon: '📋', color: 'bg-gray-100 text-gray-600' },
};

export default function TeamDetailPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params);
  const router = useRouter();
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evalStatusUpdate, setEvalStatusUpdate] = useState<EvaluationStatus>('not_evaluated');
  const user = useAppStore(s => s.user);
  const queryClient = useQueryClient();

  const fetchTeam = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get(`/teams/${teamId}`);
      setTeam(data.data);
      if (data.data.evaluationStatus) {
        setEvalStatusUpdate(data.data.evaluationStatus as EvaluationStatus);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed to load team';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeam(); }, [teamId]);

  const updateEvalStatusMutation = useMutation({
    mutationFn: async (status: EvaluationStatus) => {
      const res = await apiClient.patch(`/teams/${teamId}/evaluation-status`, { evaluationStatus: status });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Evaluation status synced');
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      fetchTeam();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || 'Failed to sync status'),
  });

  if (loading) return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );

  if (error || !team) return (
    <div className="flex flex-col items-center py-20 text-center">
      <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
      <h2 className="font-semibold text-gray-900 dark:text-gray-100">Failed to load team</h2>
      <p className="text-sm text-gray-500 mt-1">{error || 'Team not found'}</p>
      <div className="flex gap-2 mt-4">
        <Button variant="outline" onClick={() => router.push('/teams')}>Back</Button>
        <Button onClick={fetchTeam}>Retry</Button>
      </div>
    </div>
  );

  const attConfig = ATTENDANCE_CONFIG[team.attendanceStatus] ?? ATTENDANCE_CONFIG.registered;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.push('/teams')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />Teams
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{team.teamName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{team.projectTitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge style={{ backgroundColor: attConfig.bg, color: attConfig.color }}>{attConfig.label}</Badge>
          <Button variant="ghost" size="sm" onClick={fetchTeam}><RefreshCcw className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Mentor Evaluation Sync Component */}
      {user?.role === 'mentor' && team && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
               Evaluation Sync
            </h2>
          </div>
          <p className="text-sm text-gray-500">Update the live evaluation status. This dynamically syncs with the student portal, coordinator dashboard, and admin monitoring.</p>
          
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-100 dark:border-gray-800">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Status</p>
                <Badge className="px-3 py-1 text-xs" style={{ 
                  backgroundColor: EVALUATION_STATUS_CONFIG[team.evaluationStatus as EvaluationStatus]?.bg || '#f3f4f6', 
                  color: EVALUATION_STATUS_CONFIG[team.evaluationStatus as EvaluationStatus]?.color || '#4b5563' 
                }}>
                  {EVALUATION_STATUS_CONFIG[team.evaluationStatus as EvaluationStatus]?.label || 'Not Evaluated'}
                </Badge>
              </div>
              
              <div className="flex-1 w-full md:w-auto md:max-w-xs">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Change Status To</label>
                <div className="flex gap-2">
                  <select 
                    value={evalStatusUpdate} 
                    onChange={e => setEvalStatusUpdate(e.target.value as EvaluationStatus)}
                    className="flex-1 h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                  >
                    <option value="not_evaluated">Not Evaluated</option>
                    <option value="under_evaluation">Under Evaluation</option>
                    <option value="evaluated">Evaluated</option>
                    <option value="re_evaluation_required">Re-evaluation Required</option>
                  </select>
                  <Button 
                    onClick={() => updateEvalStatusMutation.mutate(evalStatusUpdate)} 
                    disabled={updateEvalStatusMutation.isPending || evalStatusUpdate === team.evaluationStatus}
                    className="h-9 bg-indigo-600 hover:bg-indigo-700"
                  >
                    {updateEvalStatusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="text-xs text-gray-500 bg-white dark:bg-gray-900 p-3 rounded-md border border-gray-100 dark:border-gray-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-indigo-400" />
              <p>
                {evalStatusUpdate === 'not_evaluated' && "Resetting to 'Not Evaluated'. Use this only if evaluation was started by mistake."}
                {evalStatusUpdate === 'under_evaluation' && "Marks the team as actively being reviewed right now. Prevents other mentors from taking it."}
                {evalStatusUpdate === 'evaluated' && "Marks this team's review process as completely finished."}
                {evalStatusUpdate === 're_evaluation_required' && "Signals the team to fix issues and request a follow-up review. They will see this in their portal."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Result banner */}
      {team.result && team.result.isPublished && (
        <Card className="border-2 border-yellow-300 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-950/10">
          <CardContent className="p-4 flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-600" />
            <div>
              <p className="font-semibold text-yellow-800 dark:text-yellow-400">
                {AWARD_LABELS[team.result.awardType ?? '']?.icon ?? '🏆'}{' '}
                {AWARD_LABELS[team.result.awardType ?? '']?.label ?? team.result.awardType}
                {team.result.finalPosition && ` — Position #${team.result.finalPosition}`}
              </p>
              <p className="text-xs text-yellow-700/70">Final Score: {parseFloat(team.result.compositeScore).toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="w-4 h-4 text-gray-400" />
          <div><p className="text-xs text-gray-400">Members</p><p className="font-semibold text-gray-900 dark:text-gray-100">{team.members.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <FlaskConical className="w-4 h-4 text-gray-400" />
          <div><p className="text-xs text-gray-400">Lab Assignments</p><p className="font-semibold text-gray-900 dark:text-gray-100">{team.labAssignments.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <ClipboardList className="w-4 h-4 text-gray-400" />
          <div><p className="text-xs text-gray-400">Reviews</p><p className="font-semibold text-gray-900 dark:text-gray-100">{team.reviews.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Star className="w-4 h-4 text-gray-400" />
          <div><p className="text-xs text-gray-400">Domain</p><p className="font-semibold text-gray-900 dark:text-gray-100">{team.domain || 'General'}</p></div>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members ({team.members.length})</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({team.reviews.length})</TabsTrigger>
          <TabsTrigger value="labs">Lab Assignments</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <Card><CardContent className="p-6 space-y-4 text-sm">
            {team.projectDescription && <p className="text-gray-600 dark:text-gray-400">{team.projectDescription}</p>}

            {/* Readiness Section */}
            <div className="bg-emerald-50/50 dark:bg-emerald-950/10 rounded-xl p-5 border border-emerald-100 dark:border-emerald-900/30">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Team Readiness
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Project Ready', value: team.isProjectReady },
                  { label: 'PPT Completed', value: team.isPptReady },
                  { label: 'Demo Ready', value: team.isDemoReady },
                  { label: 'Final Submission', value: team.isFinalSubmissionReady },
                ].map(item => (
                  <div key={item.label} className="bg-white dark:bg-gray-900 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">{item.label}</span>
                    {item.value ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-300 dark:text-gray-700" />
                    )}
                  </div>
                ))}
              </div>
              {team.readinessRemarks && (
                <div className="mt-3 text-xs text-emerald-800 dark:text-emerald-300 bg-white/50 dark:bg-gray-900/50 p-2 rounded-lg italic">
                  " {team.readinessRemarks} "
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-400">Department</p><p className="font-medium text-gray-900 dark:text-gray-100">{team.department}</p></div>
              <div><p className="text-xs text-gray-400">College</p><p className="font-medium text-gray-900 dark:text-gray-100">{team.collegeName}</p></div>
              <div><p className="text-xs text-gray-400">Checked In</p><p className="font-medium text-gray-900 dark:text-gray-100">{team.checkedInAt ? format(new Date(team.checkedInAt), 'MMM d, HH:mm') : '—'}</p></div>
              <div><p className="text-xs text-gray-400">Registered</p><p className="font-medium text-gray-900 dark:text-gray-100">{format(new Date(team.createdAt), 'MMM d, yyyy')}</p></div>
            </div>
            {(team.githubUrl || team.pptLink || team.demoLink) && (
              <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                {team.githubUrl && <a href={team.githubUrl} target="_blank" rel="noopener noreferrer" className="text-[#1A56DB] text-xs hover:underline">GitHub →</a>}
                {team.pptLink && <a href={team.pptLink} target="_blank" rel="noopener noreferrer" className="text-[#1A56DB] text-xs hover:underline">Presentation →</a>}
                {team.demoLink && <a href={team.demoLink} target="_blank" rel="noopener noreferrer" className="text-[#1A56DB] text-xs hover:underline">Demo →</a>}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* Members */}
        <TabsContent value="members" className="space-y-2">
          {team.members.map(m => (
            <Card key={m.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-sm font-semibold text-[#1A56DB]">
                  {m.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{m.fullName}</p>
                    {m.isLeader && <Badge variant="secondary" className="text-[10px]">Leader</Badge>}
                  </div>
                  <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                    {m.email && <span>{m.email}</span>}
                    {m.phone && <span>{m.phone}</span>}
                    {m.academicYear && <span>Year {m.academicYear}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {team.members.length === 0 && (
            <Card><CardContent className="py-8 text-center text-gray-400">No members registered</CardContent></Card>
          )}
        </TabsContent>

        {/* Reviews */}
        <TabsContent value="reviews" className="space-y-3">
          {team.reviews.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-gray-400">No reviews submitted yet</CardContent></Card>
          ) : team.reviews.map((review) => {
            const verdictCfg = VERDICT_CONFIG[review.verdict as VerdictType] ?? VERDICT_CONFIG.hold;
            return (
              <Card key={review.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{review.round.roundName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Reviewed by {review.mentor.fullName} · {format(new Date(review.reviewedAt), 'MMM d, HH:mm')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge style={{ backgroundColor: verdictCfg.bg, color: verdictCfg.color }}>
                        {verdictCfg.label}
                      </Badge>
                      <span className="text-lg font-bold text-[#1A56DB]">{parseFloat(review.compositeScore).toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Score grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                    {([
                      ['Inn', review.innovationScore], ['Tech', review.technicalScore],
                      ['Pres', review.presentationScore], ['Feas', review.feasibilityScore],
                      ['Prob', review.problemSolvingScore], ['Comm', review.communicationScore],
                    ] as [string, number][]).map(([label, score]) => (
                      <div key={label} className="text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{score}</p>
                        <p className="text-[10px] text-gray-500">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Text fields */}
                  {review.strengths && (
                    <div className="mb-2"><p className="text-xs font-medium text-green-600 mb-0.5">Strengths</p><p className="text-sm text-gray-600 dark:text-gray-400">{review.strengths}</p></div>
                  )}
                  {review.weaknesses && (
                    <div className="mb-2"><p className="text-xs font-medium text-red-600 mb-0.5">Weaknesses</p><p className="text-sm text-gray-600 dark:text-gray-400">{review.weaknesses}</p></div>
                  )}
                  {review.overallComments && (
                    <div className="mb-2"><p className="text-xs font-medium text-gray-500 mb-0.5">Comments</p><p className="text-sm text-gray-600 dark:text-gray-400">{review.overallComments}</p></div>
                  )}

                  {/* Suggestions */}
                  {review.suggestions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <p className="text-xs font-medium text-gray-500 mb-2">Suggestions ({review.suggestions.length})</p>
                      <div className="space-y-1.5">
                        {review.suggestions.map(s => (
                          <div key={s.id} className="flex items-start gap-2 text-sm">
                            <span className="text-gray-400 mt-0.5">•</span>
                            <div className="flex-1">
                              <p className="text-gray-700 dark:text-gray-300">{s.text}</p>
                              {s.statusLogs.length > 0 && (
                                <Badge variant="secondary" className="text-[10px] mt-1">
                                  {s.statusLogs[0].status === 'completed' ? '✅ Done' :
                                   s.statusLogs[0].status === 'partial' ? '🟡 Partial' : '❌ Not Done'}
                                </Badge>
                              )}
                            </div>
                            {s.category && <Badge variant="secondary" className="text-[10px]">{s.category}</Badge>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Lab Assignments */}
        <TabsContent value="labs" className="space-y-2">
          {team.labAssignments.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-gray-400">No lab assignments yet</CardContent></Card>
          ) : team.labAssignments.map(la => (
            <Card key={la.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                  <FlaskConical className="w-5 h-5 text-[#1A56DB]" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{la.lab.labName}</p>
                  <p className="text-xs text-gray-500">{la.round.roundName} · {la.lab.building ?? 'No building'}</p>
                </div>
                <Badge variant="secondary" className={
                  la.round.status === 'open' ? 'bg-green-100 text-green-700' :
                  la.round.status === 'locked' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-600'
                }>
                  {la.round.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
