'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Mail, Phone, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { formatDistanceToNow } from 'date-fns';
import { useDebounce } from '@/hooks/useDebounce';
import { MoreHorizontal } from 'lucide-react';

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

interface PaginationMeta { page: number; limit: number; total: number; totalPages: number; }

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  admin: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  mentor: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
  coordinator: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
};

const AVATAR_COLORS: Record<string, string> = {
  super_admin: 'bg-red-500 text-white',
  admin: 'bg-blue-500 text-white',
  mentor: 'bg-purple-500 text-white',
  coordinator: 'bg-emerald-500 text-white',
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: '', email: '', phone: '', role: 'mentor' });
  const [creating, setCreating] = useState(false);
  const debouncedSearch = useDebounce(search, 350);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      const { data } = await apiClient.get(`/users?${params}`);
      setUsers(data.data);
      if (data.meta?.meta) setMeta(data.meta.meta);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [debouncedSearch, roleFilter]);

  useEffect(() => { fetchUsers(1); }, [fetchUsers]);

  const handleCreateUser = async () => {
    if (!newUser.fullName || !newUser.email) { toast.error('Name and email required'); return; }
    setCreating(true);
    try {
      const { data } = await apiClient.post('/users', newUser);
      toast.success(`User created! Temp password: ${data.data.tempPassword}`, { duration: 15000 });
      setShowCreateDialog(false);
      setNewUser({ fullName: '', email: '', phone: '', role: 'mentor' });
      fetchUsers(1);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed to create user');
    } finally { setCreating(false); }
  };

  const handleDisable = async (userId: string) => {
    try {
      await apiClient.patch(`/users/${userId}`, { status: 'disabled' });
      toast.success('User disabled');
      fetchUsers(meta.page);
    } catch { toast.error('Failed to disable user'); }
  };

  const handleResetPassword = async (userId: string, name: string) => {
    try {
      const { data } = await apiClient.patch(`/users/${userId}`, { resetPassword: true });
      toast.success(`New temp password for ${name}: ${data.data.tempPassword}`, { duration: 20000 });
    } catch { toast.error('Failed to reset password'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{meta.total} user{meta.total !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => fetchUsers(meta.page)} disabled={loading}>
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-[#1A56DB] hover:bg-[#1044A5] gap-2">
            <Plus className="w-4 h-4" />Add User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search by name or email..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? 'all')}>
          <SelectTrigger className="w-full sm:w-40 h-9"><SelectValue /></SelectTrigger>
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
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : users.length === 0 ? (
        <Card><CardContent className="py-14 text-center text-gray-400">
          <p className="font-medium">No users found</p>
          <p className="text-sm mt-1">{ search ? 'Try adjusting your search.' : 'Add a user to get started.'}</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {users.map((user, i) => {
            const initials = user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
            return (
              <motion.div key={user.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="border border-gray-200 dark:border-gray-800">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className={`text-xs font-medium ${AVATAR_COLORS[user.role] ?? 'bg-gray-500 text-white'}`}>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{user.fullName}</h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[user.role] ?? ''}`}>{user.role.replace('_', ' ')}</span>
                        {user.status === 'disabled' && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400">Disabled</span>}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400 mt-0.5">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{user.email}</span>
                        {user.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{user.phone}</span>}
                      </div>
                    </div>
                    <div className="text-right hidden sm:block text-xs text-gray-400">
                      {user.lastLoginAt ? `Last login ${formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })}` : 'Never logged in'}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" />}>
                        <MoreHorizontal className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleResetPassword(user.id, user.fullName)}>Reset Password</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.status === 'active'
                          ? <DropdownMenuItem className="text-red-600" onClick={() => handleDisable(user.id)}>Disable Account</DropdownMenuItem>
                          : <DropdownMenuItem onClick={async () => { await apiClient.patch(`/users/${user.id}`, { status: 'active' }); fetchUsers(meta.page); }}>Re-enable Account</DropdownMenuItem>
                        }
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500">Page {meta.page} of {meta.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchUsers(meta.page - 1)} disabled={meta.page <= 1}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => fetchUsers(meta.page + 1)} disabled={meta.page >= meta.totalPages}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>A temp password will be generated and shown once after creation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5"><Label>Full Name</Label><Input placeholder="Dr. Jane Doe" value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" placeholder="jane@university.edu" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Phone (optional)</Label><Input placeholder="+91 98765 43210" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v ?? 'mentor' })}>
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
            <Button onClick={handleCreateUser} disabled={creating} className="bg-[#1A56DB]">{creating ? 'Creating...' : 'Create User'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
