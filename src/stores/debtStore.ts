import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Debt, PayoffComparison, PayoffStrategy } from '../types';
import { useAuthStore } from './authStore';
import { demoDebts, demoPayoffComparison } from '../data/demo';

const STORAGE_KEY = '@zurt:debts';

interface DebtState {
  debts: Debt[];
  comparison: PayoffComparison;
  strategy: PayoffStrategy;
  isLoading: boolean;
  error: string | null;

  loadDebts: () => Promise<void>;
  addDebt: (debt: Omit<Debt, 'id' | 'createdAt'>) => void;
  editDebt: (id: string, updates: Partial<Debt>) => void;
  removeDebt: (id: string) => void;
  setStrategy: (strategy: PayoffStrategy) => void;
  getTotalDebt: () => number;
  getMonthlyPayments: () => number;
  getDebtFreeDate: () => string;
}

export const useDebtStore = create<DebtState>((set, get) => ({
  debts: [],
  comparison: demoPayoffComparison,
  strategy: 'avalanche',
  isLoading: false,
  error: null,

  loadDebts: async () => {
    set({ isLoading: true, error: null });
    try {
      const isDemoMode = useAuthStore.getState().isDemoMode;
      if (isDemoMode) {
        set({ debts: demoDebts, comparison: demoPayoffComparison, isLoading: false });
        return;
      }
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const debts = stored ? JSON.parse(stored) : [];
      set({ debts, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message ?? 'Erro ao carregar dívidas' });
    }
  },

  addDebt: (input) => {
    const newDebt: Debt = { ...input, id: `debt-${Date.now()}`, createdAt: new Date().toISOString() };
    const updated = [...get().debts, newDebt];
    set({ debts: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  editDebt: (id, updates) => {
    const updated = get().debts.map((d) => (d.id === id ? { ...d, ...updates } : d));
    set({ debts: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  removeDebt: (id) => {
    const updated = get().debts.filter((d) => d.id !== id);
    set({ debts: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  setStrategy: (strategy) => set({ strategy }),

  getTotalDebt: () => get().debts.reduce((sum, d) => sum + d.remainingAmount, 0),

  getMonthlyPayments: () => get().debts.reduce((sum, d) => sum + d.minimumPayment, 0),

  getDebtFreeDate: () => {
    const { debts } = get();
    if (debts.length === 0) return '';
    const maxMonths = Math.max(...debts.map((d) => {
      if (d.minimumPayment <= 0) return 999;
      return Math.ceil(d.remainingAmount / d.minimumPayment);
    }));
    const date = new Date();
    date.setMonth(date.getMonth() + maxMonths);
    return date.toISOString().slice(0, 7);
  },
}));
