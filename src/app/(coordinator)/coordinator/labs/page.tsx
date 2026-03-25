'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FlaskConical, Users, CheckCircle2, RefreshCcw, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

interface CoordLab {
  id: string;
  labName: string;
  building: string;
  teamCount: number;
  checkedInCount: number;
  capacity: number;
}

interface EventOption {
  id: string;
  eventName: string;
  status: string;
}

export default function CoordinatorLabsPage() {
  const router = useRouter();
  const [labs, setLabs] = useState<CoordLab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Event context
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [eventsLoading, setEventsLoading] = useState(true);

  // Load active events
  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const { data } = await apiClient.get('/events?status=active&limit=50');
      const eventList: EventOption[] = (data.data ?? []).map((e: { id: string; eventName: string; status: string }) => ({
        id: e.id, eventName: e.eventName, status: e.status,
      }));
      setEvents(eventList);
      if (eventList.length > 0 && !selectedEventId) {
        setSelectedEventId(eventList[0].id);
      }
    } catch {
      toast.error('Failed to load events');
    } finally {
      setEventsLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => { loadEvents(); }, []);

  const fetchLabs = useCallback(async () => {
    if (!selectedEventId) {
      setLabs([]);
      if (!eventsLoading) setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get(`/coordinator-labs?eventId=${selectedEventId}`);
      setLabs(data.data ?? []);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed to load labs';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId, eventsLoading]);

  useEffect(() => { fetchLabs(); }, [fetchLabs]);

  return (
    <div className="space-y-6">
      {/* Header & Event Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[#1A56DB]" /> Lab Overview
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Attendance status by lab</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedEventId}
            onValueChange={(val) => setSelectedEventId(val ?? '')}
            disabled={eventsLoading || events.length === 0}
          >
            <SelectTrigger className="w-[200px] h-9 text-sm">
              <SelectValue placeholder={eventsLoading ? "Loading events..." : "Select Event"} />
            </SelectTrigger>
            <SelectContent>
              {events.map((evt) => (
                <SelectItem key={evt.id} value={evt.id}>{evt.eventName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={fetchLabs} disabled={loading || !selectedEventId}>
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Retrieval Failed</p>
            <p className="opacity-90">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLabs}>Retry</Button>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : !selectedEventId && events.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-gray-400">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No active events available.</p>
        </CardContent></Card>
      ) : labs.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-gray-400">
          <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No labs configured for this event.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {labs.map((lab, i) => {
            const allPresent = lab.teamCount > 0 && lab.checkedInCount === lab.teamCount;
            const noneAssigned = lab.teamCount === 0;
            return (
              <motion.div key={lab.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="h-full border border-gray-200 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0">
                        <FlaskConical className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{lab.labName}</h3>
                        <p className="text-xs text-gray-500 truncate">{lab.building || 'No location'}</p>
                      </div>
                      <Badge variant="secondary" className={
                        allPresent ? 'bg-green-100 text-green-700' :
                        noneAssigned ? 'bg-gray-100 text-gray-500' :
                        'bg-amber-100 text-amber-700'
                      }>
                        {allPresent ? 'All Present' : noneAssigned ? 'Empty' : `${lab.teamCount - lab.checkedInCount} pending`}
                      </Badge>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{lab.checkedInCount}</span>/{lab.teamCount} teams
                        </span>
                      </div>
                      {allPresent && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
