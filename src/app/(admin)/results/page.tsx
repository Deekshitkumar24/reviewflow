'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy, Calendar, ChevronRight, AlertCircle, RefreshCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';

interface EventMeta {
  id: string;
  eventName: string;
  status: string;
  totalRounds: number;
}

export default function ResultsIndexPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = async () => {
    setLoading(true);
    try {
      // Fetch all events, filter active/completed client-side for simplicity,
      // or rely on a query param if supported by API. We'll fetch all and filter.
      const { data } = await apiClient.get('/events');
      const allEvents = data.data as EventMeta[];
      setEvents(allEvents.filter(e => ['active', 'completed', 'archived'].includes(e.status)));
    } catch {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEvents(); }, []);

  if (loading) return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[#1A56DB]" />
            Results Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Select an active or completed event to manage results and awards.</p>
        </div>
        <Button variant="outline" size="icon" onClick={loadEvents}><RefreshCcw className="w-4 h-4" /></Button>
      </div>

      {events.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-gray-400">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-gray-600 dark:text-gray-300">No Eligible Events Found</p>
            <p className="text-sm mt-1">Activate or complete an event to manage its results.</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push('/events')}>Go to Events</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {events.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => router.push(`/results/${event.id}`)}
              className="group cursor-pointer bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-[#1A56DB]/50 hover:shadow-md rounded-xl p-5 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  event.status === 'completed' ? 'bg-blue-50 text-blue-600' :
                  event.status === 'archived' ? 'bg-yellow-50 text-yellow-600' :
                  'bg-green-50 text-green-600'
                }`}>
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-[#1A56DB] transition-colors">{event.eventName}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="capitalize font-medium">{event.status}</span>
                    <span>•</span>
                    <span>{event.totalRounds} rounds</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#1A56DB] group-hover:translate-x-1 transition-all" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
