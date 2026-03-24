'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Search, Users, RefreshCcw, ChevronLeft, ChevronRight,
  CheckCircle, Clock, XCircle, ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import Link from 'next/link';

interface Team {
  id: string;
  teamName: string;
  projectTitle: string;
  department: string;
  collegeName: string;
  domain: string | null;
  attendanceStatus: string;
  checkedInAt: string | null;
  createdAt: string;
}

interface Meta { page: number; limit: number; total: number; totalPages: number; }

const ATTENDANCE_STYLES: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  registered: { label: 'Registered', color: 'bg-gray-100 text-gray-600', icon: Clock },
  checked_in: { label: 'Checked In', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  no_show: { label: 'No Show', color: 'bg-red-100 text-red-600', icon: XCircle },
};

export default function TeamsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultEventId = searchParams.get('eventId') ?? '';

  const [teams, setTeams] = useState<Team[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  const fetchTeams = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (statusFilter) params.set('attendanceStatus', statusFilter);
      if (defaultEventId) params.set('eventId', defaultEventId);
      const { data } = await apiClient.get(`/teams?${params}`);
      setTeams(data.data);
      if (data.meta?.meta) setMeta(data.meta.meta);
    } catch { toast.error('Failed to load teams'); }
    finally { setLoading(false); }
  }, [debouncedSearch, statusFilter, defaultEventId]);

  useEffect(() => { fetchTeams(1); }, [fetchTeams]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Teams</h1>
          <p className="text-sm text-gray-500 mt-0.5">{meta.total} team{meta.total !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/teams/import')} className="gap-2">Import CSV</Button>
          <Button variant="ghost" size="sm" onClick={() => fetchTeams(meta.page)} disabled={loading}><RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search by team or project name..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300"
        >
          <option value="">All attendance</option>
          <option value="registered">Registered</option>
          <option value="checked_in">Checked In</option>
          <option value="no_show">No Show</option>
        </select>
      </div>

      {/* Teams List */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : teams.length === 0 ? (
        <Card><CardContent className="py-14 text-center text-gray-400">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="font-medium">No teams found</p>
          <p className="text-sm mt-1">{search ? 'Try adjusting your search.' : 'Import teams from CSV or create an event first.'}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push('/teams/import')}>Import CSV</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {teams.map((team, i) => {
            const att = ATTENDANCE_STYLES[team.attendanceStatus] ?? ATTENDANCE_STYLES.registered;
            const Icon = att.icon;
            return (
              <motion.div key={team.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}>
                <Link href={`/teams/${team.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{team.teamName}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${att.color}`}>
                            <Icon className="w-3 h-3" />{att.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{team.projectTitle}</p>
                        <p className="text-xs text-gray-400">{team.department} · {team.collegeName}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500">Page {meta.page} of {meta.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchTeams(meta.page - 1)} disabled={meta.page <= 1}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => fetchTeams(meta.page + 1)} disabled={meta.page >= meta.totalPages}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
