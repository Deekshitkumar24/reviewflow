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
  login: 'text-green-400',
  logout: 'text-gray-400',
  created: 'text-blue-400',
  updated: 'text-yellow-400',
  deleted: 'text-red-400',
  advanced: 'text-purple-400',
  declared: 'text-orange-400',
};

function getActionColor(action: string) {
  for (const [key, value] of Object.entries(ACTION_COLORS)) {
    if (action.toLowerCase().includes(key)) return value;
  }
  return 'text-gray-500';
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
          <h1 className="text-2xl font-bold text-white tracking-tight">Audit Logs</h1>
          <p className="text-sm text-gray-400 mt-0.5">{meta.total} log entries total — append-only, never deleted</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchLogs(meta.page)} disabled={loading} className="gap-2 bg-transparent border-white/10 text-gray-300 hover:text-white hover:bg-white/5">
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input placeholder="Search action, user, entity..." className="pl-9 h-9 bg-[#111] border-white/10 text-white focus-visible:ring-blue-500" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-white/10 bg-[#111] text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="" className="bg-[#111]">All entity types</option>
          <option value="user" className="bg-[#111]">User</option>
          <option value="event" className="bg-[#111]">Event</option>
          <option value="team" className="bg-[#111]">Team</option>
          <option value="lab" className="bg-[#111]">Lab</option>
          <option value="round" className="bg-[#111]">Round</option>
          <option value="review" className="bg-[#111]">Review</option>
          <option value="result" className="bg-[#111]">Result</option>
          <option value="lab_assignment" className="bg-[#111]">Lab Assignment</option>
          <option value="mentor_assignment" className="bg-[#111]">Mentor Assignment</option>
        </select>
      </div>

      {/* Logs Terminal */}
      <div className="bg-[#050505] border border-white/10 rounded-xl p-5 shadow-[inset_0_0_20px_rgba(0,0,0,1)] overflow-x-auto">
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-6 w-3/4 rounded bg-white/5" />)}</div>
        ) : logs.length === 0 ? (
          <div className="py-14 text-center text-gray-600 font-mono">
            <p className="mb-2 opacity-50">&gt; grep -r "audit" /logs</p>
            <p>&gt; return: no records found</p>
          </div>
        ) : (
          <div className="space-y-1.5 font-mono text-[13px] leading-relaxed">
            {logs.map((log, i) => (
              <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.015 }} className="flex flex-col sm:flex-row sm:items-baseline gap-2 group hover:bg-white/[0.02] p-1 rounded transition-colors whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 opacity-60 flex-shrink-0">&gt;</span>
                  <span className="text-gray-500 flex-shrink-0">[{format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}]</span>
                  <span className={`flex-shrink-0 font-bold uppercase w-24 ${getActionColor(log.action)}`}>[{log.action.replace('_', ' ')}]</span>
                </div>
                <div className="flex gap-2 items-baseline text-gray-300 truncate">
                  <span className="text-blue-400 font-medium">{log.userName}</span>
                  {log.userRole && <span className="text-gray-600 opacity-70">({log.userRole})</span>}
                  <span className="text-gray-600">→</span>
                  <span className="text-purple-400">{log.entityType}</span>
                  {log.entityId && <span className="text-purple-400/70">#{log.entityId.slice(0, 8)}</span>}
                  {log.ipAddress && <span className="text-gray-600 ml-4 hidden md:inline">ip: {log.ipAddress}</span>}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs font-mono text-gray-500">Page {meta.page} of {meta.totalPages} ({meta.total} entries)</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchLogs(meta.page - 1)} disabled={meta.page <= 1} className="bg-transparent border-white/10 text-gray-400 hover:text-white hover:bg-white/5"><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => fetchLogs(meta.page + 1)} disabled={meta.page >= meta.totalPages} className="bg-transparent border-white/10 text-gray-400 hover:text-white hover:bg-white/5"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
