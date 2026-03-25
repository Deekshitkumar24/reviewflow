'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, Shield, Clock, CheckCircle2,
  Loader2, ArrowLeft, Lock, Save, AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { useAppStore } from '@/stores/useAppStore';

interface ProfileData {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  profileImageUrl: string | null;
  status: string;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  role: string;
  roleDisplayName: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, setAuth, accessToken } = useAppStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Change password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // ─── Load profile ─────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/auth/me');
      setProfile(data.data);
      setEditName(data.data.fullName);
      setEditPhone(data.data.phone ?? '');
    } catch {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // Track changes
  useEffect(() => {
    if (profile) {
      setHasChanges(
        editName !== profile.fullName ||
        editPhone !== (profile.phone ?? '')
      );
    }
  }, [editName, editPhone, profile]);

  // ─── Save profile ─────────────────────────────────────────
  const handleSave = async () => {
    if (!editName.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const { data } = await apiClient.patch('/auth/me', {
        fullName: editName.trim(),
        phone: editPhone.trim() || null,
      });
      setProfile(data.data);

      // Update global Zustand store so header reflects changes
      if (user && accessToken) {
        setAuth(accessToken, {
          ...user,
          fullName: data.data.fullName,
        });
      }

      setHasChanges(false);
      toast.success('Profile updated successfully');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed to update profile';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Change password ──────────────────────────────────────
  const handleChangePassword = async () => {
    if (!currentPassword) { toast.error('Current password is required'); return; }
    if (newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }

    setChangingPassword(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      toast.success('Password changed successfully');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed to change password';
      toast.error(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-6 pt-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );

  if (error || !profile) return (
    <div className="flex flex-col items-center py-20 text-center">
      <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
      <h2 className="font-semibold text-gray-900 dark:text-gray-100">Failed to load profile</h2>
      <Button variant="outline" className="mt-4" onClick={loadProfile}>Retry</Button>
    </div>
  );

  const initials = profile.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Profile</h1>
      </div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="p-6 flex items-center gap-5">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-[#1A56DB] text-white text-xl font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{profile.fullName}</h2>
            <p className="text-sm text-gray-500">{profile.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="secondary" className="capitalize">{profile.roleDisplayName || profile.role.replace('_', ' ')}</Badge>
              <Badge variant="secondary" className={profile.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}>
                {profile.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile */}
      <Card>
        <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="fullName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="pl-10 h-11"
                placeholder="Your full name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (read-only)</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="email"
                value={profile.email}
                disabled
                className="pl-10 h-11 bg-gray-50 dark:bg-gray-800/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="pl-10 h-11"
                placeholder="+91 9876543210"
              />
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="gap-2 bg-[#1A56DB] hover:bg-[#1044A5]"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader><CardTitle className="text-base">Security</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Password</p>
                <p className="text-xs text-gray-500">Change your login password</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswordForm(!showPasswordForm)}
            >
              {showPasswordForm ? 'Cancel' : 'Change Password'}
            </Button>
          </div>

          {showPasswordForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800"
            >
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-10"
                  placeholder="Min 8 characters"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-10"
                />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="gap-2"
              >
                {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {changingPassword ? 'Changing...' : 'Update Password'}
              </Button>
            </motion.div>
          )}

          <Separator />

          {/* Account info */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Role:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{profile.roleDisplayName || profile.role.replace('_', ' ')}</span>
            </div>
            {profile.lastLoginAt && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">Last login:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {new Date(profile.lastLoginAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
