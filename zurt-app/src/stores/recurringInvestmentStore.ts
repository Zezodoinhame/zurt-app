import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RecurringInvestment, RecurringFrequency, RecurringStatus } from '../types';
import { useAuthStore } from './authStore';
import { demoRecurringInvestments } from '../data/demo';

const STORAGE_KEY = '@zurt:recurringInvestments';

interface RecurringInvestmentState {
  rules: RecurringInvestment[];
  isLoading: boolean;

  loadRules: () => Promise<void>;
  addRule: (input: Omit<RecurringInvestment, 'id' | 'createdAt' | 'status' | 'nextExecution'>) => void;
  editRule: (id: string, updates: Partial<RecurringInvestment>) => void;
  removeRule: (id: string) => void;
  toggleStatus: (id: string) => void;
  getTotalMonthly: () => number;
  getActiveCount: () => number;
}

function calcNextExecution(day: number): string {
  const now = new Date();
  let next = new Date(now.getFullYear(), now.getMonth(), day);
  if (next <= now) next = new Date(now.getFullYear(), now.getMonth() + 1, day);
  const mm = String(next.getMonth() + 1).padStart(2, '0');
  const dd = String(next.getDate()).padStart(2, '0');
  return `${next.getFullYear()}-${mm}-${dd}`;
}

export const useRecurringInvestmentStore = create<RecurringInvestmentState>((set, get) => ({
  rules: [],
  isLoading: false,

  loadRules: async () => {
    set({ isLoading: true });
    try {
      const isDemoMode = useAuthStore.getState().isDemoMode;
      if (isDemoMode) {
        set({ rules: demoRecurringInvestments, isLoading: false });
        return;
      }
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const rules = stored ? JSON.parse(stored) : demoRecurringInvestments;
      set({ rules, isLoading: false });
    } catch {
      set({ rules: demoRecurringInvestments, isLoading: false });
    }
  },

  addRule: (input) => {
    const newRule: RecurringInvestment = {
      ...input,
      id: `ri-${Date.now()}`,
      status: 'active',
      nextExecution: calcNextExecution(input.executionDay),
      createdAt: new Date().toISOString(),
    };
    const updated = [...get().rules, newRule];
    set({ rules: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  editRule: (id, updates) => {
    const updated = get().rules.map((r) => (r.id === id ? { ...r, ...updates } : r));
    set({ rules: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  removeRule: (id) => {
    const updated = get().rules.filter((r) => r.id !== id);
    set({ rules: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  toggleStatus: (id) => {
    const updated = get().rules.map((r) => {
      if (r.id !== id) return r;
      const newStatus: RecurringStatus = r.status === 'active' ? 'paused' : 'active';
      return { ...r, status: newStatus };
    });
    set({ rules: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  getTotalMonthly: () => {
    return get().rules
      .filter((r) => r.status === 'active')
      .reduce((sum, r) => {
        if (r.frequency === 'weekly') return sum + r.amount * 4;
        if (r.frequency === 'biweekly') return sum + r.amount * 2;
        return sum + r.amount;
      }, 0);
  },

  getActiveCount: () => get().rules.filter((r) => r.status === 'active').length,
}));
