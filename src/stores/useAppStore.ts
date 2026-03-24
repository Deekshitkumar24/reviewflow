import { create } from 'zustand';
import type { AuthUser, NotificationItem, LiveFeedEvent, LabStatus } from '@/types';

type ModalType = 'createUser' | 'createLab' | 'importTeams' | 'confirmAction' | 'shortcuts' | null;

interface AppStore {
  // Auth — token in MEMORY ONLY, never localStorage
  accessToken: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;

  // Active event context
  activeEventId: string | null;
  setActiveEvent: (id: string | null) => void;

  // UI state
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  toggleDarkMode: () => void;
  activeModal: ModalType;
  modalData: unknown;
  openModal: (type: ModalType, data?: unknown) => void;
  closeModal: () => void;

  // Command palette
  commandPaletteOpen: boolean;
  toggleCommandPalette: () => void;

  // Notifications
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (n: NotificationItem) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  setNotifications: (n: NotificationItem[]) => void;

  // Real-time state
  labStatuses: Record<string, LabStatus>;
  updateLabStatus: (labId: string, status: LabStatus) => void;
  socketConnected: boolean;
  setSocketConnected: (v: boolean) => void;
  liveFeed: LiveFeedEvent[];
  addLiveFeedEvent: (e: LiveFeedEvent) => void;
  clearLiveFeed: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  // Auth
  accessToken: null,
  user: null,
  setAuth: (token, user) => set({ accessToken: token, user }),
  clearAuth: () => set({ accessToken: null, user: null }),

  // Active event
  activeEventId: null,
  setActiveEvent: (id) => set({ activeEventId: id }),

  // UI
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  darkMode: false,
  setDarkMode: (v) => set({ darkMode: v }),
  toggleDarkMode: () => set((s) => {
    const newMode = !s.darkMode;
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', newMode);
      localStorage.setItem('reviewflow-dark-mode', String(newMode));
    }
    return { darkMode: newMode };
  }),
  activeModal: null,
  modalData: null,
  openModal: (type, data) => set({ activeModal: type, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  // Command palette
  commandPaletteOpen: false,
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

  // Notifications
  notifications: [],
  unreadCount: 0,
  addNotification: (n) => set((s) => ({
    notifications: [n, ...s.notifications].slice(0, 50),
    unreadCount: s.unreadCount + 1,
  })),
  markRead: (id) => set((s) => ({
    notifications: s.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n),
    unreadCount: Math.max(0, s.unreadCount - 1),
  })),
  markAllRead: () => set((s) => ({
    notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
    unreadCount: 0,
  })),
  setNotifications: (n) => set({ notifications: n, unreadCount: n.filter((x) => !x.isRead).length }),

  // Real-time
  labStatuses: {},
  updateLabStatus: (labId, status) => set((s) => ({
    labStatuses: { ...s.labStatuses, [labId]: status },
  })),
  socketConnected: false,
  setSocketConnected: (v) => set({ socketConnected: v }),
  liveFeed: [],
  addLiveFeedEvent: (e) => set((s) => ({
    liveFeed: [e, ...s.liveFeed].slice(0, 100),
  })),
  clearLiveFeed: () => set({ liveFeed: [] }),
}));
