'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/stores/useAppStore';
import { useEffect, useState } from 'react';
import { ClipboardCheck, FlaskConical, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const COORD_NAV = [
  { href: '/coordinator/checkin', label: 'Check-In', icon: ClipboardCheck },
  { href: '/coordinator/labs', label: 'Labs', icon: FlaskConical },
];

export default function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !user) router.push('/login');
    if (mounted && user && user.mustChangePassword) router.push('/change-password');
    if (mounted && user && user.role !== 'coordinator') router.push('/dashboard');
  }, [user, mounted, router]);

  const handleLogout = async () => {
    try { await apiClient.post('/auth/logout'); } catch { /* continue */ }
    clearAuth();
    toast.success('Logged out');
    router.push('/login');
  };

  if (!mounted || !user) return null;

  const initials = user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 h-14 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">Coordinator</span>
          </div>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-emerald-500 text-white text-xs">{initials}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-gray-400">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex">
        {COORD_NAV.map((item) => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium ${
                isActive ? 'text-emerald-600' : 'text-gray-400'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <main className="max-w-3xl mx-auto p-4 pb-24">
        {children}
      </main>
    </div>
  );
}
