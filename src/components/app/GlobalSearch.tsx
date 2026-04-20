'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { useAppStore } from '@/stores/useAppStore';
import { useStudentStore } from '@/stores/useStudentStore';
import { AnimatedGlowingSearchBar } from '@/components/ui/animated-glowing-search-bar';
import {
  Calendar, Users2, FlaskConical, Users, 
  BarChart2, ShieldAlert, ArrowRight, X, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Unified search result type
interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  icon: any;
  href: string;
}

export function GlobalSearch() {
  const router = useRouter();
  const { user } = useAppStore();
  const { team } = useStudentStore();
  const activeRole = user?.role || (team ? 'student' : null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard listener for Cmd+K / Ctrl+K and ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase());
      setSelectedIndex(0);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch data only if overlay is open to save initial load time
  const { data: rawData, isLoading } = useQuery({
    queryKey: ['global-search', activeRole],
    queryFn: async () => {
      if (!activeRole) return [];
      
      const endpoints: { url: string; type: string; icon: any; path: string }[] = [];
      const results: SearchResult[] = [];

      // Build endpoints depending on role based on existing queries
      if (activeRole === 'super_admin' || activeRole === 'admin') {
        endpoints.push({ url: '/events?limit=250', type: 'EVENTS', icon: Calendar, path: '/events' });
        endpoints.push({ url: '/teams?limit=250', type: 'TEAMS', icon: Users2, path: '/teams' });
        endpoints.push({ url: '/labs?limit=250', type: 'LABS', icon: FlaskConical, path: '/labs' });
        endpoints.push({ url: '/users?limit=250', type: 'USERS', icon: Users, path: '/users' });
      } else if (activeRole === 'coordinator') {
        endpoints.push({ url: '/events?limit=250', type: 'EVENTS', icon: Calendar, path: '/coordinator/dashboard' });
        endpoints.push({ url: '/teams?limit=250', type: 'TEAMS', icon: Users2, path: '/coordinator/checkin' });
      } else if (activeRole === 'mentor') {
        endpoints.push({ url: '/mentor-assignments', type: 'LABS', icon: FlaskConical, path: '/mentor/labs' });
        endpoints.push({ url: '/teams?limit=250', type: 'TEAMS', icon: Users2, path: '/mentor/dashboard' });
      } else if (activeRole === 'student') {
        endpoints.push({ url: '/teams/my-team', type: 'TEAMS', icon: Users2, path: '/student/dashboard' });
      }

      // Execute all concurrently
      const responses = await Promise.allSettled(
        endpoints.map(ep => apiClient.get(ep.url))
      );

      responses.forEach((res, index) => {
        if (res.status === 'fulfilled' && res.value.data) {
          const ep = endpoints[index];
          const items = Array.isArray(res.value.data.data) ? res.value.data.data : 
                        (Array.isArray(res.value.data) ? res.value.data : [res.value.data]); // Handles arrays and single objects (like my-team)
          
          items.forEach((item: any) => {
            if (!item) return;

            let title = '';
            let subtitle = '';
            
            // Normalize backend schemas based on type
            if (ep.type === 'EVENTS') {
              title = item.name || 'Unnamed Event';
              subtitle = item.status || 'event';
            } else if (ep.type === 'TEAMS') {
              title = item.name || item.teamName || 'Unnamed Team';
              subtitle = item.event?.name ? `Event: ${item.event.name}` : 'team';
            } else if (ep.type === 'USERS') {
              title = item.fullName || item.name || 'Unknown User';
              subtitle = item.role || item.email || 'user';
            } else if (ep.type === 'LABS') {
              title = item.name || item.labName || `Lab ${item.id?.slice(0,4)}`;
              subtitle = item.location || 'lab';
            }

            results.push({
              id: item.id || Math.random().toString(),
              type: ep.type,
              title: String(title),
              subtitle: String(subtitle),
              icon: ep.icon,
              href: ep.path
            });
          });
        }
      });

      // Quick actions default
      results.push({
        id: 'qa-1', type: 'QUICK ACTIONS', title: 'View Settings', subtitle: 'Global preferences', icon: ShieldAlert, href: '/settings'
      });

      return results;
    },
    enabled: isOpen && !!activeRole, // Only fetch when open
    staleTime: 60000, // cache for 1 minute
  });

  // Filter Logic natively on the frontend
  const filteredResults = React.useMemo(() => {
    if (!rawData) return [];
    if (!debouncedQuery) return rawData.slice(0, 8); // show some default actions/data

    return rawData.filter(item => 
      item.title.toLowerCase().includes(debouncedQuery) || 
      item.subtitle.toLowerCase().includes(debouncedQuery) ||
      item.type.toLowerCase().includes(debouncedQuery)
    ).slice(0, 15); // limit output
  }, [rawData, debouncedQuery]);

  // Group by category
  const groupedResults = React.useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    filteredResults.forEach(r => {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    });
    return groups;
  }, [filteredResults]);

  // Flattened array for keyboard navigation indexing
  const flatResults = React.useMemo(() => {
    return Object.values(groupedResults).flat();
  }, [groupedResults]);

  useEffect(() => {
    setSelectedIndex(0); // reset index when results change
  }, [flatResults.length]);

  // Keyboard navigation inside dropdown
  const handleDropdownKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || flatResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = flatResults[selectedIndex];
      if (target) {
        setIsOpen(false);
        router.push(target.href);
      }
    }
  };

  return (
    <div className="relative w-full md:w-auto" ref={containerRef} onKeyDown={handleDropdownKeyDown}>
      <AnimatedGlowingSearchBar
        ref={inputRef}
        isSearching={isLoading && isOpen}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder="Search everything..."
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 md:w-[480px] mt-2 bg-[#111]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50 flex flex-col"
          >
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
              
              {isLoading && !rawData && (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="w-10 h-10 rounded-lg bg-white/5" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-white/5 rounded w-1/3" />
                        <div className="h-3 bg-white/5 rounded w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && flatResults.length === 0 && (
                <div className="p-8 text-center flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <X className="w-8 h-8 text-gray-500" />
                  </div>
                  <h3 className="text-white font-medium mb-1">No results found</h3>
                  <p className="text-gray-500 text-sm">We couldn't find anything matching "{query}"</p>
                </div>
              )}

              {!isLoading && flatResults.length > 0 && (
                Object.entries(groupedResults).map(([group, items]) => (
                  <div key={group} className="mb-4 last:mb-0">
                    <div className="px-3 py-2 text-[10px] font-bold tracking-widest text-gray-500 uppercase flex items-center gap-2">
                      {group}
                    </div>
                    <div className="space-y-0.5">
                      {items.map((item) => {
                        const isSelected = flatResults[selectedIndex]?.id === item.id;
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.id}
                            onMouseEnter={() => setSelectedIndex(flatResults.findIndex(r => r.id === item.id))}
                            onClick={() => {
                              setIsOpen(false);
                              router.push(item.href);
                            }}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'hover:bg-white/5 text-gray-300'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 transition-colors ${
                               isSelected ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : 'bg-[#1a1a1a] border-white/5 text-gray-400'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-100' : 'text-gray-200'}`}>
                                {item.title}
                              </p>
                              <p className="text-xs text-gray-500 truncate capitalize">{item.subtitle}</p>
                            </div>
                            {isSelected && (
                              <ArrowRight className="w-4 h-4 text-blue-400 shrink-0 animate-in slide-in-from-left-2" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
