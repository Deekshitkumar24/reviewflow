'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, CheckCircle2, XCircle, Users, UserCheck, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ATTENDANCE_CONFIG, type AttendanceStatus } from '@/types';

interface CheckInTeam {
  id: string;
  teamName: string;
  projectTitle: string;
  collegeName: string;
  memberCount: number;
  labName: string;
  attendanceStatus: AttendanceStatus;
}

export default function CoordinatorCheckIn() {
  const [teams, setTeams] = useState<CheckInTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    setTimeout(() => {
      setTeams([
        { id: '1', teamName: 'AlgoX', projectTitle: 'AI Code Review', collegeName: 'VJIT', memberCount: 3, labName: 'Lab 101', attendanceStatus: 'checked_in' },
        { id: '2', teamName: 'ByteHackers', projectTitle: 'Collaborative IDE', collegeName: 'VJIT', memberCount: 3, labName: 'Lab 101', attendanceStatus: 'registered' },
        { id: '3', teamName: 'DevForge', projectTitle: 'Smart Navigation', collegeName: 'VJIT', memberCount: 3, labName: 'Lab 102', attendanceStatus: 'registered' },
        { id: '4', teamName: 'CloudNine', projectTitle: 'Event Management', collegeName: 'VJIT', memberCount: 3, labName: 'Lab 102', attendanceStatus: 'no_show' },
        { id: '5', teamName: 'DataWizards', projectTitle: 'Health Analytics', collegeName: 'JNTU', memberCount: 3, labName: 'Lab 201', attendanceStatus: 'registered' },
      ]);
      setLoading(false);
    }, 400);
  }, []);

  const markAttendance = async (teamId: string, status: 'checked_in' | 'no_show') => {
    setActionInProgress(teamId);
    try {
      await new Promise(r => setTimeout(r, 500));
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, attendanceStatus: status } : t));
      toast.success(status === 'checked_in' ? 'Team checked in!' : 'Marked as no-show');
    } catch {
      toast.error('Failed to update');
    } finally {
      setActionInProgress(null);
    }
  };

  const filtered = teams.filter(t =>
    t.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.projectTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search teams..."
          className="pl-10 h-11"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Team List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((team, i) => {
            const config = ATTENDANCE_CONFIG[team.attendanceStatus];
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
                        <p className="text-xs text-gray-400 mt-0.5">{team.labName} · {team.collegeName}</p>
                      </div>

                      {team.attendanceStatus === 'registered' && (
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            onClick={() => markAttendance(team.id, 'checked_in')}
                            disabled={actionInProgress === team.id}
                            className="bg-green-600 hover:bg-green-700 h-10 px-3 min-w-[44px]"
                          >
                            <UserCheck className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAttendance(team.id, 'no_show')}
                            disabled={actionInProgress === team.id}
                            className="text-red-500 border-red-200 hover:bg-red-50 h-10 px-3 min-w-[44px]"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-10">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No teams found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
