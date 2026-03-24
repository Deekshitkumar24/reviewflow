'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Mail, Phone, MoreHorizontal, Shield, UserCheck, UserX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface UserItem {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  admin: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  mentor: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
  coordinator: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: '', email: '', phone: '', role: 'mentor' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setUsers([
        { id: '1', fullName: 'Dr. Ramesh Kumar', email: 'admin@reviewflow.app', phone: null, role: 'admin', status: 'active', lastLoginAt: '2026-03-23T10:30:00', createdAt: '2026-01-15' },
        { id: '2', fullName: 'Deekshit Kumar', email: 'superadmin@reviewflow.app', phone: null, role: 'super_admin', status: 'active', lastLoginAt: '2026-03-23T09:00:00', createdAt: '2026-01-10' },
        { id: '3', fullName: 'Dr. Priya Sharma', email: 'mentor1@reviewflow.app', phone: '+91 9876543210', role: 'mentor', status: 'active', lastLoginAt: '2026-03-22T14:20:00', createdAt: '2026-01-20' },
        { id: '4', fullName: 'Prof. Venkat Rao', email: 'mentor2@reviewflow.app', phone: '+91 9876543211', role: 'mentor', status: 'active', lastLoginAt: null, createdAt: '2026-02-01' },
        { id: '5', fullName: 'Arjun Reddy', email: 'coordinator@reviewflow.app', phone: '+91 9876543212', role: 'coordinator', status: 'active', lastLoginAt: '2026-03-23T08:45:00', createdAt: '2026-02-15' },
      ]);
      setLoading(false);
    }, 400);
  }, []);

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleCreateUser = async () => {
    if (!newUser.fullName || !newUser.email) { toast.error('Name and email required'); return; }
    setCreating(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      const tempPassword = 'Temp@' + Math.random().toString(36).slice(2, 8);
      toast.success(`User created! Temp password: ${tempPassword}`, { duration: 10000 });
      setShowCreateDialog(false);
      setNewUser({ fullName: '', email: '', phone: '', role: 'mentor' });
    } catch {
      toast.error('Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Users</h1>
          <p className="text-sm text-gray-500 mt-1">Manage mentors, coordinators, and administrators</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-[#1A56DB] hover:bg-[#1044A5]">
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search by name or email..." className="pl-10 h-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v || '')}>
          <SelectTrigger className="w-full sm:w-40 h-10">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="mentor">Mentor</SelectItem>
            <SelectItem value="coordinator">Coordinator</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* User List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((user, i) => {
            const initials = user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            return (
              <motion.div key={user.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="border border-gray-200 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className={`text-xs font-medium ${
                        user.role === 'super_admin' ? 'bg-red-500 text-white' :
                        user.role === 'admin' ? 'bg-blue-500 text-white' :
                        user.role === 'mentor' ? 'bg-purple-500 text-white' :
                        'bg-emerald-500 text-white'
                      }`}>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{user.fullName}</h3>
                        <Badge className={ROLE_COLORS[user.role]} variant="secondary">
                          {user.role.replace('_', ' ')}
                        </Badge>
                        <Badge variant="secondary" className={user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {user.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{user.email}</span>
                        {user.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{user.phone}</span>}
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-500">
                        {user.lastLoginAt ? `Last login: ${new Date(user.lastLoginAt).toLocaleDateString('en-IN')}` : 'Never logged in'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>A temporary password will be generated and shown once.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input placeholder="Dr. Jane Doe" value={newUser.fullName} onChange={(e) => setNewUser({...newUser, fullName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="jane@university.edu" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Phone (optional)</Label>
              <Input placeholder="+91 98765 43210" value={newUser.phone} onChange={(e) => setNewUser({...newUser, phone: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newUser.role} onValueChange={(v) => setNewUser({...newUser, role: v || ''})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="mentor">Mentor</SelectItem>
                  <SelectItem value="coordinator">Coordinator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={creating} className="bg-[#1A56DB]">
              {creating ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
