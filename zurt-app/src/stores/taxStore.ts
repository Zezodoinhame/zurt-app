import { create } from 'zustand';
import type { TaxSummary } from '../types';
import { useAuthStore } from './authStore';
import { demoTaxSummary } from '../data/demo';
import { logger } from '../utils/logger';

interface TaxState {
  summary: TaxSummary | null;
  selectedYear: number;
  isLoading: boolean;
  error: string | null;
  loadTaxSummary: () => Promise<void>;
  setSelectedYear: (year: number) => void;
}

export const useTaxStore = create<TaxState>((set) => ({
  summary: null,
  selectedYear: 2026,
  isLoading: false,
  error: null,

  loadTaxSummary: async () => {
    set({ isLoading: true, error: null });

    const isDemoMode = useAuthStore.getState().isDemoMode;
    if (isDemoMode) {
      set({ summary: demoTaxSummary, isLoading: false });
      return;
    }

    try {
      set({ summary: demoTaxSummary, isLoading: false });
    } catch (err: any) {
      logger.log('[TaxStore] loadTaxSummary error:', err?.message ?? err);
      set({ summary: demoTaxSummary, isLoading: false });
    }
  },

  setSelectedYear: (year) => set({ selectedYear: year }),
}));
