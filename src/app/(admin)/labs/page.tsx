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

export default function LabsPage() {
  const searchParams = useSearchParams();
  const eventIdParam = searchParams.get('eventId') ?? '';

  const [labs, setLabs] = useState<Lab[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(eventIdParam);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ labName: '', building: '', floor: '', capacity: '0' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get('/events?limit=50').then(({ data }) => {
      setEvents(data.data ?? []);
      if (!selectedEventId && data.data?.[0]) setSelectedEventId(data.data[0].id);
    });
  }, []);

  const fetchLabs = useCallback(async () => {
    if (!selectedEventId) { setLabs([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/labs?eventId=${selectedEventId}&limit=100`);
      setLabs(data.data ?? []);
    } catch { toast.error('Failed to load labs'); }
    finally { setLoading(false); }
  }, [selectedEventId]);

  useEffect(() => { fetchLabs(); }, [fetchLabs]);

  const handleCreate = async () => {
    if (!form.labName.trim()) { toast.error('Lab name required'); return; }
    if (!selectedEventId) { toast.error('Select an event first'); return; }
    setSaving(true);
    try {
      await apiClient.post('/labs', { eventId: selectedEventId, labName: form.labName.trim(), building: form.building || undefined, floor: form.floor || undefined, capacity: parseInt(form.capacity) || 0 });
      toast.success('Lab created');
      setShowCreate(false);
      setForm({ labName: '', building: '', floor: '', capacity: '0' });
      fetchLabs();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed to create lab');
    } finally { setSaving(false); }
  };

  const handleDelete = async (labId: string, labName: string) => {
    if (!confirm(`Delete lab "${labName}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/labs/${labId}`);
      toast.success('Lab deleted');
      fetchLabs();
    } catch { toast.error('Failed to delete lab'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Labs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{labs.length} lab{labs.length !== 1 ? 's' : ''} for selected event</p>
        </div>
        <div className="flex items-center gap-2">
          {events.length > 0 && (
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 max-w-[200px]"
            >
              {events.map((e) => <option key={e.id} value={e.id}>{e.eventName}</option>)}
            </select>
          )}
          <Button variant="ghost" size="sm" onClick={fetchLabs} disabled={loading}><RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
          <Button onClick={() => setShowCreate(true)} className="bg-[#1A56DB] hover:bg-[#1044A5] gap-2"><Plus className="w-4 h-4" />Add Lab</Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : labs.length === 0 ? (
        <Card><CardContent className="py-14 text-center text-gray-400">
          <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="font-medium">No labs yet</p>
          <p className="text-sm mt-1">Add labs to start assigning teams and mentors.</p>
          <Button size="sm" className="mt-4 bg-[#1A56DB]" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" />Add First Lab</Button>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {labs.map((lab, i) => (
            <motion.div key={lab.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <FlaskConical className="w-4 h-4 text-[#1A56DB] flex-shrink-0" />{lab.labName}
                      </h3>
                      {lab.building && <p className="text-xs text-gray-400 mt-0.5">{lab.building}{lab.floor ? `, Floor ${lab.floor}` : ''}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDelete(lab.id, lab.labName)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-400 mt-3">
                    <span>{lab.teamCount} teams</span>
                    <span>{lab.mentorCount} mentors</span>
                    <span>Cap: {lab.capacity}</span>
                    <span className={`ml-auto font-medium ${lab.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>{lab.status}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader><DialogTitle>Add Lab</DialogTitle></DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-1.5"><Label>Lab Name *</Label><Input placeholder="Lab A" value={form.labName} onChange={(e) => setForm({ ...form, labName: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Building</Label><Input placeholder="Block A" value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Floor</Label><Input placeholder="Ground" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Capacity (teams)</Label><Input type="number" min={0} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-[#1A56DB]">{saving ? 'Creating...' : 'Create Lab'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
