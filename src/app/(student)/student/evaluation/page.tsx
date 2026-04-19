'use client';

import { useStudentStore } from '@/stores/useStudentStore';
import { useQuery } from '@tanstack/react-query';
import studentApiClient from '@/lib/studentApiClient';
import { Loader2, BarChart3 } from 'lucide-react';
import { EVALUATION_STATUS_CONFIG } from '@/types';
import type { EvaluationStatus } from '@/types';

export default function StudentEvaluationPage() {
  const { team } = useStudentStore();

  const { data, isLoading } = useQuery({
    queryKey: ['student-dashboard', team?.teamId],
    queryFn: async () => {
      const res = await studentApiClient.get('/student/team');
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

  if (!data) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p>Unable to load evaluation status.</p>
      </div>
    );
  }

  const evalStatus = (data.evaluationStatus || 'not_evaluated') as EvaluationStatus;
  const evalConfig = EVALUATION_STATUS_CONFIG[evalStatus];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Evaluation Status</h1>
        <p className="text-sm text-gray-500 mt-1">Track your team&apos;s evaluation progress.</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: evalConfig.bg }}>
          <BarChart3 className="w-8 h-8" style={{ color: evalConfig.color }} />
        </div>
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{evalConfig.label}</p>
        <p className="text-sm text-gray-500 mt-2">
          {evalStatus === 'not_evaluated' && 'Your team has not been evaluated yet. Please ensure your project is ready.'}
          {evalStatus === 'under_evaluation' && 'A mentor is currently reviewing your project. Stay available for questions.'}
          {evalStatus === 'evaluated' && 'Your team has been evaluated. Results will be published by the admin.'}
          {evalStatus === 're_evaluation_required' && 'The mentor has requested re-evaluation. Please address the feedback and update your readiness.'}
        </p>
      </div>

      {/* Readiness Reflection */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Your Readiness</h2>
        <div className="space-y-2">
          {[
            { label: 'Project ready', value: data.isProjectReady },
            { label: 'PPT completed', value: data.isPptReady },
            { label: 'Demo ready', value: data.isDemoReady },
            { label: 'Final submission', value: data.isFinalSubmissionReady },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
              <span className={item.value ? 'text-emerald-600' : 'text-gray-300 dark:text-gray-600'}>
                {item.value ? '✓' : '✗'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
