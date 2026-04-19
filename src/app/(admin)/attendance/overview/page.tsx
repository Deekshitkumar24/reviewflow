'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui/button';
import { Loader2, Download, AlertTriangle, CheckCircle, Clock, Users, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export default function AttendanceOverviewPage() {
  const activeEventId = useAppStore(s => s.activeEventId);
  const { data: events } = useQuery({
    queryKey: ['events-list'],
    queryFn: async () => (await apiClient.get('/events?limit=50')).data.data,
  });
  const [selectedEventId, setSelectedEventId] = useState(activeEventId || '');
  const [filterSlotId, setFilterSlotId] = useState('');
  const [filterLabId, setFilterLabId] = useState('');

  const params = new URLSearchParams({ eventId: selectedEventId });
  if (filterSlotId) params.set('slotId', filterSlotId);
  if (filterLabId) params.set('labId', filterLabId);

  const { data, isLoading, error } = useQuery({
    queryKey: ['attendance-overview', selectedEventId, filterSlotId, filterLabId],
    queryFn: async () => (await apiClient.get(`/attendance-overview?${params}`)).data.data,
    enabled: !!selectedEventId,
    refetchInterval: 15000,
  });

  const handleExport = async () => {
    try {
      const res = await apiClient.get(`/attendance-overview/export?eventId=${selectedEventId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = `attendance_${selectedEventId}.csv`; a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch { toast.error('Export failed'); }
  };

  const labs = data?.slots?.[0]?.labs?.map((l: any) => ({ id: l.labId, name: l.labName })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Attendance Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time attendance tracking across all labs and slots.</p>
        </div>
        {selectedEventId && (
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
        )}
      </div>

      {/* Escalation Alerts */}
      {data?.slots?.filter((s: any) => s.isEscalation).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-red-700 font-semibold">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <h3>Action Required: Missed Attendance Escalations</h3>
          </div>
          <div className="space-y-1">
            {data.slots.filter((s: any) => s.isEscalation).map((slot: any) => (
              <p key={`alert-${slot.id}`} className="text-sm text-red-600">
                Slot <strong>{slot.slotName}</strong> is past its grace period, and {slot.labs.filter((l:any) => l.status === 'missed').length} lab(s) have not submitted attendance (
                {slot.labs.filter((l:any) => l.status === 'missed').map((l:any) => l.labName).join(', ')}).
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Event</label>
          <select value={selectedEventId} onChange={e => { setSelectedEventId(e.target.value); setFilterSlotId(''); setFilterLabId(''); }}
            className="w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-2 text-sm">
            <option value="">Select event...</option>
            {events?.map((ev: any) => <option key={ev.id} value={ev.id}>{ev.eventName}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Slot</label>
          <select value={filterSlotId} onChange={e => setFilterSlotId(e.target.value)}
            className="w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-2 text-sm">
            <option value="">All slots</option>
            {data?.slots?.map((s: any) => <option key={s.id} value={s.id}>#{s.slotNumber} {s.slotName}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Lab</label>
          <select value={filterLabId} onChange={e => setFilterLabId(e.target.value)}
            className="w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-2 text-sm">
            <option value="">All labs</option>
            {labs.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Slots', value: data.summary.totalSlots, icon: Clock, color: '#6B7280' },
            { label: 'Submitted', value: data.summary.totalSubmissions, icon: CheckCircle, color: '#0E9F6E' },
            { label: 'Pending', value: data.summary.pendingSubmissions, icon: BarChart3, color: '#D97706' },
            { label: 'Missed', value: data.summary.missedSubmissions, icon: AlertTriangle, color: '#DC2626' },
          ].map(card => (
            <div key={card.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center gap-2 text-xs mb-2" style={{ color: card.color }}>
                <card.icon className="w-3.5 h-3.5" /> {card.label}
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
            </div>
          ))}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 text-xs text-emerald-600 mb-2"><Users className="w-3.5 h-3.5" /> Present</div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.summary.totalPresent}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 text-xs text-red-500 mb-2"><Users className="w-3.5 h-3.5" /> Absent</div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.summary.totalAbsent}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2"><Users className="w-3.5 h-3.5" /> Total Members</div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.summary.totalMembers}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2"><BarChart3 className="w-3.5 h-3.5" /> Total Labs</div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.summary.totalLabs}</p>
          </div>
        </div>
      )}

      {/* Slot-wise Breakdown */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#1A56DB]" /></div>
      ) : !data?.slots || data.slots.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No attendance data available.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.slots.map((slot: any) => (
            <div key={slot.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">#{slot.slotNumber} — {slot.slotName}</p>
                  <p className="text-xs text-gray-400">{new Date(slot.slotDate).toLocaleDateString()} · {slot.submittedLabs}/{slot.totalLabs} labs submitted</p>
                </div>
                <div className="flex items-center gap-2">
                  {slot.isEscalation && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Escalation
                    </span>
                  )}
                  <span className="text-xs text-gray-500">{slot.presentCount}P / {slot.absentCount}A</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Lab</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Status</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Submitted By</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {slot.labs.map((lab: any) => (
                      <tr key={lab.labId}>
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{lab.labName}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            lab.status === 'submitted' ? 'bg-emerald-50 text-emerald-600' :
                            lab.status === 'missed' ? 'bg-red-50 text-red-600' :
                            'bg-gray-50 text-gray-500'
                          }`}>{lab.status}</span>
                        </td>
                        <td className="px-4 py-2 text-gray-500">{lab.submittedBy || '—'}</td>
                        <td className="px-4 py-2 text-gray-400">{lab.submittedAt ? new Date(lab.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
