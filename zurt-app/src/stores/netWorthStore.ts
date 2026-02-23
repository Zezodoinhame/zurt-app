import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NetWorthSummary, NetWorthMilestone } from '../types';
import { useAuthStore } from './authStore';
import { demoNetWorthSummary } from '../data/demo';

const STORAGE_KEY = '@zurt:networth';

interface NetWorthState {
  summary: NetWorthSummary | null;
  isLoading: boolean;
  error: string | null;

  loadNetWorth: () => Promise<void>;
  addMilestone: (milestone: Omit<NetWorthMilestone, 'id'>) => void;
  removeMilestone: (id: string) => void;
}

export const useNetWorthStore = create<NetWorthState>((set, get) => ({
  summary: null,
  isLoading: false,
  error: null,

  loadNetWorth: async () => {
    set({ isLoading: true, error: null });
    try {
      const isDemoMode = useAuthStore.getState().isDemoMode;
      if (isDemoMode) {
        set({ summary: demoNetWorthSummary, isLoading: false });
        return;
      }
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const summary = stored ? JSON.parse(stored) : demoNetWorthSummary;
      set({ summary, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message ?? 'Error loading net worth' });
    }
  },

  addMilestone: (input) => {
    const { summary } = get();
    if (!summary) return;
    const newMilestone: NetWorthMilestone = { ...input, id: `nwm-${Date.now()}` };
    const updated = { ...summary, milestones: [...summary.milestones, newMilestone] };
    set({ summary: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  removeMilestone: (id) => {
    const { summary } = get();
    if (!summary) return;
    const updated = { ...summary, milestones: summary.milestones.filter((m) => m.id !== id) };
    set({ summary: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },
}));
