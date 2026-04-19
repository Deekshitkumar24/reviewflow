'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Plus, Trash2, Loader2, UserPlus, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/stores/useAppStore';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const memberSchema = z.object({
  fullName: z.string().min(1, 'Required'),
  rollNumber: z.string().min(1, 'Required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  isLeader: z.boolean(),
  academicYear: z.number().int().min(1).max(6).optional(),
});

const formSchema = z.object({
  teamName: z.string().min(1, 'Team name is required'),
  projectTitle: z.string().min(1, 'Project title is required'),
  projectDescription: z.string().optional(),
  domain: z.string().optional(),
  department: z.string().min(1, 'Department is required'),
  collegeName: z.string().min(1, 'College name is required'),
  participationType: z.enum(['solo', 'duo', 'team']),
  loginEmail: z.string().email('Valid email required'),
  loginPassword: z.string().min(8, 'Min 8 characters'),
  members: z.array(memberSchema).min(1),
}).superRefine((data, ctx) => {
  if (data.participationType === 'solo' && data.members.length !== 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Solo participation requires exactly 1 member' });
  }
  if (data.participationType === 'duo' && data.members.length !== 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duo participation requires exactly 2 members' });
  }
  if (data.participationType === 'team' && (data.members.length < 3 || data.members.length > 6)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Team participation requires 3 to 6 members' });
  }
  if (data.members.filter(m => m.isLeader).length !== 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Exactly one member must be the team leader' });
  }
});

type FormData = z.infer<typeof formSchema>;

export default function CoordinatorRegisterPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId') || '';
  const queryClient = useQueryClient();
  const user = useAppStore(s => s.user);

  const { data: events } = useQuery({
    queryKey: ['events-list'],
    queryFn: async () => {
      const res = await apiClient.get('/events?limit=50');
      return res.data.data.filter((e: any) => e.status === 'active' || e.status === 'draft');
    },
  });

  const [selectedEventId, setSelectedEventId] = useState(eventId);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      participationType: 'team',
      members: [{ fullName: '', rollNumber: '', email: '', phone: '', isLeader: true }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'members' });
  const participationType = watch('participationType');

  const maxMembers = participationType === 'solo' ? 1 : participationType === 'duo' ? 2 : 6;

  const onSubmit = async (data: FormData) => {
    if (!selectedEventId) {
      toast.error('Please select an event');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/coordinator/register', {
        ...data,
        eventId: selectedEventId,
      });
      toast.success(`Team "${res.data.data.team.teamName}" registered successfully!`);
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['labs'] });
      queryClient.invalidateQueries({ queryKey: ['coordinator', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['live-monitor'] });
      router.push('/coordinator/checkin');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { code?: string; message?: string; details?: { field: string; message: string }[] } } } };
      const errData = error.response?.data?.error;
      if (errData?.code === 'DUPLICATE') {
        setError('root', { message: errData.message });
      } else if (errData?.details) {
        errData.details.forEach(d => {
          setError(d.field as any, { message: d.message });
        });
      } else {
        setError('root', { message: errData?.message || 'Registration failed' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Register Team</h1>
          <p className="text-sm text-gray-500">Register a new team for an event</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {errors.root && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {errors.root.message}
          </motion.div>
        )}

        {/* Event Selection */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Event</h2>
          <select
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
            className="w-full h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="">Select event...</option>
            {events?.map((ev: { id: string; eventName: string }) => (
              <option key={ev.id} value={ev.id}>{ev.eventName}</option>
            ))}
          </select>
        </div>

        {/* Team Info */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Team Information</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label className="text-xs">Team Name *</Label>
              <Input {...register('teamName')} className="h-10 text-sm" placeholder="Team Alpha" />
              {errors.teamName && <p className="text-xs text-red-500 mt-1">{errors.teamName.message}</p>}
            </div>
            <div>
              <Label className="text-xs">Project Title *</Label>
              <Input {...register('projectTitle')} className="h-10 text-sm" placeholder="AI-Based Attendance System" />
              {errors.projectTitle && <p className="text-xs text-red-500 mt-1">{errors.projectTitle.message}</p>}
            </div>
            <div>
              <Label className="text-xs">Project Description</Label>
              <textarea {...register('projectDescription')} className="w-full h-20 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Domain</Label>
                <Input {...register('domain')} className="h-10 text-sm" placeholder="AI/ML" />
              </div>
              <div>
                <Label className="text-xs">Department *</Label>
                <Input {...register('department')} className="h-10 text-sm" placeholder="CSE" />
                {errors.department && <p className="text-xs text-red-500 mt-1">{errors.department.message}</p>}
              </div>
            </div>
            <div>
              <Label className="text-xs">College Name *</Label>
              <Input {...register('collegeName')} className="h-10 text-sm" placeholder="VJIT" />
              {errors.collegeName && <p className="text-xs text-red-500 mt-1">{errors.collegeName.message}</p>}
            </div>
            <div>
              <Label className="text-xs">Participation Type *</Label>
              <select
                {...register('participationType')}
                className="w-full h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 text-sm"
              >
                <option value="solo">Solo (1 member)</option>
                <option value="duo">Duo (2 members)</option>
                <option value="team">Team (3-6 members)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Student Login Credentials */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Student Portal Credentials</h2>
          <p className="text-xs text-gray-500">These credentials will be given to the team for their portal access.</p>
          <div>
            <Label className="text-xs">Login Email *</Label>
            <Input {...register('loginEmail')} type="email" className="h-10 text-sm" placeholder="team@example.com" />
            {errors.loginEmail && <p className="text-xs text-red-500 mt-1">{errors.loginEmail.message}</p>}
          </div>
          <div>
            <Label className="text-xs">Password *</Label>
            <div className="relative">
              <Input
                {...register('loginPassword')}
                type={showPassword ? 'text' : 'password'}
                className="h-10 text-sm pr-10"
                placeholder="Min 8 chars, 1 uppercase, 1 number"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.loginPassword && <p className="text-xs text-red-500 mt-1">{errors.loginPassword.message}</p>}
          </div>
        </div>

        {/* Members */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Team Members ({fields.length}/{maxMembers})</h2>
            {fields.length < maxMembers && (
              <Button type="button" variant="ghost" size="sm" onClick={() => append({ fullName: '', rollNumber: '', email: '', phone: '', isLeader: false })}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            )}
          </div>
          {errors.members?.root && <p className="text-xs text-red-500">{errors.members.root.message}</p>}

          {fields.map((field, index) => (
            <div key={field.id} className="border border-gray-100 dark:border-gray-800 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Member {index + 1}</span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-gray-500">
                    <input type="checkbox" {...register(`members.${index}.isLeader`)} className="rounded" />
                    Leader
                  </label>
                  {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => remove(index)}>
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input {...register(`members.${index}.fullName`)} className="h-9 text-xs" placeholder="Full Name *" />
                  {errors.members?.[index]?.fullName && <p className="text-xs text-red-500">{errors.members[index].fullName.message}</p>}
                </div>
                <div>
                  <Input {...register(`members.${index}.rollNumber`)} className="h-9 text-xs" placeholder="Roll Number *" />
                  {errors.members?.[index]?.rollNumber && <p className="text-xs text-red-500">{errors.members[index].rollNumber.message}</p>}
                </div>
                <Input {...register(`members.${index}.email`)} className="h-9 text-xs" placeholder="Email" />
                <Input {...register(`members.${index}.phone`)} className="h-9 text-xs" placeholder="Phone" />
              </div>
            </div>
          ))}
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-sm font-medium">
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registering...</>
          ) : (
            <><UserPlus className="w-4 h-4 mr-2" /> Register Team</>
          )}
        </Button>
      </form>
    </div>
  );
}
