import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MonthlyBudget, TransactionCategory } from '../types';
import { useAuthStore } from './authStore';
import { demoBudget } from '../data/demo';

const STORAGE_KEY = '@zurt:budget';

// Default budget when user has no stored budget (non-demo)
const DEFAULT_BUDGET: MonthlyBudget = {
  month: new Date().toISOString().slice(0, 7),
  totalLimit: 5000,
  totalSpent: 0,
  categories: [
    { category: 'food' as TransactionCategory, limit: 1500, spent: 0, color: '#FF6B6B', icon: '\uD83C\uDF5B' },
    { category: 'transport' as TransactionCategory, limit: 750, spent: 0, color: '#4ECDC4', icon: '\uD83D\uDE97' },
    { category: 'subscriptions' as TransactionCategory, limit: 500, spent: 0, color: '#45B7D1', icon: '\uD83D\uDCF1' },
    { category: 'shopping' as TransactionCategory, limit: 500, spent: 0, color: '#96CEB4', icon: '\uD83D\uDED2' },
    { category: 'fuel' as TransactionCategory, limit: 400, spent: 0, color: '#FFEAA7', icon: '\u26FD' },
    { category: 'health' as TransactionCategory, limit: 500, spent: 0, color: '#DDA0DD', icon: '\u{1FA7A}' },
    { category: 'travel' as TransactionCategory, limit: 350, spent: 0, color: '#74B9FF', icon: '\u2708\uFE0F' },
    { category: 'tech' as TransactionCategory, limit: 500, spent: 0, color: '#A29BFE', icon: '\uD83D\uDCBB' },
  ],
};

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
      if (stored) {
        set({ budget: JSON.parse(stored), isLoading: false });
      } else {
        // Initialize with default budget so user sees something useful
        const budget = { ...DEFAULT_BUDGET, month: new Date().toISOString().slice(0, 7) };
        set({ budget, isLoading: false });
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(budget));
      }
    } catch (err: any) {
      set({ isLoading: false, error: err?.message ?? 'Erro ao carregar orçamento' });
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
    const budget = { ...DEFAULT_BUDGET, month: new Date().toISOString().slice(0, 7) };
    set({ budget });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(budget)).catch(() => {});
  },
}));
