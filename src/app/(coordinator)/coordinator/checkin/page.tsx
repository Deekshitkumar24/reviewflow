'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, UserCheck, XCircle, Users, RefreshCcw, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { ATTENDANCE_CONFIG, type AttendanceStatus } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';

interface CheckInTeam {
  id: string;
  teamName: string;
  projectTitle: string;
  collegeName: string;
  department: string;
  domain: string | null;
  attendanceStatus: AttendanceStatus;
  checkedInAt: string | null;
}

interface EventOption {
  id: string;
  eventName: string;
  status: string;
}

export default function CoordinatorCheckIn() {
  const [teams, setTeams] = useState<CheckInTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Event context
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [eventsLoading, setEventsLoading] = useState(true);

  // ─── Load available events ────────────────────────────────
  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const { data } = await apiClient.get('/events?status=active&limit=50');
      const eventList: EventOption[] = (data.data ?? []).map((e: { id: string; eventName: string; status: string }) => ({
        id: e.id,
        eventName: e.eventName,
        status: e.status,
      }));
      setEvents(eventList);
      // Auto-select first active event
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

  // ─── Load teams for selected event ────────────────────────
  const loadTeams = useCallback(async () => {
    if (!selectedEventId) {
      setTeams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        eventId: selectedEventId,
        limit: '200',
      });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (statusFilter && statusFilter !== 'all') params.set('attendanceStatus', statusFilter);

      const { data } = await apiClient.get(`/teams?${params}`);
      setTeams(data.data ?? []);
    } catch {
      setError('Failed to load teams');
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, [selectedEventId, debouncedSearch, statusFilter]);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  // ─── Mark attendance (real API) ───────────────────────────
  const markAttendance = async (teamId: string, action: 'check_in' | 'no_show') => {
    setActionInProgress(teamId);
    try {
      const { data } = await apiClient.post(`/teams/${teamId}/checkin`, { action });
      // Update local state immediately for snappy UX
      setTeams(prev =>
        prev.map(t =>
          t.id === teamId
            ? { ...t, attendanceStatus: data.data.attendanceStatus, checkedInAt: data.data.checkedInAt }
            : t
        )
      );
      toast.success(action === 'check_in' ? `${data.data.teamName} checked in!` : `${data.data.teamName} marked as no-show`);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed to update attendance';
      toast.error(message);
    } finally {
      setActionInProgress(null);
    }
  };

  // ─── Undo attendance ──────────────────────────────────────
  const undoAttendance = async (teamId: string) => {
    setActionInProgress(teamId);
    try {
      const { data } = await apiClient.post(`/teams/${teamId}/checkin`, { action: 'undo' });
      setTeams(prev =>
        prev.map(t =>
          t.id === teamId
            ? { ...t, attendanceStatus: data.data.attendanceStatus as AttendanceStatus, checkedInAt: null }
            : t
        )
      );
      toast.success('Attendance reset to registered');
    } catch {
      toast.error('Failed to undo attendance');
    } finally {
      setActionInProgress(null);
    }
  };

  // ─── Stats ────────────────────────────────────────────────
  const stats = {
    total: teams.length,
    checkedIn: teams.filter(t => t.attendanceStatus === 'checked_in').length,
    pending: teams.filter(t => t.attendanceStatus === 'registered').length,
    noShow: teams.filter(t => t.attendanceStatus === 'no_show').length,
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Team Check-In</h1>
        <p className="text-sm text-gray-500 mt-0.5">Mark teams as arrived or no-show</p>
      </div>

      {/* Event Selector */}
      {eventsLoading ? (
        <Skeleton className="h-10 w-full max-w-xs rounded-lg" />
      ) : events.length === 0 ? (
        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          No active events found. Ask an admin to activate an event first.
        </div>
      ) : events.length > 1 ? (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Event:</label>
          <Select value={selectedEventId} onValueChange={(v) => setSelectedEventId(v ?? '')}>
            <SelectTrigger className="w-full max-w-xs h-10">
              <SelectValue placeholder="Select event" />
            </SelectTrigger>
            <SelectContent>
              {events.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.eventName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Event: <span className="font-medium text-gray-900 dark:text-gray-100">{events[0]?.eventName}</span>
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-green-600">{stats.checkedIn}</p>
          <p className="text-xs text-green-600">Checked In</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-amber-600">{stats.pending}</p>
          <p className="text-xs text-amber-600">Pending</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-red-600">{stats.noShow}</p>
          <p className="text-xs text-red-600">No Show</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search teams..."
            className="pl-10 h-11"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-36 h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="registered">Pending</SelectItem>
            <SelectItem value="checked_in">Checked In</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={loadTeams} disabled={loading} className="h-11 w-11 flex-shrink-0">
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Team List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={loadTeams}>Retry</Button>
          </CardContent>
        </Card>
      ) : teams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">No teams found</p>
            <p className="text-xs text-gray-400 mt-1">
              {searchQuery ? 'Try adjusting your search.' : 'No teams imported for this event yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {teams.map((team, i) => {
            const config = ATTENDANCE_CONFIG[team.attendanceStatus] ?? ATTENDANCE_CONFIG.registered;
            const isProcessing = actionInProgress === team.id;
            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="border border-gray-200 dark:border-gray-800">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{team.teamName}</h3>
                          <Badge variant="secondary" className="text-[10px]" style={{ backgroundColor: config.bg, color: config.color }}>
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{team.projectTitle}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {team.department} · {team.collegeName}
                          {team.checkedInAt && (
                            <span className="ml-2 text-green-600">
                              · Checked in at {new Date(team.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        {team.attendanceStatus === 'registered' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => markAttendance(team.id, 'check_in')}
                              disabled={isProcessing}
                              className="bg-green-600 hover:bg-green-700 h-10 px-3 min-w-[44px]"
                            >
                              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAttendance(team.id, 'no_show')}
                              disabled={isProcessing}
                              className="text-red-500 border-red-200 hover:bg-red-50 h-10 px-3 min-w-[44px]"
                            >
                              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            </Button>
                          </>
                        )}
                        {(team.attendanceStatus === 'checked_in' || team.attendanceStatus === 'no_show') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => undoAttendance(team.id)}
                            disabled={isProcessing}
                            className="text-gray-400 hover:text-gray-600 h-10 px-3 text-xs"
                          >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Undo'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Total count */}
      {!loading && teams.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Showing {teams.length} team{teams.length !== 1 ? 's' : ''} · {stats.checkedIn}/{stats.total} checked in
        </p>
      )}
    </div>
  );
}
