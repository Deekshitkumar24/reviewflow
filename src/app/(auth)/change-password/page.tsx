'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Shield, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/stores/useAppStore';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const changePasswordSchema = z.object({
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, 'Must contain special character'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ChangePasswordData = z.infer<typeof changePasswordSchema>;

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Special character', test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
];

export default function ChangePasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user, accessToken } = useAppStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const watchPassword = watch('newPassword', '');

  const onSubmit = async (data: ChangePasswordData) => {
    setIsLoading(true);
    try {
      await apiClient.post('/auth/change-password', {
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      toast.success('Password changed successfully');

      // Redirect based on role
      if (user) {
        switch (user.role) {
          case 'super_admin':
          case 'admin':
            router.push('/dashboard');
            break;
          case 'mentor':
            router.push('/mentor/dashboard');
            break;
          case 'coordinator':
            router.push('/coordinator/checkin');
            break;
        }
      } else {
        router.push('/login');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setError('root', {
        message: error.response?.data?.error?.message || 'Failed to change password',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-[420px]"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500 shadow-lg shadow-amber-500/25 mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Set New Password
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            You must change your password before continuing
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-black/20 border border-gray-200/50 dark:border-gray-800 p-8">
          {/* Amber warning banner */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 text-sm text-amber-700 dark:text-amber-400 mb-6">
            First-time login detected. Please set a new secure password to continue.
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {errors.root && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-400">
                {errors.root.message}
              </div>
            )}

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                className="h-11"
                {...register('newPassword')}
              />
              {errors.newPassword && (
                <p className="text-xs text-red-500">{errors.newPassword.message}</p>
              )}
            </div>

            {/* Strength Meter */}
            <div className="space-y-2">
              {PASSWORD_RULES.map((rule) => {
                const passed = rule.test(watchPassword);
                return (
                  <div key={rule.label} className="flex items-center gap-2 text-xs">
                    {passed ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-gray-300" />
                    )}
                    <span className={passed ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
                      {rule.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="h-11"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11 bg-[#1A56DB] hover:bg-[#1044A5]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Set Password & Continue'
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
