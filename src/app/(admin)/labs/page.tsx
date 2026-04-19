'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, FlaskConical, Trash2, RefreshCcw, AlertCircle, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';

interface Lab {
  id: string;
  eventId: string;
  labName: string;
  building: string | null;
  floor: string | null;
  capacity: number;
  status: string;
  teamCount: number;
  mentorCount: number;
}

interface EventOption { id: string; eventName: string; status: string; }

import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function LabsPage() {
  const searchParams = useSearchParams();
  const eventIdParam = searchParams.get('eventId') ?? '';
  const queryClient = useQueryClient();

  const [selectedEventId, setSelectedEventId] = useState(eventIdParam);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ labName: '', building: '', floor: '', capacity: '0' });
  const [saving, setSaving] = useState(false);

  // Fetch events for dropdown
  const { data: eventsData } = useQuery({
    queryKey: ['events', 'for-dropdown'],
    queryFn: async () => {
      const { data } = await apiClient.get('/events?limit=50');
      return data.data as EventOption[];
    },
  });
  const events = eventsData || [];
  
  // Auto-select first event if URL doesn't have one
  useEffect(() => {
    if (!selectedEventId && events.length > 0) setSelectedEventId(events[0].id);
  }, [events, selectedEventId]);

  // Fetch Labs
  const { data: labsData, isLoading: loading, refetch: fetchLabs } = useQuery({
    queryKey: ['labs', selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return [];
      const { data } = await apiClient.get(`/labs?eventId=${selectedEventId}&limit=100`);
      return data.data as Lab[];
    },
    enabled: !!selectedEventId,
    refetchInterval: 30000,
  });
  const labs = labsData || [];

  const handleCreate = async () => {
    if (!form.labName.trim()) { toast.error('Lab name required'); return; }
    if (!selectedEventId) { toast.error('Select an event first'); return; }
    setSaving(true);
    try {
      await apiClient.post('/labs', { eventId: selectedEventId, labName: form.labName.trim(), building: form.building || undefined, floor: form.floor || undefined, capacity: parseInt(form.capacity) || 0 });
      toast.success('Lab created');
      setShowCreate(false);
      setForm({ labName: '', building: '', floor: '', capacity: '0' });
      queryClient.invalidateQueries({ queryKey: ['labs'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed to create lab');
    } finally { setSaving(false); }
  };

  const handleDelete = async (labId: string, labName: string) => {
    if (!confirm(`Delete lab "${labName}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/labs/${labId}`);
      toast.success('Lab deleted');
      queryClient.invalidateQueries({ queryKey: ['labs'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    } catch { toast.error('Failed to delete lab'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Labs</h1>
          <p className="text-sm text-gray-400 mt-1">{labs.length} lab{labs.length !== 1 ? 's' : ''} for selected event</p>
        </div>
        <div className="flex items-center gap-2">
          {events.length > 0 && (
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="h-9 px-3 rounded-lg border border-white/10 bg-[#111] text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px]"
            >
              {events.map((e) => <option key={e.id} value={e.id}>{e.eventName}</option>)}
            </select>
          )}
          <Button variant="ghost" size="sm" onClick={() => fetchLabs()} disabled={loading} className="text-gray-400 hover:text-white hover:bg-white/5 bg-transparent border border-white/10"><RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
          <Button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-500 text-white gap-2 border-0"><Plus className="w-4 h-4" />Add Lab</Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl bg-white/5" />)}</div>
      ) : labs.length === 0 ? (
        <Card><CardContent className="py-14 text-center text-gray-500">
          <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="font-medium text-white">No labs yet</p>
          <p className="text-sm mt-1">Add labs to start assigning teams and mentors.</p>
          <Button size="sm" className="mt-4 bg-transparent border-white/10 text-white hover:bg-white/5" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" />Add First Lab</Button>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {labs.map((lab, i) => (
            <motion.div key={lab.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
              <Card className="h-full flex flex-col hover:shadow-[0_0_15px_rgba(37,99,235,0.1)] group">
                <CardContent className="p-6 flex flex-col h-full relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0 pr-8">
                      <h3 className="font-semibold text-lg text-white flex items-center gap-2 mb-1 tracking-tight">
                        <FlaskConical className="w-4 h-4 text-purple-400 flex-shrink-0" />{lab.labName}
                      </h3>
                      {lab.building && <p className="text-sm text-gray-400">{lab.building}{lab.floor ? `, Floor ${lab.floor}` : ''}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(lab.id, lab.labName)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-3">
                    {/* Capacity Progress Bar visualization */}
                    <div className="w-full">
                       <div className="flex justify-between text-xs mb-1.5">
                         <span className="text-gray-400">Capacity</span>
                         <span className="text-gray-300 font-medium">{lab.teamCount} / {lab.capacity}</span>
                       </div>
                       <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                         <div className="h-full bg-purple-500 transition-all rounded-full" style={{ width: `${Math.min(100, (lab.teamCount / (lab.capacity || 1)) * 100)}%` }} />
                       </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{lab.mentorCount} mentors</span>
                      <span className={`font-medium px-2 py-0.5 rounded-full ${lab.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>{lab.status}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[380px] bg-[#111] border-white/10 text-white shadow-2xl">
          <DialogHeader><DialogTitle className="text-lg font-semibold tracking-tight text-white">Add Lab</DialogTitle></DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5"><Label className="text-gray-400">Lab Name *</Label><Input className="bg-white/5 border-white/10 text-white focus-visible:ring-blue-500" placeholder="Lab A" value={form.labName} onChange={(e) => setForm({ ...form, labName: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-gray-400">Building</Label><Input className="bg-white/5 border-white/10 text-white focus-visible:ring-blue-500" placeholder="Block A" value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-gray-400">Floor</Label><Input className="bg-white/5 border-white/10 text-white focus-visible:ring-blue-500" placeholder="Ground" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-gray-400">Capacity (teams)</Label><Input type="number" min={0} className="bg-white/5 border-white/10 text-white focus-visible:ring-blue-500" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="bg-transparent border-white/10 text-gray-300 hover:bg-white/5 hover:text-white">Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white border-0">{saving ? 'Creating...' : 'Create Lab'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
