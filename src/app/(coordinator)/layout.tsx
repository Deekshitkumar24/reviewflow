'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/stores/useAppStore';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, FlaskConical, LogOut, Shield, UserPlus, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { GlobalSearch } from '@/components/app/GlobalSearch';
import { TopbarAlertsBadge } from '@/components/ui/AlertsPanel';

const COORD_NAV = [
  { href: '/coordinator/dashboard', label: 'Dashboard', icon: ClipboardCheck },
  { href: '/coordinator/checkin', label: 'Check-In', icon: ClipboardCheck },
  { href: '/coordinator/register', label: 'Register', icon: UserPlus },
  { href: '/coordinator/attendance', label: 'Attendance', icon: Clock },
  { href: '/coordinator/issues', label: 'Issues', icon: AlertCircle },
];

export default function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (user?.role === 'coordinator') {
      const fetchAlerts = async () => {
        try {
          const { data } = await apiClient.get('/coordinator/attendance/status');
          setAlerts(data.data || []);
        } catch {}
      };
      fetchAlerts();
      const interval = setInterval(fetchAlerts, 60000); // 1-minute polling
      return () => clearInterval(interval);
    }
  }, [user]);

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
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center hidden sm:flex">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-gray-100 text-sm hidden sm:inline">Coordinator</span>
          </div>
          
          <div className="flex-1 mx-4 max-w-sm">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <TopbarAlertsBadge />
            <Avatar className="h-8 w-8 cursor-pointer" onClick={() => router.push('/profile')} title="My profile">
              <AvatarFallback className="bg-emerald-500 text-white text-xs">{initials}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-gray-400" title="Logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Global Attendance Alerts */}
      {alerts.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 mt-4 space-y-2">
          {alerts.map((alert, i) => (
            <motion.div 
              key={`${alert.slotId}-${alert.labId}-${i}`} 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium cursor-pointer transition-shadow
                ${alert.level === 'danger' ? 'bg-red-50 border-red-200 text-red-700' : 
                  alert.level === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' : 
                  'bg-blue-50 border-blue-200 text-blue-700'}`}
              onClick={() => router.push('/coordinator/attendance')}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{alert.message}</span>
            </motion.div>
          ))}
        </div>
      )}

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
