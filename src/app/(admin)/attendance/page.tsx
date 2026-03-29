'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Clock, Trash2, Loader2, ChevronDown, ChevronRight, CalendarDays, AlertTriangle, CheckCircle } from 'lucide-react';
import { ATTENDANCE_SLOT_STATUS_CONFIG } from '@/types';
import type { AttendanceSlotStatus } from '@/types';

export default function AttendanceAdminPage() {
  const queryClient = useQueryClient();
  const activeEventId = useAppStore(s => s.activeEventId);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);

  // Event select
  const { data: events } = useQuery({
    queryKey: ['events-list'],
    queryFn: async () => (await apiClient.get('/events?limit=50')).data.data,
  });
  const [selectedEventId, setSelectedEventId] = useState(activeEventId || '');

  // Slots list
  const { data: slots, isLoading } = useQuery({
    queryKey: ['attendance-slots', selectedEventId],
    queryFn: async () => (await apiClient.get(`/attendance-slots?eventId=${selectedEventId}`)).data.data,
    enabled: !!selectedEventId,
  });

  // Create form state
  const [form, setForm] = useState({
    slotName: '', slotNumber: 1, slotDate: '', startTime: '', dueTime: '',
    gracePeriodMinutes: 5, reminderMinutes: '15,5', escalationEnabled: true,
  });

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => (await apiClient.post('/attendance-slots', body)).data,
    onSuccess: () => {
      toast.success('Slot created');
      queryClient.invalidateQueries({ queryKey: ['attendance-slots'] });
      setShowCreateForm(false);
      setForm({ slotName: '', slotNumber: 1, slotDate: '', startTime: '', dueTime: '', gracePeriodMinutes: 5, reminderMinutes: '15,5', escalationEnabled: true });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || 'Failed'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ slotId, status }: { slotId: string; status: string }) =>
      (await apiClient.patch(`/attendance-slots/${slotId}`, { status })).data,
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['attendance-slots'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || 'Invalid transition'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (slotId: string) => (await apiClient.delete(`/attendance-slots/${slotId}`)).data,
    onSuccess: () => {
      toast.success('Slot deleted');
      queryClient.invalidateQueries({ queryKey: ['attendance-slots'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || 'Cannot delete'),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) { toast.error('Select an event'); return; }
    createMutation.mutate({
      ...form, eventId: selectedEventId,
      slotDate: new Date(form.slotDate).toISOString(),
      startTime: new Date(`${form.slotDate}T${form.startTime}`).toISOString(),
      dueTime: new Date(`${form.slotDate}T${form.dueTime}`).toISOString(),
    });
  };

  const getNextStatuses = (current: string): string[] => {
    const map: Record<string, string[]> = {
      upcoming: ['open'], open: ['grace_period', 'completed'],
      reminder_sent: ['grace_period', 'completed'], grace_period: ['missed', 'completed'],
      missed: ['completed'], completed: [],
    };
    return map[current] || [];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Attendance Slots</h1>
          <p className="text-sm text-gray-500 mt-1">Manage attendance time slots for events.</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} className="bg-[#1A56DB] hover:bg-[#1044A5]">
          <Plus className="w-4 h-4 mr-1" /> Create Slot
        </Button>
      </div>

      {/* Event Selector */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <Label className="text-xs font-medium text-gray-500 mb-1 block">Event</Label>
        <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}
          className="w-full h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 text-sm">
          <option value="">Select event...</option>
          {events?.map((ev: { id: string; eventName: string }) => (
            <option key={ev.id} value={ev.id}>{ev.eventName}</option>
          ))}
        </select>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreate} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4 overflow-hidden">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">New Attendance Slot</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Slot Name *</Label>
                <Input value={form.slotName} onChange={e => setForm(f => ({ ...f, slotName: e.target.value }))} className="h-9 text-sm" placeholder="Morning Check-in" />
              </div>
              <div>
                <Label className="text-xs">Slot # *</Label>
                <Input type="number" value={form.slotNumber} onChange={e => setForm(f => ({ ...f, slotNumber: parseInt(e.target.value) || 1 }))} className="h-9 text-sm" min={1} />
              </div>
              <div>
                <Label className="text-xs">Date *</Label>
                <Input type="date" value={form.slotDate} onChange={e => setForm(f => ({ ...f, slotDate: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Grace Period (min)</Label>
                <Input type="number" value={form.gracePeriodMinutes} onChange={e => setForm(f => ({ ...f, gracePeriodMinutes: parseInt(e.target.value) || 5 }))} className="h-9 text-sm" min={0} max={60} />
              </div>
              <div>
                <Label className="text-xs">Start Time *</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Due Time *</Label>
                <Input type="time" value={form.dueTime} onChange={e => setForm(f => ({ ...f, dueTime: e.target.value }))} className="h-9 text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={form.escalationEnabled} onChange={e => setForm(f => ({ ...f, escalationEnabled: e.target.checked }))} className="rounded" />
                Enable escalation
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending} className="bg-[#1A56DB] hover:bg-[#1044A5]">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Create
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Slots List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#1A56DB]" /></div>
      ) : !slots || slots.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{selectedEventId ? 'No slots configured yet.' : 'Select an event to manage slots.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {slots.map((slot: any) => {
            const statusCfg = ATTENDANCE_SLOT_STATUS_CONFIG[slot.status as AttendanceSlotStatus] || ATTENDANCE_SLOT_STATUS_CONFIG.upcoming;
            const isExpanded = expandedSlot === slot.id;
            const nextStatuses = getNextStatuses(slot.status);
            return (
              <div key={slot.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <button onClick={() => setExpandedSlot(isExpanded ? null : slot.id)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: statusCfg.bg }}>
                      <Clock className="w-4 h-4" style={{ color: statusCfg.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        #{slot.slotNumber} — {slot.slotName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(slot.slotDate).toLocaleDateString()} · {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(slot.dueTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ color: statusCfg.color, backgroundColor: statusCfg.bg }}>{statusCfg.label}</span>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3 space-y-3">
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div><span className="text-gray-400">Grace:</span> <span className="text-gray-900 dark:text-gray-100">{slot.gracePeriodMinutes}min</span></div>
                          <div><span className="text-gray-400">Reminders:</span> <span className="text-gray-900 dark:text-gray-100">{slot.reminderMinutes}</span></div>
                          <div><span className="text-gray-400">Escalation:</span> <span className="text-gray-900 dark:text-gray-100">{slot.escalationEnabled ? 'On' : 'Off'}</span></div>
                        </div>
                        {nextStatuses.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-400">Change to:</span>
                            {nextStatuses.map(ns => (
                              <Button key={ns} size="sm" variant="outline" className="h-7 text-xs"
                                onClick={() => updateStatusMutation.mutate({ slotId: slot.id, status: ns })}
                                disabled={updateStatusMutation.isPending}>
                                {ATTENDANCE_SLOT_STATUS_CONFIG[ns as AttendanceSlotStatus]?.label || ns}
                              </Button>
                            ))}
                          </div>
                        )}
                        {slot.status === 'upcoming' && (
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 h-7 text-xs"
                            onClick={() => { if (confirm('Delete this slot?')) deleteMutation.mutate(slot.id); }}
                            disabled={deleteMutation.isPending}>
                            <Trash2 className="w-3 h-3 mr-1" /> Delete
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
