import { create } from 'zustand';
import type { DividendMonth } from '../types';
import { useAuthStore } from './authStore';
import { demoDividendMonths } from '../data/demo';

interface DividendState {
  months: DividendMonth[];
  selectedMonth: string | null;
  isLoading: boolean;
  error: string | null;
  totalAnnualIncome: number;

  loadDividends: () => Promise<void>;
  selectMonth: (date: string | null) => void;
}

export const useDividendStore = create<DividendState>((set) => ({
  months: [],
  selectedMonth: null,
  isLoading: false,
  error: null,
  totalAnnualIncome: 0,

  loadDividends: async () => {
    set({ isLoading: true, error: null });
    try {
      const isDemoMode = useAuthStore.getState().isDemoMode;
      if (isDemoMode) {
        const total = demoDividendMonths.reduce((sum, m) => sum + m.totalIncome, 0);
        set({ months: demoDividendMonths, totalAnnualIncome: total, isLoading: false });
        return;
      }
      const total = demoDividendMonths.reduce((sum, m) => sum + m.totalIncome, 0);
      set({ months: demoDividendMonths, totalAnnualIncome: total, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message ?? 'Error loading dividends' });
    }
  },

  selectMonth: (date) => set({ selectedMonth: date }),
}));
