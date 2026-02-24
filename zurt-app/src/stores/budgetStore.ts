import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MonthlyBudget, BudgetCategory, TransactionCategory } from '../types';
import { useAuthStore } from './authStore';
import { demoBudget } from '../data/demo';

const STORAGE_KEY = '@zurt:budget';

interface BudgetState {
  budget: MonthlyBudget | null;
  isLoading: boolean;
  error: string | null;

  loadBudget: () => Promise<void>;
  setCategoryLimit: (category: TransactionCategory, limit: number) => void;
  saveBudget: () => Promise<void>;
  resetBudget: () => void;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budget: null,
  isLoading: false,
  error: null,

  loadBudget: async () => {
    set({ isLoading: true, error: null });
    try {
      const isDemoMode = useAuthStore.getState().isDemoMode;
      if (isDemoMode) {
        set({ budget: demoBudget, isLoading: false });
        return;
      }
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      set({ budget: stored ? JSON.parse(stored) : null, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message ?? 'Error loading budget' });
    }
  },

  setCategoryLimit: (category, limit) => {
    const { budget } = get();
    if (!budget) return;
    const updated: MonthlyBudget = {
      ...budget,
      categories: budget.categories.map((c) =>
        c.category === category ? { ...c, limit } : c,
      ),
      totalLimit: budget.categories.reduce(
        (sum, c) => sum + (c.category === category ? limit : c.limit),
        0,
      ),
    };
    set({ budget: updated });
  },

  saveBudget: async () => {
    const { budget } = get();
    if (!budget) return;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(budget));
  },

  resetBudget: () => {
    set({ budget: demoBudget });
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },
}));
