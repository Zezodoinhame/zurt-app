import { create } from 'zustand';
import type { RiskMetrics } from '../types';
import { useAuthStore } from './authStore';
import { demoRiskMetrics } from '../data/demo';
import { logger } from '../utils/logger';

interface RiskState {
  metrics: RiskMetrics | null;
  isLoading: boolean;
  error: string | null;
  loadMetrics: () => Promise<void>;
}

export const useRiskStore = create<RiskState>((set) => ({
  metrics: null,
  isLoading: false,
  error: null,

  loadMetrics: async () => {
    set({ isLoading: true, error: null });

    const isDemoMode = useAuthStore.getState().isDemoMode;
    if (isDemoMode) {
      set({ metrics: demoRiskMetrics, isLoading: false });
      return;
    }

    try {
      // TODO: fetch from API when endpoint is ready
      set({ metrics: null, isLoading: false });
    } catch (err: any) {
      logger.log('[RiskStore] loadMetrics error:', err?.message ?? err);
      set({ metrics: null, isLoading: false });
    }
  },
}));
