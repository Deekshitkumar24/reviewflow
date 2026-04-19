'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useStudentStore } from '@/stores/useStudentStore';
import { useEffect, useState } from 'react';
import { Users, LayoutDashboard, CheckCircle, AlertTriangle, BarChart3, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import axios from 'axios';
import { GlobalSearch } from '@/components/app/GlobalSearch';

const STUDENT_NAV = [
  { href: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/student/readiness', label: 'Readiness', icon: CheckCircle },
  { href: '/student/issues', label: 'Issues', icon: AlertTriangle },
  { href: '/student/evaluation', label: 'Evaluation', icon: BarChart3 },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { team, clearStudentAuth } = useStudentStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !team && pathname !== '/student/login') {
      router.push('/student/login');
    }
  }, [team, mounted, router, pathname]);

  // Don't render layout chrome on login page
  if (pathname === '/student/login') {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    try { await axios.post('/api/v1/student/auth/logout'); } catch { /* continue */ }
    clearStudentAuth();
    toast.success('Logged out');
    router.push('/student/login');
  };

  if (!mounted || !team) return null;

  const initials = team.teamName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 h-14 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center hidden sm:flex">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight hidden sm:block">{team.teamName}</span>
              <span className="text-[10px] text-gray-400 leading-tight hidden sm:block">Team Portal</span>
            </div>
          </div>
          
          <div className="flex-1 mx-4 max-w-sm">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-emerald-600 text-white text-xs">{initials}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-gray-400" title="Logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex">
        {STUDENT_NAV.map((item) => {
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
