import { create } from 'zustand';
import type { StudentAuthUser } from '@/types';

interface StudentStore {
  studentAccessToken: string | null;
  team: StudentAuthUser | null;
  setStudentAuth: (token: string, team: StudentAuthUser) => void;
  clearStudentAuth: () => void;
}

export const useStudentStore = create<StudentStore>((set) => ({
  studentAccessToken: null,
  team: null,
  setStudentAuth: (token, team) => set({ studentAccessToken: token, team }),
  clearStudentAuth: () => set({ studentAccessToken: null, team: null }),
}));
