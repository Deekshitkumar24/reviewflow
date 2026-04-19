'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/stores/useAppStore';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  FlaskConical,
  ClipboardList,
  LogOut,
  Bell,
  Shield,
  Moon,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { GlobalSearch } from '@/components/app/GlobalSearch';

const MENTOR_NAV = [
  { href: '/mentor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/mentor/labs', label: 'My Labs', icon: FlaskConical },
  { href: '/mentor/reviews', label: 'My Reviews', icon: ClipboardList },
];

export default function MentorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth, darkMode, toggleDarkMode, unreadCount } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('reviewflow-dark-mode');
    if (saved === 'true') {
      document.documentElement.classList.add('dark');
      useAppStore.getState().setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (mounted && !user) {
      router.push('/login');
    }
    if (mounted && user && user.mustChangePassword) {
      router.push('/change-password');
    }
    if (mounted && user && user.role !== 'mentor') {
      router.push('/dashboard');
    }
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
        <div className="max-w-5xl mx-auto h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1A56DB] flex items-center justify-center hidden sm:flex">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-gray-100 hidden sm:inline">ReviewFlow</span>
          </div>

          <div className="flex-1 mx-4 max-w-sm">
            <GlobalSearch />
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            {MENTOR_NAV.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-[#1A56DB] dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="h-9 w-9">
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] bg-red-500 text-white rounded-full">
                  {unreadCount}
                </Badge>
              )}
            </Button>
            <Avatar className="h-8 w-8 cursor-pointer" onClick={() => router.push('/profile')} title="My profile">
              <AvatarFallback className="bg-[#1A56DB] text-white text-xs">{initials}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-gray-400 hover:text-red-500">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex">
        {MENTOR_NAV.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                isActive ? 'text-[#1A56DB]' : 'text-gray-400'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <main className="max-w-5xl mx-auto p-4 pb-20 sm:pb-6">
        {children}
      </main>
    </div>
  );
}
