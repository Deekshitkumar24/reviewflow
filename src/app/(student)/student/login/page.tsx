'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStudentStore } from '@/stores/useStudentStore';
import { toast } from 'sonner';
import axios from 'axios';

const studentLoginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type StudentLoginFormData = z.infer<typeof studentLoginSchema>;

export default function StudentLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const setStudentAuth = useStudentStore((s) => s.setStudentAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<StudentLoginFormData>({
    resolver: zodResolver(studentLoginSchema),
  });

  const onSubmit = async (data: StudentLoginFormData) => {
    setIsLoading(true);
    try {
      const response = await axios.post('/api/v1/student/auth/login', data);
      const { accessToken, team } = response.data.data;

      setStudentAuth(accessToken, team);
      toast.success(`Welcome, ${team.teamName}`);
      router.push('/student/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { code?: string; message?: string } } } };
      const errorData = error.response?.data?.error;

      if (errorData?.code === 'ACCOUNT_LOCKED') {
        setError('root', { message: errorData.message });
      } else if (errorData?.code === 'ACCOUNT_DISABLED') {
        setError('root', { message: 'This team account has been disabled. Contact your coordinator.' });
      } else {
        setError('root', { message: 'Invalid email or password' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-950 dark:via-emerald-950/30 dark:to-gray-950 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative w-full max-w-[420px]"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-500/25 mb-4">
            <Users className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Team Portal
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sign in with credentials provided by your coordinator
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-black/20 border border-gray-200/50 dark:border-gray-800 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {errors.root && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-400"
              >
                {errors.root.message}
              </motion.div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Team login email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="team@example.com"
                className="h-11 text-sm"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="h-11 text-sm pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in to Team Portal'
              )}
            </Button>
          </form>
        </div>

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 transition-colors"
          >
            Staff login →
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-4">
          ReviewFlow v4.0 · Team Portal
        </p>
      </motion.div>
    </div>
  );
}
