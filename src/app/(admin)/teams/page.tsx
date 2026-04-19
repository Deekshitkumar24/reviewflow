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
  registered: { label: 'Registered', color: 'bg-gray-500/10 text-gray-400 border border-gray-500/20', icon: Clock },
  checked_in: { label: 'Checked In', color: 'bg-green-500/10 text-green-400 border border-green-500/20', icon: CheckCircle },
  no_show: { label: 'No Show', color: 'bg-red-500/10 text-red-400 border border-red-500/20', icon: XCircle },
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
          <h1 className="text-2xl font-bold text-white tracking-tight">Teams</h1>
          <p className="text-sm text-gray-400 mt-1">{meta.total} team{meta.total !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/teams/import')} className="gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">Import CSV</Button>
          <Button variant="ghost" size="sm" onClick={() => fetchTeams(meta.page)} disabled={loading} className="text-gray-400 hover:text-white hover:bg-white/5"><RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input placeholder="Search by team or project name..." className="pl-9 h-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-blue-500" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-white/10 bg-[#111] text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All attendance</option>
          <option value="registered">Registered</option>
          <option value="checked_in">Checked In</option>
          <option value="no_show">No Show</option>
        </select>
      </div>

      {/* Teams List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl bg-white/5" />)}
        </div>
      ) : teams.length === 0 ? (
        <Card><CardContent className="py-14 text-center text-gray-500">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50 text-gray-500" />
          <p className="font-medium text-white">No teams found</p>
          <p className="text-sm mt-1">{search ? 'Try adjusting your search.' : 'Import teams from CSV or create an event first.'}</p>
          <Button variant="outline" size="sm" className="mt-4 bg-transparent border-white/10 text-white hover:bg-white/5" onClick={() => router.push('/teams/import')}>Import CSV</Button>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team, i) => {
            const att = ATTENDANCE_STYLES[team.attendanceStatus] ?? ATTENDANCE_STYLES.registered;
            const Icon = att.icon;
            return (
              <motion.div key={team.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.025 }}>
                <Link href={`/teams/${team.id}`}>
                  <Card className="h-full flex flex-col cursor-pointer hover:shadow-[0_0_15px_rgba(37,99,235,0.1)] group">
                    <CardContent className="p-6 flex flex-col h-full gap-4 relative">
                      <ExternalLink className="absolute top-6 right-6 w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
                      
                      <div className="flex-1 min-w-0 pr-6">
                         <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 mb-3 ${att.color}`}>
                           <Icon className="w-3 h-3" />{att.label}
                         </span>
                        <h3 className="font-semibold text-lg text-white tracking-tight mb-1 truncate">{team.teamName}</h3>
                        <p className="text-sm text-gray-400 leading-snug line-clamp-2">{team.projectTitle}</p>
                      </div>

                      <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Department</p>
                          <p className="text-sm text-gray-300 font-medium truncate">{team.department}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">College</p>
                          <p className="text-sm text-gray-300 font-medium truncate max-w-[120px]">{team.collegeName}</p>
                        </div>
                      </div>
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
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <p className="text-sm text-gray-500">Page {meta.page} of {meta.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchTeams(meta.page - 1)} disabled={meta.page <= 1} className="bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white"><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => fetchTeams(meta.page + 1)} disabled={meta.page >= meta.totalPages} className="bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
