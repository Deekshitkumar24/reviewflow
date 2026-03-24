'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/stores/useAppStore';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user } = useAppStore();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.mustChangePassword) {
      router.push('/change-password');
      return;
    }
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
      default:
        router.push('/login');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#1A56DB] mx-auto mb-3" />
        <p className="text-sm text-gray-500">Redirecting...</p>
      </div>
    </div>
  );
}
