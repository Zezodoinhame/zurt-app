import { create } from 'zustand';
import type { RiskMetrics } from '../types';
import { useAuthStore } from './authStore';
import { usePortfolioStore } from './portfolioStore';
import { demoRiskMetrics } from '../data/demo';
import { logger } from '../utils/logger';

interface RiskState {
  metrics: RiskMetrics | null;
  isLoading: boolean;
  error: string | null;
  loadMetrics: () => Promise<void>;
}

// Placeholder metrics shown when user has portfolio data but no API
const placeholderMetrics: RiskMetrics = {
  healthScore: 0,
  sharpe: 0,
  beta: 0,
  maxDrawdown: 0,
  volatility: 0,
  diversification: 0,
  concentration: 0,
  historicalScores: [],
};

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
      // Check if user has portfolio data
      const { assets } = usePortfolioStore.getState();
      if (assets.length > 0) {
        // Use placeholder metrics until API is ready
        set({ metrics: placeholderMetrics, isLoading: false });
      } else {
        // No portfolio data — will show empty state
        set({ metrics: null, isLoading: false });
      }
    } catch (err: any) {
      logger.log('[RiskStore] loadMetrics error:', err?.message ?? err);
      set({ metrics: null, isLoading: false, error: err?.message });
    }
  },
}));
