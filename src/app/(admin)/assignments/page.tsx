'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Trash2, RefreshCcw, UserPlus, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EventOption { id: string; eventName: string; status: string; }
interface LabOption { id: string; labName: string; }
interface RoundOption { id: string; roundName: string; }
interface UserOption { id: string; fullName: string; email: string; }

interface CoordinatorAssignment {
  id: string;
  coordinatorId: string;
  coordinatorName: string;
  coordinatorEmail: string;
  labId: string;
  labName: string;
}

interface MentorAssignment {
  id: string;
  mentorId: string;
  mentorName: string;
  mentorEmail: string;
  labId: string;
  labName: string;
  roundId: string;
  roundName: string;
}

import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function AssignmentsPage() {
  const searchParams = useSearchParams();
  const eventIdParam = searchParams.get('eventId') ?? '';
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'mentors' | 'coordinators'>('mentors');
  const [selectedEventId, setSelectedEventId] = useState(eventIdParam);
  
  // Dialog state
  const [showAssignMentor, setShowAssignMentor] = useState(false);
  const [showAssignCoord, setShowAssignCoord] = useState(false);
  const [saving, setSaving] = useState(false);


  // Dropdown options
  const [labs, setLabs] = useState<LabOption[]>([]);
  const [rounds, setRounds] = useState<RoundOption[]>([]);
  const [mentors, setMentors] = useState<UserOption[]>([]);
  const [coordinators, setCoordinators] = useState<UserOption[]>([]);

  // Forms
  const [mentorForm, setMentorForm] = useState({ mentorId: '', labId: '', roundId: '' });
  const [coordForm, setCoordForm] = useState({ coordinatorId: '', labId: '' });

  const { data: eventsData } = useQuery({
    queryKey: ['events', 'for-dropdown'],
    queryFn: async () => {
      const { data } = await apiClient.get('/events?limit=50');
      return data.data as EventOption[];
    },
  });
  const events = eventsData || [];

  useEffect(() => {
    if (!selectedEventId && events.length > 0) setSelectedEventId(events[0].id);
  }, [events, selectedEventId]);

  useEffect(() => {
    if (showAssignMentor || showAssignCoord) {
      if (!labs.length && selectedEventId) {
        apiClient.get(`/labs?eventId=${selectedEventId}`).then(res => setLabs(res.data.data ?? []));
        apiClient.get(`/events/${selectedEventId}/rounds`).then(res => setRounds(res.data.data ?? []));
      }
      if (!mentors.length && showAssignMentor) {
        apiClient.get('/users?role=mentor&limit=500').then(res => setMentors(res.data.data ?? []));
      }
      if (!coordinators.length && showAssignCoord) {
        apiClient.get('/users?role=coordinator&limit=500').then(res => setCoordinators(res.data.data ?? []));
      }
    }
  }, [showAssignMentor, showAssignCoord, selectedEventId]);

  const { data: assignmentsData, isLoading: loading, refetch: fetchData } = useQuery({
    queryKey: ['assignments', selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return { mentor: [], coord: [] };
      const [mRes, cRes] = await Promise.all([
        apiClient.get(`/mentor-assignments?eventId=${selectedEventId}`),
        apiClient.get(`/coordinator-assignments?eventId=${selectedEventId}`)
      ]);
      return {
        mentor: (mRes.data.data ?? []) as MentorAssignment[],
        coord: (cRes.data.data ?? []) as CoordinatorAssignment[]
      };
    },
    enabled: !!selectedEventId,
    refetchInterval: 30000,
  });

  const mentorAssignments = assignmentsData?.mentor || [];
  const coordAssignments = assignmentsData?.coord || [];

  const invalidateAssignments = () => {
    queryClient.invalidateQueries({ queryKey: ['assignments'] });
    queryClient.invalidateQueries({ queryKey: ['labs'] });
    queryClient.invalidateQueries({ queryKey: ['mentor', 'dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['coordinator', 'dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
  };

  const handleAssignMentor = async () => {
    if (!mentorForm.mentorId || !mentorForm.labId || !mentorForm.roundId) {
      toast.error('Please select Mentor, Lab, and Round'); return;
    }
    setSaving(true);
    try {
      await apiClient.post('/mentor-assignments', mentorForm);
      toast.success('Mentor assigned successfully');
      setShowAssignMentor(false);
      setMentorForm({ mentorId: '', labId: '', roundId: '' });
      invalidateAssignments();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to assign mentor');
    } finally { setSaving(false); }
  };

  const handleAssignCoord = async () => {
    if (!coordForm.coordinatorId || !coordForm.labId) {
      toast.error('Please select Coordinator and Lab'); return;
    }
    setSaving(true);
    try {
      await apiClient.post('/coordinator-assignments', coordForm);
      toast.success('Coordinator assigned successfully');
      setShowAssignCoord(false);
      setCoordForm({ coordinatorId: '', labId: '' });
      invalidateAssignments();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to assign coordinator');
    } finally { setSaving(false); }
  };

  const handleRemoveMentor = async (mentorId: string, labId: string, roundId: string) => {
    if (!confirm('Remove this mentor assignment?')) return;
    try {
      await apiClient.delete(`/mentor-assignments?mentorId=${mentorId}&labId=${labId}&roundId=${roundId}`);
      toast.success('Assignment removed');
      invalidateAssignments();
    } catch { toast.error('Failed to remove assignment'); }
  };

  const handleRemoveCoord = async (coordinatorId: string, labId: string) => {
    if (!confirm('Remove this coordinator assignment?')) return;
    try {
      await apiClient.delete(`/coordinator-assignments?coordinatorId=${coordinatorId}&labId=${labId}`);
      toast.success('Assignment removed');
      invalidateAssignments();
    } catch { toast.error('Failed to remove assignment'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Lab Assignments</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage mentor and coordinator lab coverage</p>
        </div>
        <div className="flex items-center gap-2">
           {events.length > 0 && (
            <Select value={selectedEventId} onValueChange={(v) => setSelectedEventId(v || '')}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Select Event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((e) => <SelectItem key={e.id} value={e.id}>{e.eventName}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button variant="ghost" size="sm" onClick={() => fetchData()} disabled={loading}><RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="mentors">Mentors</TabsTrigger>
            <TabsTrigger value="coordinators">Coordinators</TabsTrigger>
          </TabsList>
          {activeTab === 'mentors' ? (
            <Button onClick={() => setShowAssignMentor(true)} className="bg-[#1A56DB] hover:bg-[#1044A5] gap-2" size="sm">
              <UserPlus className="w-4 h-4" />Assign Mentor
            </Button>
          ) : (
            <Button onClick={() => setShowAssignCoord(true)} className="bg-orange-600 hover:bg-orange-700 gap-2" size="sm">
              <BookOpen className="w-4 h-4" />Assign Coordinator
            </Button>
          )}
        </div>

        <TabsContent value="mentors" className="mt-0 space-y-4">
          {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({length:3}).map((_,i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
          ) : mentorAssignments.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-gray-400">
              <p>No mentors assigned locally for this event.</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mentorAssignments.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card>
                    <CardHeader className="p-4 pb-2 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-medium">{a.mentorName}</CardTitle>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => handleRemoveMentor(a.mentorId, a.labId, a.roundId)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-4 pt-3 flex flex-col gap-1.5 text-sm">
                      <div className="flex justify-between text-gray-500"><span className="text-gray-400">Lab</span> <span className="font-medium text-gray-900 dark:text-gray-100">{a.labName}</span></div>
                      <div className="flex justify-between text-gray-500"><span className="text-gray-400">Round</span> <span className="font-medium text-gray-900 dark:text-gray-100">{a.roundName}</span></div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="coordinators" className="mt-0 space-y-4">
          {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({length:3}).map((_,i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
          ) : coordAssignments.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-gray-400">
              <p>No coordinators assigned to any labs for this event.</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coordAssignments.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card>
                    <CardHeader className="p-4 pb-2 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-medium">{a.coordinatorName}</CardTitle>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => handleRemoveCoord(a.coordinatorId, a.labId)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-4 pt-3 flex flex-col gap-1.5 text-sm">
                      <div className="flex justify-between text-gray-500"><span className="text-gray-400">Lab Managed</span> <span className="font-medium text-gray-900 dark:text-gray-100">{a.labName}</span></div>
                      <div className="flex justify-between text-gray-500"><span className="text-gray-400">Email</span> <span>{a.coordinatorEmail}</span></div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Assign Mentor Dialog */}
      <Dialog open={showAssignMentor} onOpenChange={setShowAssignMentor}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Assign Mentor to Lab</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Mentor</Label>
              <Select value={mentorForm.mentorId} onValueChange={(v) => setMentorForm({...mentorForm, mentorId: v || ''})}>
                <SelectTrigger className="w-full h-9"><SelectValue placeholder="Select Mentor" /></SelectTrigger>
                <SelectContent>
                  {mentors.map(m => <SelectItem key={m.id} value={m.id}>{m.fullName} ({m.email})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lab</Label>
              <Select value={mentorForm.labId} onValueChange={(v) => setMentorForm({...mentorForm, labId: v || ''})}>
                <SelectTrigger className="w-full h-9"><SelectValue placeholder="Select Lab" /></SelectTrigger>
                <SelectContent>
                  {labs.map(l => <SelectItem key={l.id} value={l.id}>{l.labName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Round</Label>
              <Select value={mentorForm.roundId} onValueChange={(v) => setMentorForm({...mentorForm, roundId: v || ''})}>
                <SelectTrigger className="w-full h-9"><SelectValue placeholder="Select Round" /></SelectTrigger>
                <SelectContent>
                  {rounds.map(r => <SelectItem key={r.id} value={r.id}>{r.roundName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignMentor(false)}>Cancel</Button>
            <Button onClick={handleAssignMentor} disabled={saving} className="bg-[#1A56DB]">{saving ? 'Assigning...' : 'Assign Mentor'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Coordinator Dialog */}
      <Dialog open={showAssignCoord} onOpenChange={setShowAssignCoord}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Assign Coordinator to Lab</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Coordinator</Label>
              <Select value={coordForm.coordinatorId} onValueChange={(v) => setCoordForm({...coordForm, coordinatorId: v || ''})}>
                <SelectTrigger className="w-full h-9"><SelectValue placeholder="Select Coordinator" /></SelectTrigger>
                <SelectContent>
                  {coordinators.map(c => <SelectItem key={c.id} value={c.id}>{c.fullName} ({c.email})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lab Managed</Label>
              <Select value={coordForm.labId} onValueChange={(v) => setCoordForm({...coordForm, labId: v || ''})}>
                <SelectTrigger className="w-full h-9"><SelectValue placeholder="Select Lab" /></SelectTrigger>
                <SelectContent>
                  {labs.map(l => <SelectItem key={l.id} value={l.id}>{l.labName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignCoord(false)}>Cancel</Button>
            <Button onClick={handleAssignCoord} disabled={saving} className="bg-orange-600 hover:bg-orange-700">{saving ? 'Assigning...' : 'Assign Coordinator'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
