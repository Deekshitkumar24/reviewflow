'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Plus, Search, Calendar, Filter, RefreshCcw, AlertCircle,
  ChevronLeft, ChevronRight, ExternalLink, MoreVertical, Edit, Link,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useDebounce } from '@/hooks/useDebounce';

interface Event {
  id: string;
  eventName: string;
  organizerName: string;
  eventDate: string;
  venue: string;
  eventType: string;
  status: string;
  totalRounds: number;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
  active: 'bg-green-500/10 text-green-400 border border-green-500/20',
  completed: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  archived: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
};

const EVENT_TYPES = ['hackathon', 'project_expo', 'demo_day', 'technical_review', 'other'];

import { useQuery } from '@tanstack/react-query';

export default function AdminEventsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ['events', { page, search: debouncedSearch, status: statusFilter, type: typeFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('eventType', typeFilter);

      const res = await apiClient.get(`/events?${params}`);
      return { events: res.data.data as Event[], meta: res.data.meta?.meta || { page: 1, limit: 25, total: 0, totalPages: 1 } };
    },
    refetchInterval: 30000,
  });

  const events = data?.events || [];
  const meta = data?.meta || { page: 1, limit: 25, total: 0, totalPages: 1 };
  const fetchEvents = (newPage?: number) => {
    if (typeof newPage === 'number') setPage(newPage);
    else refetch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Events</h1>
          <p className="text-sm text-gray-400 mt-1">{meta.total} event{meta.total !== 1 ? 's' : ''} total</p>
        </div>
        <Button onClick={() => router.push('/events/new')} className="bg-blue-600 hover:bg-blue-500 text-white gap-2">
          <Plus className="w-4 h-4" /> New Event
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-white/10 bg-[#111] text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-white/10 bg-[#111] text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All types</option>
          {EVENT_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
        <Button variant="ghost" size="sm" onClick={() => fetchEvents(meta.page)} disabled={loading}>
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Events List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl bg-white/5" />)}
        </div>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Calendar className="w-10 h-10 text-gray-500 mb-3 opacity-50" />
            <p className="font-medium text-white">No events found</p>
            <p className="text-sm text-gray-500 mt-1">{search || statusFilter ? 'Try adjusting your filters.' : 'Create your first event to get started.'}</p>
            {!search && !statusFilter && (
              <Button onClick={() => router.push('/events/new')} className="mt-4 bg-blue-600 hover:bg-blue-500 text-white gap-2"><Plus className="w-4 h-4" />New Event</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event, i) => (
            <motion.div key={event.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}>
              <Card className="h-full flex flex-col cursor-pointer" onClick={() => router.push(`/events/${event.id}`)}>
                <CardContent className="p-6 flex flex-col h-full gap-4">
                  
                  {/* Top row: Status and Actions */}
                  <div className="flex items-start justify-between">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[event.status] ?? STATUS_STYLES.draft}`}>
                      {event.status}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger onClick={(e) => e.stopPropagation()} render={<Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white border-none bg-transparent hover:bg-white/5" />}>
                        <MoreVertical className="w-5 h-5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="bg-[#111] border-white/10 text-gray-300">
                        <DropdownMenuItem className="hover:bg-white/5 hover:text-white focus:bg-white/5 focus:text-white cursor-pointer" onClick={(e) => { e.stopPropagation(); router.push(`/events/${event.id}`); }}>
                          <ExternalLink className="w-4 h-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-white/5 hover:text-white focus:bg-white/5 focus:text-white cursor-pointer" onClick={(e) => { e.stopPropagation(); router.push(`/events/${event.id}/edit`); }}>
                          <Edit className="w-4 h-4 mr-2" /> Edit Event
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem className="hover:bg-white/5 hover:text-white focus:bg-white/5 focus:text-white cursor-pointer" onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(`${window.location.origin}/coordinator/register?eventId=${event.id}`);
                          toast.success('Registration link copied to clipboard');
                        }}>
                          <Link className="w-4 h-4 mr-2" /> Copy Registration Link
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Title and Organizer */}
                  <div>
                    <h3 className="font-semibold text-lg text-white mb-1 leading-tight tracking-tight">{event.eventName}</h3>
                    <p className="text-sm text-gray-500">by {event.organizerName}</p>
                  </div>

                  <div className="mt-auto pt-4 border-t border-white/5 grid grid-cols-2 gap-y-3">
                     <div>
                       <p className="text-xs text-gray-500 mb-0.5">Date</p>
                       <p className="text-sm font-medium text-gray-300">
                         {event.eventDate ? format(new Date(event.eventDate), 'MMM d, yyyy') : '—'}
                       </p>
                     </div>
                     <div>
                       <p className="text-xs text-gray-500 mb-0.5">Type</p>
                       <p className="text-sm font-medium text-gray-300 capitalize">{event.eventType.replace('_', ' ')}</p>
                     </div>
                     <div>
                       <p className="text-xs text-gray-500 mb-0.5">Venue</p>
                       <p className="text-sm font-medium text-gray-300 max-w-full truncate pr-2">{event.venue}</p>
                     </div>
                     <div>
                       <p className="text-xs text-gray-500 mb-0.5">Rounds</p>
                       <p className="text-sm font-medium text-gray-300">{event.totalRounds}</p>
                     </div>
                  </div>

                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <p className="text-sm text-gray-500">Page {meta.page} of {meta.totalPages} ({meta.total} total)</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchEvents(meta.page - 1)} disabled={meta.page <= 1} className="bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => fetchEvents(meta.page + 1)} disabled={meta.page >= meta.totalPages} className="bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
