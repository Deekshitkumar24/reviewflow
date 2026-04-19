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
  super_admin: 'bg-red-500/10 text-red-400 border border-red-500/20',
  admin: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  mentor: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  coordinator: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

const AVATAR_COLORS: Record<string, string> = {
  super_admin: 'bg-red-500 text-white',
  admin: 'bg-blue-500 text-white',
  mentor: 'bg-purple-500 text-white',
  coordinator: 'bg-emerald-500 text-white',
};

import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: '', email: '', phone: '', role: 'mentor' });
  const [creating, setCreating] = useState(false);
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ['users', { page, search: debouncedSearch, role: roleFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      const res = await apiClient.get(`/users?${params}`);
      return { users: res.data.data as UserItem[], meta: res.data.meta?.meta || { page: 1, limit: 25, total: 0, totalPages: 1 } };
    },
    refetchInterval: 30000,
  });

  const users = data?.users || [];
  const meta = data?.meta || { page: 1, limit: 25, total: 0, totalPages: 1 };
  const fetchUsers = (newPage?: number) => {
    if (typeof newPage === 'number') setPage(newPage);
    else refetch();
  };

  const handleCreateUser = async () => {
    if (!newUser.fullName || !newUser.email) { toast.error('Name and email required'); return; }
    setCreating(true);
    try {
      const { data } = await apiClient.post('/users', newUser);
      toast.success(`User created! Temp password: ${data.data.tempPassword}`, { duration: 15000 });
      setShowCreateDialog(false);
      setNewUser({ fullName: '', email: '', phone: '', role: 'mentor' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed to create user');
    } finally { setCreating(false); }
  };

  const handleDisable = async (userId: string) => {
    try {
      await apiClient.patch(`/users/${userId}`, { status: 'disabled' });
      toast.success('User disabled');
      queryClient.invalidateQueries({ queryKey: ['users'] });
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
          <h1 className="text-2xl font-bold text-white tracking-tight">Users</h1>
          <p className="text-sm text-gray-400 mt-1">{meta.total} user{meta.total !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => fetchUsers(meta.page)} disabled={loading} className="bg-transparent border border-white/10 text-gray-400 hover:text-white hover:bg-white/5">
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-500 text-white gap-2 border-0">
            <Plus className="w-4 h-4" />Add User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input placeholder="Search by name or email..." className="pl-9 h-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-blue-500" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? 'all')}>
          <SelectTrigger className="w-full sm:w-40 h-9 bg-[#111] border-white/10 text-gray-300 focus:ring-blue-500"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#111] border-white/10 text-gray-300">
            <SelectItem value="all" className="hover:bg-white/5 focus:bg-white/5 focus:text-white cursor-pointer">All Roles</SelectItem>
            <SelectItem value="super_admin" className="hover:bg-white/5 focus:bg-white/5 focus:text-white cursor-pointer">Super Admin</SelectItem>
            <SelectItem value="admin" className="hover:bg-white/5 focus:bg-white/5 focus:text-white cursor-pointer">Admin</SelectItem>
            <SelectItem value="mentor" className="hover:bg-white/5 focus:bg-white/5 focus:text-white cursor-pointer">Mentor</SelectItem>
            <SelectItem value="coordinator" className="hover:bg-white/5 focus:bg-white/5 focus:text-white cursor-pointer">Coordinator</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* User List */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl bg-white/5" />)}</div>
      ) : users.length === 0 ? (
        <Card><CardContent className="py-14 text-center text-gray-500">
          <p className="font-medium text-white">No users found</p>
          <p className="text-sm mt-1">{ search ? 'Try adjusting your search.' : 'Add a user to get started.'}</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {users.map((user, i) => {
            const initials = user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
            return (
              <motion.div key={user.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="bg-[#111] border-white/5 hover:bg-white/[0.02] transition-colors rounded-xl overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className={`text-xs font-medium ${AVATAR_COLORS[user.role] ?? 'bg-gray-500 text-white'}`}>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-white text-sm truncate">{user.fullName}</h3>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[user.role] ?? ''}`}>{user.role.replace('_', ' ')}</span>
                        {user.status === 'disabled' && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">Disabled</span>}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                        <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-gray-500" />{user.email}</span>
                        {user.phone && <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-gray-500" />{user.phone}</span>}
                      </div>
                    </div>
                    <div className="text-right hidden sm:block text-xs text-gray-500">
                      {user.lastLoginAt ? `Last login ${formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })}` : 'Never logged in'}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-gray-400 border-none hover:bg-white/5 hover:text-white" />}>
                        <MoreHorizontal className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#111] border-white/10 text-gray-300">
                        <DropdownMenuItem className="hover:bg-white/5 hover:text-white focus:bg-white/5 focus:text-white cursor-pointer" onClick={() => handleResetPassword(user.id, user.fullName)}>Reset Password</DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        {user.status === 'active'
                          ? <DropdownMenuItem className="text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300 cursor-pointer" onClick={() => handleDisable(user.id)}>Disable Account</DropdownMenuItem>
                          : <DropdownMenuItem className="hover:bg-white/5 hover:text-white focus:bg-white/5 focus:text-white cursor-pointer" onClick={async () => { await apiClient.patch(`/users/${user.id}`, { status: 'active' }); queryClient.invalidateQueries({ queryKey: ['users'] }); }}>Re-enable Account</DropdownMenuItem>
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
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <p className="text-sm text-gray-500">Page {meta.page} of {meta.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchUsers(meta.page - 1)} disabled={meta.page <= 1} className="bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white"><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => fetchUsers(meta.page + 1)} disabled={meta.page >= meta.totalPages} className="bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[420px] bg-[#111] border-white/10 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight text-white">Add New User</DialogTitle>
            <DialogDescription className="text-gray-500">A temp password will be generated and shown once after creation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5"><Label className="text-gray-400">Full Name</Label><Input className="bg-white/5 border-white/10 text-white focus-visible:ring-blue-500" placeholder="Dr. Jane Doe" value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-gray-400">Email</Label><Input type="email" className="bg-white/5 border-white/10 text-white focus-visible:ring-blue-500" placeholder="jane@university.edu" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-gray-400">Phone (optional)</Label><Input className="bg-white/5 border-white/10 text-white focus-visible:ring-blue-500" placeholder="+91 98765 43210" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label className="text-gray-400">Role</Label>
              <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v ?? 'mentor' })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white focus-visible:ring-blue-500"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10 text-gray-300">
                  <SelectItem value="admin" className="hover:bg-white/5 focus:bg-white/5 focus:text-white cursor-pointer">Admin</SelectItem>
                  <SelectItem value="mentor" className="hover:bg-white/5 focus:bg-white/5 focus:text-white cursor-pointer">Mentor</SelectItem>
                  <SelectItem value="coordinator" className="hover:bg-white/5 focus:bg-white/5 focus:text-white cursor-pointer">Coordinator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="bg-transparent border-white/10 text-gray-300 hover:bg-white/5 hover:text-white">Cancel</Button>
            <Button onClick={handleCreateUser} disabled={creating} className="bg-blue-600 hover:bg-blue-500 text-white border-0">{creating ? 'Creating...' : 'Create User'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
