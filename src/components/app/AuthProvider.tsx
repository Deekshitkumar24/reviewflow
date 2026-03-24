'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import type { AuthUser } from '@/types';

/**
 * AuthProvider — mounts at root layout level.
 * On every page load, calls POST /api/v1/auth/refresh from the httpOnly 
 * refreshToken cookie. If successful, stores the new accessToken and user
 * in Zustand so all pages have the correct auth state without re-login.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, clearAuth, accessToken } = useAppStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // If we already have a token in memory, skip (e.g., after login on same session)
    if (accessToken) return;

    const rehydrate = async () => {
      try {
        const res = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
          clearAuth();
          return;
        }
        const json = await res.json();
        if (json.success && json.data?.accessToken && json.data?.user) {
          setAuth(json.data.accessToken, json.data.user as AuthUser);

          // Apply dark mode from localStorage
          const savedDark = localStorage.getItem('reviewflow-dark-mode');
          if (savedDark === 'true') {
            document.documentElement.classList.add('dark');
            useAppStore.getState().setDarkMode(true);
          }
        }
      } catch {
        clearAuth();
      }
    };

    rehydrate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
