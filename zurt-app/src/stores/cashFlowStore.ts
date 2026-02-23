import { create } from 'zustand';
import type { CashFlowMonth } from '../types';
import { useAuthStore } from './authStore';
import { demoCashFlow } from '../data/demo';

interface CashFlowState {
  forecast: CashFlowMonth[];
  isLoading: boolean;
  error: string | null;
  totalProjectedSavings: number;

  loadForecast: () => Promise<void>;
}

export const useCashFlowStore = create<CashFlowState>((set) => ({
  forecast: [],
  isLoading: false,
  error: null,
  totalProjectedSavings: 0,

  loadForecast: async () => {
    set({ isLoading: true, error: null });
    try {
      const isDemoMode = useAuthStore.getState().isDemoMode;
      if (isDemoMode) {
        const total = demoCashFlow.reduce((sum, m) => sum + m.savings, 0);
        set({ forecast: demoCashFlow, totalProjectedSavings: total, isLoading: false });
        return;
      }
      const total = demoCashFlow.reduce((sum, m) => sum + m.savings, 0);
      set({ forecast: demoCashFlow, totalProjectedSavings: total, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message ?? 'Error loading forecast' });
    }
  },
}));
