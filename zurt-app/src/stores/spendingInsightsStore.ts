import { create } from 'zustand';
import type { SpendingInsightsData, TransactionCategory } from '../types';
import { useAuthStore } from './authStore';
import { demoSpendingInsights } from '../data/demo';

interface SpendingInsightsState {
  insights: SpendingInsightsData | null;
  isLoading: boolean;
  error: string | null;
  selectedCategory: TransactionCategory | null;

  loadInsights: () => Promise<void>;
  selectCategory: (cat: TransactionCategory | null) => void;
}

export const useSpendingInsightsStore = create<SpendingInsightsState>((set) => ({
  insights: null,
  isLoading: false,
  error: null,
  selectedCategory: null,

  loadInsights: async () => {
    set({ isLoading: true, error: null });
    try {
      const isDemoMode = useAuthStore.getState().isDemoMode;
      if (isDemoMode) {
        set({ insights: demoSpendingInsights, isLoading: false });
        return;
      }
      // TODO: fetch from API when endpoint is ready
      set({ insights: null, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message ?? 'Error loading insights' });
    }
  },

  selectCategory: (cat) => set({ selectedCategory: cat }),
}));
