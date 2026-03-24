'use client';

import { useState, useEffect } from 'react';
import { Search, FileText, Clock, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AuditItem {
  id: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
  logout: 'bg-gray-100 text-gray-600',
  created: 'bg-blue-100 text-blue-700',
  updated: 'bg-amber-100 text-amber-700',
  deleted: 'bg-red-100 text-red-700',
};

function actionColor(action: string) {
  for (const key of Object.keys(ACTION_COLORS)) {
    if (action.includes(key)) return ACTION_COLORS[key];
  }
  return 'bg-gray-100 text-gray-600';
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');

  useEffect(() => {
    setTimeout(() => {
      setLogs([
        { id: '1', userName: 'Dr. Ramesh Kumar', action: 'event.created', entityType: 'event', entityId: 'evt-1', createdAt: '2026-03-23T10:30:00' },
        { id: '2', userName: 'Dr. Ramesh Kumar', action: 'user.created', entityType: 'user', entityId: 'usr-3', createdAt: '2026-03-23T10:25:00' },
        { id: '3', userName: 'Dr. Priya Sharma', action: 'user.login', entityType: 'user', entityId: 'usr-3', createdAt: '2026-03-23T10:20:00' },
        { id: '4', userName: 'System', action: 'round.opened', entityType: 'round', entityId: 'rnd-1', createdAt: '2026-03-23T10:15:00' },
        { id: '5', userName: 'Dr. Priya Sharma', action: 'review.submitted', entityType: 'review', entityId: 'rev-1', createdAt: '2026-03-23T11:00:00' },
      ]);
      setLoading(false);
    }, 400);
  }, []);

  const filtered = logs.filter(l => {
    const matchesSearch = l.userName.toLowerCase().includes(search.toLowerCase()) || l.action.includes(search.toLowerCase());
    const matchesEntity = entityFilter === 'all' || l.entityType === entityFilter;
    return matchesSearch && matchesEntity;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-1">Immutable log of all system actions</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search by user or action..." className="pl-10 h-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={entityFilter} onValueChange={(v) => setEntityFilter(v || 'all')}>
          <SelectTrigger className="w-full sm:w-40 h-10"><SelectValue placeholder="Entity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="event">Event</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="round">Round</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(log => (
            <Card key={log.id} className="border border-gray-100 dark:border-gray-800">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.userName}</span>
                    <Badge variant="secondary" className={`text-[10px] ${actionColor(log.action)}`}>
                      {log.action}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">{log.entityType} · {log.entityId}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
