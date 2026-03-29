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

export default function AssignmentsPage() {
  const searchParams = useSearchParams();
  const eventIdParam = searchParams.get('eventId') ?? '';

  const [activeTab, setActiveTab] = useState<'mentors' | 'coordinators'>('mentors');
  
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(eventIdParam);
  
  const [mentorAssignments, setMentorAssignments] = useState<MentorAssignment[]>([]);
  const [coordAssignments, setCoordAssignments] = useState<CoordinatorAssignment[]>([]);
  
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    apiClient.get('/events?limit=50').then(({ data }) => {
      setEvents(data.data ?? []);
      if (!selectedEventId && data.data?.[0]) setSelectedEventId(data.data[0].id);
    });
  }, []);

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

  const fetchData = useCallback(async () => {
    if (!selectedEventId) { 
      setMentorAssignments([]);
      setCoordAssignments([]);
      setLoading(false); 
      return; 
    }
    setLoading(true);
    try {
      const [mRes, cRes] = await Promise.all([
        apiClient.get(`/mentor-assignments?eventId=${selectedEventId}`),
        apiClient.get(`/coordinator-assignments?eventId=${selectedEventId}`)
      ]);
      setMentorAssignments(mRes.data.data ?? []);
      setCoordAssignments(cRes.data.data ?? []);
    } catch {
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
      fetchData();
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
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to assign coordinator');
    } finally { setSaving(false); }
  };

  const handleRemoveMentor = async (mentorId: string, labId: string, roundId: string) => {
    if (!confirm('Remove this mentor assignment?')) return;
    try {
      await apiClient.delete(`/mentor-assignments?mentorId=${mentorId}&labId=${labId}&roundId=${roundId}`);
      toast.success('Assignment removed');
      fetchData();
    } catch { toast.error('Failed to remove assignment'); }
  };

  const handleRemoveCoord = async (coordinatorId: string, labId: string) => {
    if (!confirm('Remove this coordinator assignment?')) return;
    try {
      await apiClient.delete(`/coordinator-assignments?coordinatorId=${coordinatorId}&labId=${labId}`);
      toast.success('Assignment removed');
      fetchData();
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
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 max-w-[200px]"
            >
              {events.map((e) => <option key={e.id} value={e.id}>{e.eventName}</option>)}
            </select>
          )}
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}><RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
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
              <select className="w-full h-9 rounded-md border px-3 text-sm" value={mentorForm.mentorId} onChange={(e) => setMentorForm({...mentorForm, mentorId: e.target.value})}>
                <option value="">Select Mentor</option>
                {mentors.map(m => <option key={m.id} value={m.id}>{m.fullName} ({m.email})</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Lab</Label>
              <select className="w-full h-9 rounded-md border px-3 text-sm" value={mentorForm.labId} onChange={(e) => setMentorForm({...mentorForm, labId: e.target.value})}>
                <option value="">Select Lab</option>
                {labs.map(l => <option key={l.id} value={l.id}>{l.labName}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Round</Label>
              <select className="w-full h-9 rounded-md border px-3 text-sm" value={mentorForm.roundId} onChange={(e) => setMentorForm({...mentorForm, roundId: e.target.value})}>
                <option value="">Select Round</option>
                {rounds.map(r => <option key={r.id} value={r.id}>{r.roundName}</option>)}
              </select>
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
              <select className="w-full h-9 rounded-md border px-3 text-sm" value={coordForm.coordinatorId} onChange={(e) => setCoordForm({...coordForm, coordinatorId: e.target.value})}>
                <option value="">Select Coordinator</option>
                {coordinators.map(c => <option key={c.id} value={c.id}>{c.fullName} ({c.email})</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Lab Managed</Label>
              <select className="w-full h-9 rounded-md border px-3 text-sm" value={coordForm.labId} onChange={(e) => setCoordForm({...coordForm, labId: e.target.value})}>
                <option value="">Select Lab</option>
                {labs.map(l => <option key={l.id} value={l.id}>{l.labName}</option>)}
              </select>
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
