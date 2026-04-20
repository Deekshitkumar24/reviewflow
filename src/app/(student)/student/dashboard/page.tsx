'use client';

import { useStudentStore } from '@/stores/useStudentStore';
import { useQuery } from '@tanstack/react-query';
import studentApiClient from '@/lib/studentApiClient';
import { Loader2, Users, BookOpen, CheckCircle, AlertTriangle, BarChart3 } from 'lucide-react';
import SubmissionQualityChecker from '@/components/ui/SubmissionQualityChecker';
import { EVALUATION_STATUS_CONFIG } from '@/types';
import type { EvaluationStatus } from '@/types';

export default function StudentDashboardPage() {
  const { team } = useStudentStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['student-dashboard', team?.teamId],
    queryFn: async () => {
      const res = await studentApiClient.get(`/student/team`);
      return res.data.data;
    },
    enabled: !!team?.teamId,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p>Unable to load team details. Please try again.</p>
      </div>
    );
  }

  const evalStatus = (data.evaluationStatus || 'not_evaluated') as EvaluationStatus;
  const evalConfig = EVALUATION_STATUS_CONFIG[evalStatus];

  const readinessCount = [data.isProjectReady, data.isPptReady, data.isDemoReady, data.isFinalSubmissionReady].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{data.teamName}</h1>
        <p className="text-sm text-gray-500 mt-1">{data.projectTitle}</p>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
            <Users className="w-3.5 h-3.5" /> Members
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.memberCount || 0}</p>
          <p className="text-xs text-gray-400 capitalize">{data.participationType}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
            <CheckCircle className="w-3.5 h-3.5" /> Readiness
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{readinessCount}/4</p>
          <p className="text-xs text-gray-400">Flags set</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
            <BarChart3 className="w-3.5 h-3.5" /> Evaluation
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: evalConfig.color }} />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{evalConfig.label}</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
            <AlertTriangle className="w-3.5 h-3.5" /> Issues
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.issueCount || 0}</p>
          <p className="text-xs text-gray-400">Reported</p>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Team Members</h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {data.members?.map((m: any) => (
            <div key={m.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {m.fullName}
                  {m.isLeader && <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 text-[10px] font-medium">Leader</span>}
                </p>
                {(m.rollNumber || m.academicYear) && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {m.rollNumber} {m.rollNumber && m.academicYear && '·'} {m.academicYear && `Year ${m.academicYear}`}
                  </p>
                )}
              </div>
              
              {m.attendance && m.attendance.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.attendance.map((att: any, idx: number) => (
                    <span 
                      key={idx} 
                      className={`text-[10px] px-2 py-1 rounded-md font-medium border ${
                        att.isPresent 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                          : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                      }`}
                      title={`${att.slotName} (${new Date(att.slotDate).toLocaleDateString()})`}
                    >
                      {att.slotName}: {att.isPresent ? 'Present' : 'Absent'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Project Details */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Project Details</h2>
        {data.projectDescription && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{data.projectDescription}</p>
        )}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {data.domain && (
            <div>
              <span className="text-gray-400">Domain:</span>
              <span className="ml-1 text-gray-900 dark:text-gray-100">{data.domain}</span>
            </div>
          )}
          <div>
            <span className="text-gray-400">Department:</span>
            <span className="ml-1 text-gray-900 dark:text-gray-100">{data.department}</span>
          </div>
          {data.labName && (
            <div>
              <span className="text-gray-400">Lab:</span>
              <span className="ml-1 text-gray-900 dark:text-gray-100">{data.labName}</span>
            </div>
          )}
          {data.eventName && (
            <div>
              <span className="text-gray-400">Event:</span>
              <span className="ml-1 text-gray-900 dark:text-gray-100">{data.eventName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Submission Quality Checker (AI Feature G) */}
      <SubmissionQualityChecker teamData={data} readinessCount={readinessCount} />
    </div>
  );
}
