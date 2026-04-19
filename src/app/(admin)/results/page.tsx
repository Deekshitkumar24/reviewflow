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
      <Skeleton className="h-10 w-48 bg-white/5" />
      <Skeleton className="h-24 w-full rounded-xl bg-white/5" />
      <Skeleton className="h-24 w-full rounded-xl bg-white/5" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 tracking-tight">
            <Trophy className="w-6 h-6 text-purple-500" />
            Results Management
          </h1>
          <p className="text-sm text-gray-400 mt-1">Select an active or completed event to manage results and awards.</p>
        </div>
        <Button variant="outline" size="icon" onClick={loadEvents} className="bg-transparent border-white/10 text-gray-400 hover:text-white hover:bg-white/5"><RefreshCcw className="w-4 h-4" /></Button>
      </div>

      {events.length === 0 ? (
        <Card className="border border-white/5 bg-[#111]">
          <CardContent className="py-16 text-center text-gray-500">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-white">No Eligible Events Found</p>
            <p className="text-sm mt-1">Activate or complete an event to manage its results.</p>
            <Button variant="outline" className="mt-4 bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white" onClick={() => router.push('/events')}>Go to Events</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {events.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => router.push(`/results/${event.id}`)}
              className="group cursor-pointer bg-[#111] border border-white/5 hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(37,99,235,0.15)] rounded-xl p-5 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                  event.status === 'completed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                  event.status === 'archived' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                  'bg-green-500/10 text-green-400 border-green-500/20'
                }`}>
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors tracking-tight text-lg">{event.eventName}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className={`capitalize font-medium px-2 py-0.5 rounded-full ${
                      event.status === 'completed' ? 'bg-blue-500/10 text-blue-400' :
                      event.status === 'archived' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-green-500/10 text-green-400'
                    }`}>{event.status}</span>
                    <span>•</span>
                    <span>{event.totalRounds} rounds</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
