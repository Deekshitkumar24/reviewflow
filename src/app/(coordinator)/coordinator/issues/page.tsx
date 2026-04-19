'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';
import { ISSUE_CATEGORY_CONFIG, ISSUE_STATUS_CONFIG } from '@/types';
import type { IssueCategory, IssueStatus } from '@/types';
import { Badge } from '@/components/ui/badge';

export default function CoordinatorIssuesPage() {
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: issues, isLoading } = useQuery({
    queryKey: ['issues', 'coordinator'],
    queryFn: async () => {
      const res = await apiClient.get('/issues?limit=200');
      return res.data.data;
    },
    refetchInterval: 15000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, resolutionNote }: { id: string, status: string, resolutionNote?: string }) => {
      const res = await apiClient.patch(`/issues/${id}`, { status, resolutionNote });
      return res.data;
    },
    onMutate: (vars) => setUpdatingId(vars.id),
    onSuccess: () => {
      toast.success('Issue updated successfully');
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['coordinator', 'dashboard'] });
    },
    onError: () => toast.error('Failed to update issue'),
    onSettled: () => setUpdatingId(null),
  });

  const handleResolve = (id: string) => {
    const note = window.prompt("Enter an optional resolution note for the team:");
    if (note === null) return; // cancelled
    updateMutation.mutate({ id, status: 'resolved', resolutionNote: note });
  };

  const handleReopen = (id: string) => {
    updateMutation.mutate({ id, status: 'open' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Lab Issues</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor and resolve issues reported directly by student teams in your assigned labs.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#1A56DB]" />
        </div>
      ) : !issues || issues.length === 0 ? (
        <div className="text-center bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 py-16 text-gray-400">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No unresolved issues reported.</p>
          <p className="text-xs mt-1">When teams report problems, they will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue: any) => {
            const statusConfig = ISSUE_STATUS_CONFIG[issue.status as IssueStatus] || ISSUE_STATUS_CONFIG['open'];
            const categoryConfig = ISSUE_CATEGORY_CONFIG[issue.category as IssueCategory];
            return (
              <div key={issue.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm transition-all relative overflow-hidden">
                {issue.status === 'resolved' && (
                  <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 dark:bg-green-900/10 -mr-8 -mt-8 rotate-45 border-b border-l border-green-200 dark:border-green-900/40" />
                )}
                <div className="flex items-start justify-between mb-3 relative z-10">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ color: statusConfig.color, backgroundColor: statusConfig.bg, borderColor: statusConfig.color }}>
                      {statusConfig.label}
                    </Badge>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{issue.team?.teamName || 'Unknown Team'}</span>
                    <span className="text-xs text-gray-400">· {issue.lab?.labName || 'No Lab'}</span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(issue.createdAt).toLocaleString()}</span>
                </div>
                
                <h4 className="text-xs font-medium text-gray-500 mb-1">{categoryConfig?.label || issue.category}</h4>
                <p className="text-sm text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-wrap leading-relaxed">{issue.description}</p>
                
                {issue.resolutionNote && (
                  <div className="mt-3 mb-4 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-lg relative z-10">
                    <p className="text-xs font-semibold text-blue-800 dark:text-blue-400 mb-1">Resolution Note:</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">{issue.resolutionNote}</p>
                    {issue.resolvedBy?.fullName && (
                      <p className="text-[10px] text-blue-600/60 dark:text-blue-500/50 mt-2 text-right">Resolved by {issue.resolvedBy.fullName}</p>
                    )}
                  </div>
                )}
                
                <div className="flex items-center gap-2 justify-end pt-3 border-t border-gray-100 dark:border-gray-800">
                  {issue.status !== 'resolved' ? (
                    <Button 
                      size="sm" 
                      onClick={() => handleResolve(issue.id)}
                      disabled={updatingId === issue.id}
                      className="bg-[#1A56DB] hover:bg-blue-700 text-white shadow-sm"
                    >
                      {updatingId === issue.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                      Mark Resolved
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleReopen(issue.id)}
                      disabled={updatingId === issue.id}
                    >
                      {updatingId === issue.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Reopen Issue
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
