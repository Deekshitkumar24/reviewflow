'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Search, Calendar, MapPin, Filter, MoreHorizontal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EventItem {
  id: string;
  eventName: string;
  organizerName: string;
  eventDate: string;
  venue: string;
  status: string;
  totalRounds: number;
  teamCount: number;
  reviewedCount: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  active: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  archived: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

export default function EventListPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    // Simulated — replace with API call
    setTimeout(() => {
      setEvents([
        {
          id: '1',
          eventName: 'Tech Expo 2026',
          organizerName: 'VJIT Computer Science Department',
          eventDate: '2026-04-15',
          venue: 'VJIT Main Campus, Block A',
          status: 'active',
          totalRounds: 2,
          teamCount: 20,
          reviewedCount: 8,
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const filteredEvents = events.filter((e) => {
    const matchesSearch = e.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.organizerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Events</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your judging events and competitions
          </p>
        </div>
        <Button onClick={() => router.push('/events/new')} className="bg-[#1A56DB] hover:bg-[#1044A5]">
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search events..."
            className="pl-10 h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || '')}>
          <SelectTrigger className="w-full sm:w-40 h-10">
            <Filter className="w-4 h-4 mr-2 text-gray-400" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Event List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {searchQuery || statusFilter !== 'all' ? 'No events found' : 'No events yet'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery ? 'Try a different search term' : 'Create your first event to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={() => router.push('/events/new')} className="bg-[#1A56DB]">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className="border border-gray-200 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer shadow-sm hover:shadow-md"
                onClick={() => router.push(`/events/${event.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                          {event.eventName}
                        </h3>
                        <Badge className={STATUS_COLORS[event.status]} variant="secondary">
                          {event.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {event.organizerName}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(event.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {event.venue}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{event.teamCount}</p>
                        <p className="text-xs text-gray-500">Teams</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{event.reviewedCount}</p>
                        <p className="text-xs text-gray-500">Reviewed</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{event.totalRounds}</p>
                        <p className="text-xs text-gray-500">Rounds</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination placeholder */}
      {filteredEvents.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Showing {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}
