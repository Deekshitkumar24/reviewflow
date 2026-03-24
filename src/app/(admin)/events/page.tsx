'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Plus, Search, Calendar, Filter, RefreshCcw, AlertCircle,
  ChevronLeft, ChevronRight, ExternalLink,
} from 'lucide-react';
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
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  archived: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const EVENT_TYPES = ['hackathon', 'project_expo', 'demo_day', 'technical_review', 'other'];

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  const fetchEvents = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('eventType', typeFilter);

      const { data } = await apiClient.get(`/events?${params}`);
      setEvents(data.data);
      if (data.meta?.meta) setMeta(data.meta.meta);
    } catch {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, typeFilter]);

  useEffect(() => { fetchEvents(1); }, [fetchEvents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Events</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{meta.total} event{meta.total !== 1 ? 's' : ''} total</p>
        </div>
        <Button onClick={() => router.push('/events/new')} className="bg-[#1A56DB] hover:bg-[#1044A5] gap-2">
          <Plus className="w-4 h-4" /> New Event
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300"
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
          className="h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300"
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
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Calendar className="w-10 h-10 text-gray-300 mb-3" />
            <p className="font-medium text-gray-700 dark:text-gray-300">No events found</p>
            <p className="text-sm text-gray-400 mt-1">{search || statusFilter ? 'Try adjusting your filters.' : 'Create your first event to get started.'}</p>
            {!search && !statusFilter && (
              <Button onClick={() => router.push('/events/new')} className="mt-4 bg-[#1A56DB] hover:bg-[#1044A5] gap-2"><Plus className="w-4 h-4" />New Event</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event, i) => (
            <motion.div key={event.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/events/${event.id}`)}>
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{event.eventName}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[event.status] ?? STATUS_STYLES.draft}`}>
                        {event.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {event.organizerName} · {event.venue} · {event.totalRounds} round{event.totalRounds !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 text-right">
                    <div className="hidden sm:block">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {event.eventDate ? format(new Date(event.eventDate), 'MMM d, yyyy') : '—'}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">{event.eventType.replace('_', ' ')}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-4">
          <p className="text-sm text-gray-500">Page {meta.page} of {meta.totalPages} ({meta.total} total)</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchEvents(meta.page - 1)} disabled={meta.page <= 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => fetchEvents(meta.page + 1)} disabled={meta.page >= meta.totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
