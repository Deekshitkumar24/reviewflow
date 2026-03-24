'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, FileText, RefreshCcw, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { useDebounce } from '@/hooks/useDebounce';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  ipAddress: string | null;
  userName: string;
  userEmail: string | null;
  userRole: string | null;
  newValues: Record<string, unknown> | null;
}

interface Meta { page: number; limit: number; total: number; totalPages: number; }

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  logout: 'bg-gray-100 text-gray-600 dark:bg-gray-800',
  created: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  updated: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  deleted: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  advanced: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  declared: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

function getActionColor(action: string) {
  for (const [key, value] of Object.entries(ACTION_COLORS)) {
    if (action.toLowerCase().includes(key)) return value;
  }
  return 'bg-gray-100 text-gray-600 dark:bg-gray-800';
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (entityFilter) params.set('entityType', entityFilter);
      const { data } = await apiClient.get(`/audit-logs?${params}`);
      setLogs(data.data);
      if (data.meta?.meta) setMeta(data.meta.meta);
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  }, [debouncedSearch, entityFilter]);

  useEffect(() => { fetchLogs(1); }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{meta.total} log entries total — append-only, never deleted</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchLogs(meta.page)} disabled={loading} className="gap-2">
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search action, user, entity..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300"
        >
          <option value="">All entity types</option>
          <option value="user">User</option>
          <option value="event">Event</option>
          <option value="team">Team</option>
          <option value="lab">Lab</option>
          <option value="round">Round</option>
          <option value="review">Review</option>
          <option value="result">Result</option>
          <option value="lab_assignment">Lab Assignment</option>
          <option value="mentor_assignment">Mentor Assignment</option>
        </select>
      </div>

      {/* Logs */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-gray-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-medium">No audit logs found</p>
            <p className="text-sm mt-1">Audit logs appear here as actions are performed in the system.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log, i) => (
            <motion.div key={log.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                <div className="flex-shrink-0 mt-0.5">
                  <span className={`text-xs font-mono font-medium px-2 py-1 rounded-md ${getActionColor(log.action)}`}>
                    {log.action}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">{log.userName}</span>
                      {log.userRole && <span className="text-gray-400"> ({log.userRole.replace('_', ' ')})</span>}
                    </p>
                    <span className="text-xs text-gray-400">·</span>
                    <p className="text-xs text-gray-400 font-mono">{log.entityType}{log.entityId ? ` #${log.entityId.slice(0, 8)}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    <span title={log.createdAt}>{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span>
                    <span>·</span>
                    <span>{format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm:ss')}</span>
                    {log.ipAddress && <><span>·</span><span className="font-mono">{log.ipAddress}</span></>}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500">Page {meta.page} of {meta.totalPages} ({meta.total} entries)</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchLogs(meta.page - 1)} disabled={meta.page <= 1}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => fetchLogs(meta.page + 1)} disabled={meta.page >= meta.totalPages}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
