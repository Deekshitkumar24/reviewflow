'use client';

import { useStudentStore } from '@/stores/useStudentStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import studentApiClient from '@/lib/studentApiClient';
import { Loader2, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';
import { ISSUE_CATEGORY_CONFIG, ISSUE_STATUS_CONFIG } from '@/types';
import type { IssueCategory, IssueStatus } from '@/types';

const CATEGORIES = Object.entries(ISSUE_CATEGORY_CONFIG).map(([value, { label }]) => ({ value, label }));

export default function StudentIssuesPage() {
  const { team } = useStudentStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<IssueCategory>('other');
  const [description, setDescription] = useState('');

  const { data: issues, isLoading } = useQuery({
    queryKey: ['student-issues', team?.teamId],
    queryFn: async () => {
      const res = await studentApiClient.get('/student/issues');
      return res.data.data;
    },
    enabled: !!team?.teamId,
  });

  const createMutation = useMutation({
    mutationFn: async (body: { category: string; description: string }) => {
      const res = await studentApiClient.post('/student/issues', body);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Issue reported');
      queryClient.invalidateQueries({ queryKey: ['student-issues'] });
      setShowForm(false);
      setDescription('');
    },
    onError: () => toast.error('Failed to report issue'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.length < 10) {
      toast.error('Description must be at least 10 characters');
      return;
    }
    createMutation.mutate({ category, description });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Issues & Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Report problems or track existing issues.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-1" /> Report
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as IssueCategory)}
              className="w-full h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-24 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent p-3 text-sm text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Describe the issue in detail..."
              maxLength={2000}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Submit
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Issues List */}
      {!issues || issues.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No issues reported yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue: { id: string; category: IssueCategory; description: string; status: IssueStatus; createdAt: string; resolutionNote?: string }) => {
            const statusConfig = ISSUE_STATUS_CONFIG[issue.status];
            const categoryConfig = ISSUE_CATEGORY_CONFIG[issue.category];
            return (
              <div key={issue.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: statusConfig.color, backgroundColor: statusConfig.bg }}>
                    {statusConfig.label}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(issue.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-gray-500 mb-1">{categoryConfig?.label || issue.category}</p>
                <p className="text-sm text-gray-900 dark:text-gray-100">{issue.description}</p>
                {issue.resolutionNote && (
                  <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                    <p className="text-xs text-emerald-700 dark:text-emerald-400"><strong>Resolution:</strong> {issue.resolutionNote}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
