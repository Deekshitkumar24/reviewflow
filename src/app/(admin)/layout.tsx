'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/stores/useAppStore';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Shield,
  Moon,
  Sun,
  Search,
  Users2,
  FlaskConical,
  Activity,
  BarChart2,
  Trophy,
  UserCircle,
  Clock, 
  ClipboardCheck, 
  AlertTriangle,
  Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { GlobalSearch } from '@/components/app/GlobalSearch';
import { TopbarAlertsBadge } from '@/components/ui/AlertsPanel';
import { AIAssistantDrawer } from '@/components/app/AIAssistantDrawer';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/teams', label: 'Teams', icon: Users2 },
  { href: '/labs', label: 'Labs', icon: FlaskConical },
  { href: '/assignments', label: 'Assignments', icon: ClipboardCheck },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/attendance', label: 'Attendance Slots', icon: Clock },
  { href: '/attendance/overview', label: 'Attendance Overview', icon: FileText },
  { href: '/results', label: 'Results', icon: Trophy },
  { href: '/issues', label: 'Issues', icon: AlertTriangle },
  { href: '/live', label: 'Live Monitor', icon: Activity },
  { href: '/reports', label: 'Reports', icon: BarChart2 },
  { href: '/audit-logs', label: 'Audit Logs', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth, sidebarCollapsed, toggleSidebar, darkMode, toggleDarkMode, unreadCount } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check dark mode from localStorage
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
    if (mounted && user && !['super_admin', 'admin'].includes(user.role)) {
      router.push(`/${user.role}/dashboard`);
    }
  }, [user, mounted, router]);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Continue logout even if API call fails
    }
    clearAuth();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  if (!mounted || !user) return null;

  const initials = user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-black flex selection:bg-blue-500/30">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 56 : 240 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="fixed top-0 left-0 h-screen bg-[#111] border-r border-white/10 z-30 flex flex-col"
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-white/10">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap overflow-hidden"
                >
                  ReviewFlow
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative group overflow-hidden ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-500'
                    : 'text-gray-400 hover:bg-white/[0.04] hover:text-white'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                  />
                )}
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="px-2 py-2 border-t border-white/10">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center p-2 rounded-lg text-gray-500 hover:bg-white/5 hover:text-white transition-colors"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div
        className="flex-1 flex flex-col transition-all duration-200"
        style={{ marginLeft: sidebarCollapsed ? 56 : 240 }}
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-20 h-14 bg-[#111]/80 backdrop-blur-lg border-b border-white/10 flex items-center justify-between px-6">
          <div className="flex items-center gap-3 flex-1 lg:flex-none">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-2">
            {/* Dark mode toggle (hidden since app is fully dark mode, keeping logic if necessary, or just leaving as button) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="h-9 w-9 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Toggle dark mode"
            >
              <Moon className="w-4 h-4 text-blue-400" />
            </Button>

            {/* Notifications */}
            <TopbarAlertsBadge />

            <Separator orientation="vertical" className="h-6 mx-1 bg-white/10" />

            {/* User Menu */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => router.push('/profile')}
                className="flex items-center gap-2.5 rounded-lg hover:bg-white/5 px-2 py-1 transition-colors group"
                title="View profile"
              >
                <Avatar className="h-8 w-8 ring-2 ring-transparent group-hover:ring-blue-500/50 transition-all">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-white leading-tight transition-colors group-hover:text-blue-400">
                    {user.fullName}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user.role.replace('_', ' ')}
                  </p>
                </div>
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/profile')}
                className="h-8 w-8 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                aria-label="My profile"
                title="My profile"
              >
                <UserCircle className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 relative">
          <div className="max-w-[1280px] mx-auto">
            {children}
          </div>
          
          {/* AI Assistant FAB */}
          <button
            onClick={() => setIsAssistantOpen(true)}
            className="fixed bottom-6 right-6 p-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-2xl hover:shadow-blue-500/20 transition-all z-30 flex items-center justify-center group"
            aria-label="Open AI Assistant"
            title="Ask AI Assistant"
          >
             <Bot className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>
        </main>
        
        <AIAssistantDrawer 
          isOpen={isAssistantOpen}
          onClose={() => setIsAssistantOpen(false)}
        />
      </div>
    </div>
  );
}
