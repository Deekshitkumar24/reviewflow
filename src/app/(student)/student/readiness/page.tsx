'use client';

import { useStudentStore } from '@/stores/useStudentStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import studentApiClient from '@/lib/studentApiClient';
import { Loader2, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';

const READINESS_FLAGS = [
  { key: 'isProjectReady', label: 'Project ready for evaluation' },
  { key: 'isPptReady', label: 'PPT completed' },
  { key: 'isDemoReady', label: 'Demo ready' },
  { key: 'isFinalSubmissionReady', label: 'Final submission ready' },
] as const;

export default function StudentReadinessPage() {
  const { team } = useStudentStore();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['student-dashboard', team?.teamId],
    queryFn: async () => {
      const res = await studentApiClient.get('/student/team');
      return res.data.data;
    },
    enabled: !!team?.teamId,
  });

  const [remarks, setRemarks] = useState('');
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [initialized, setInitialized] = useState(false);

  if (data && !initialized) {
    setFlags({
      isProjectReady: data.isProjectReady,
      isPptReady: data.isPptReady,
      isDemoReady: data.isDemoReady,
      isFinalSubmissionReady: data.isFinalSubmissionReady,
    });
    setRemarks(data.readinessRemarks || '');
    setInitialized(true);
  }

  const mutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await studentApiClient.patch('/student/readiness', body);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Readiness updated');
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['mentor', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['coordinator', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: () => toast.error('Failed to update readiness'),
  });

  const handleSave = () => {
    mutation.mutate({
      isProjectReady: flags.isProjectReady ?? false,
      isPptReady: flags.isPptReady ?? false,
      isDemoReady: flags.isDemoReady ?? false,
      isFinalSubmissionReady: flags.isFinalSubmissionReady ?? false,
      readinessRemarks: remarks || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Project Readiness</h1>
        <p className="text-sm text-gray-500 mt-1">Update your team&apos;s readiness status before evaluation.</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
        {READINESS_FLAGS.map((flag) => (
          <button
            key={flag.key}
            type="button"
            onClick={() => setFlags(prev => ({ ...prev, [flag.key]: !prev[flag.key] }))}
            className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <span className="text-sm text-gray-900 dark:text-gray-100">{flag.label}</span>
            {flags[flag.key] ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : (
              <X className="w-5 h-5 text-gray-300 dark:text-gray-600" />
            )}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Remarks (optional)
        </label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          className="w-full h-24 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent p-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          placeholder="Any notes about your project status..."
          maxLength={500}
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={mutation.isPending}
        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
      >
        {mutation.isPending ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
        ) : (
          'Save Readiness'
        )}
      </Button>
    </div>
  );
}
