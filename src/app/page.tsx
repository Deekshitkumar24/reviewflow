'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/stores/useAppStore';
import { Loader2 } from 'lucide-react';
import HeroSection from '@/components/app/HeroSection';

export default function HomePage() {
  const router = useRouter();
  const { user } = useAppStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (user) {
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
          // Not authenticated — show hero
          setChecked(true);
      }
    } else {
      // No user — show the hero landing page
      setChecked(true);
    }
  }, [user, router]);

  /* While determining auth state, show a brief loader */
  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06070a]">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-sm text-white/40">Loading…</p>
        </div>
      </div>
    );
  }

  return <HeroSection />;
}
