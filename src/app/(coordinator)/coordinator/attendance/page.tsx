'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Clock, Users, CheckCircle, X, AlertTriangle, Send } from 'lucide-react';
import { ATTENDANCE_SLOT_STATUS_CONFIG } from '@/types';
import type { AttendanceSlotStatus } from '@/types';

export default function CoordinatorAttendancePage() {
  const user = useAppStore(s => s.user);
  const queryClient = useQueryClient();
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [selectedLabId, setSelectedLabId] = useState('');
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [countdown, setCountdown] = useState('');

  // Get coordinator's labs
  const { data: coordLabs } = useQuery({
    queryKey: ['coordinator-labs'],
    queryFn: async () => (await apiClient.get('/coordinator-labs')).data.data,
  });

  // Auto-select first lab
  useEffect(() => {
    if (coordLabs?.length > 0 && !selectedLabId) setSelectedLabId(coordLabs[0].id);
  }, [coordLabs, selectedLabId]);

  // Get event from the lab's event
  const selectedLab = coordLabs?.find((l: any) => l.id === selectedLabId);
  const eventId = selectedLab?.eventId;

  // Get slots
  const { data: slots } = useQuery({
    queryKey: ['attendance-slots', eventId],
    queryFn: async () => (await apiClient.get(`/attendance-slots?eventId=${eventId}`)).data.data,
    enabled: !!eventId,
  });

  // Auto-select active/upcoming slot
  useEffect(() => {
    if (slots?.length > 0 && !selectedSlotId) {
      const active = slots.find((s: any) => s.status === 'open' || s.status === 'grace_period') || slots[0];
      setSelectedSlotId(active.id);
    }
  }, [slots, selectedSlotId]);

  // Get attendance data
  const { data: attData, isLoading } = useQuery({
    queryKey: ['coordinator-attendance', selectedSlotId, selectedLabId],
    queryFn: async () => (await apiClient.get(`/coordinator/attendance?slotId=${selectedSlotId}&labId=${selectedLabId}`)).data.data,
    enabled: !!selectedSlotId && !!selectedLabId,
    refetchInterval: 30000,
  });

  // Initialize local state from server
  useEffect(() => {
    if (attData?.teams) {
      const map: Record<string, boolean> = {};
      attData.teams.forEach((t: any) => {
        t.members.forEach((m: any) => {
          map[m.id] = m.isPresent ?? false;
        });
      });
      setAttendanceMap(map);
    }
  }, [attData]);

  // Countdown timer
  useEffect(() => {
    if (!attData?.slot?.dueTime) return;
    const interval = setInterval(() => {
      const now = new Date();
      const due = new Date(attData.slot.dueTime);
      const graceEnd = new Date(attData.graceEndTime);
      const target = now <= due ? due : graceEnd;
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown(now <= due ? 'Due now' : 'Window closed');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${mins}m ${secs}s ${now > due ? '(grace)' : 'remaining'}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [attData]);

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const records = Object.entries(attendanceMap).map(([memberId, isPresent]) => {
        const team = attData.teams.find((t: any) => t.members.some((m: any) => m.id === memberId));
        return { memberId, teamId: team?.id || '', isPresent };
      });
      return (await apiClient.post(`/coordinator/attendance?labId=${selectedLabId}`, { slotId: selectedSlotId, records })).data;
    },
    onSuccess: () => {
      toast.success('Attendance submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['coordinator-attendance'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || 'Submission failed'),
  });

  const canSubmit = attData?.timeStatus === 'open' || attData?.timeStatus === 'grace_period';
  const isSubmitted = attData?.submission?.status === 'submitted';

  const presentCount = Object.values(attendanceMap).filter(Boolean).length;
  const totalMembers = Object.keys(attendanceMap).length;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Mark Attendance</h1>

      {/* Lab + Slot Selectors */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">Lab</label>
          <select value={selectedLabId} onChange={e => setSelectedLabId(e.target.value)}
            className="w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-2 text-sm">
            {coordLabs?.map((l: any) => <option key={l.id} value={l.id}>{l.labName}</option>)}
          </select>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">Slot</label>
          <select value={selectedSlotId} onChange={e => setSelectedSlotId(e.target.value)}
            className="w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-2 text-sm">
            {slots?.map((s: any) => <option key={s.id} value={s.id}>#{s.slotNumber} {s.slotName}</option>)}
          </select>
        </div>
      </div>

      {/* Time Status Banner */}
      {attData && (
        <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${
          attData.timeStatus === 'open' ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800' :
          attData.timeStatus === 'grace_period' ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800' :
          attData.timeStatus === 'expired' ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800' :
          'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">
              {attData.timeStatus === 'open' && 'Window Open'}
              {attData.timeStatus === 'grace_period' && 'Grace Period'}
              {attData.timeStatus === 'expired' && 'Window Closed'}
              {attData.timeStatus === 'before_start' && 'Not Started'}
            </span>
          </div>
          <span className="text-sm font-mono">{countdown}</span>
        </div>
      )}

      {/* Submitted Badge */}
      {isSubmitted && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span className="text-sm text-emerald-700 dark:text-emerald-400">
            Submitted at {new Date(attData.submission.submittedAt).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Summary */}
      {totalMembers > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400"><Users className="w-4 h-4 inline mr-1" /> {totalMembers} members</span>
          <span className="text-sm font-medium text-emerald-600">{presentCount} present · {totalMembers - presentCount} absent</span>
        </div>
      )}

      {/* Teams & Members */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
      ) : !attData?.teams || attData.teams.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No teams assigned to this lab.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {attData.teams.map((team: any) => (
            <div key={team.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{team.teamName}</span>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {team.members.map((member: any) => (
                  <div key={member.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{member.fullName}</p>
                      {member.rollNumber && <p className="text-xs text-gray-400">{member.rollNumber}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setAttendanceMap(m => ({ ...m, [member.id]: true }))}
                        disabled={!canSubmit && !isSubmitted}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                          attendanceMap[member.id] === true ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-300'
                        } ${(!canSubmit && !isSubmitted) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setAttendanceMap(m => ({ ...m, [member.id]: false }))}
                        disabled={!canSubmit && !isSubmitted}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                          attendanceMap[member.id] === false ? 'bg-red-100 dark:bg-red-900/40 text-red-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-300'
                        } ${(!canSubmit && !isSubmitted) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submit Button */}
      {canSubmit && totalMembers > 0 && (
        <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}
          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-sm font-medium sticky bottom-20 z-10 shadow-lg">
          {submitMutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
          ) : (
            <><Send className="w-4 h-4 mr-2" /> {isSubmitted ? 'Update Attendance' : 'Submit Attendance'} ({presentCount}/{totalMembers} present)</>
          )}
        </Button>
      )}

      {attData?.timeStatus === 'expired' && !isSubmitted && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-700 dark:text-red-400">Attendance window has closed. Submission was missed.</span>
        </div>
      )}
    </div>
  );
}
