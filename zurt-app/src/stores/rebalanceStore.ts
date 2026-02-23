import { create } from 'zustand';
import type { TargetAllocation, RebalanceResult, AssetClass } from '../types';
import { useAuthStore } from './authStore';
import { demoTargetAllocations, demoRebalanceResult } from '../data/demo';
import { logger } from '../utils/logger';

interface RebalanceState {
  targetAllocations: TargetAllocation[];
  result: RebalanceResult | null;
  isLoading: boolean;
  error: string | null;

  loadTargets: () => Promise<void>;
  setTargetPercentage: (assetClass: AssetClass, pct: number) => void;
  resetToDefaults: () => void;
  calculateRebalance: () => void;
  saveTargets: () => Promise<void>;
}

const DEFAULT_TARGETS: Record<AssetClass, number> = {
  fixedIncome: 55,
  stocks: 15,
  fiis: 8,
  crypto: 10,
  international: 7,
  pension: 5,
};

export const useRebalanceStore = create<RebalanceState>((set, get) => ({
  targetAllocations: [],
  result: null,
  isLoading: false,
  error: null,

  loadTargets: async () => {
    set({ isLoading: true, error: null });

    const isDemoMode = useAuthStore.getState().isDemoMode;
    if (isDemoMode) {
      set({ targetAllocations: demoTargetAllocations, result: demoRebalanceResult, isLoading: false });
      return;
    }

    try {
      set({ targetAllocations: demoTargetAllocations, result: demoRebalanceResult, isLoading: false });
    } catch (err: any) {
      logger.log('[RebalanceStore] loadTargets error:', err?.message ?? err);
      set({ targetAllocations: demoTargetAllocations, result: demoRebalanceResult, isLoading: false });
    }
  },

  setTargetPercentage: (assetClass, pct) => {
    set({
      targetAllocations: get().targetAllocations.map((t) =>
        t.class === assetClass ? { ...t, targetPct: pct } : t,
      ),
    });
  },

  resetToDefaults: () => {
    set({
      targetAllocations: get().targetAllocations.map((t) => ({
        ...t,
        targetPct: DEFAULT_TARGETS[t.class] ?? t.targetPct,
      })),
    });
  },

  calculateRebalance: () => {
    const { targetAllocations } = get();
    const totalValue = 847350; // from portfolio summary
    const trades = targetAllocations.map((t) => {
      const diff = t.targetPct - t.currentPct;
      const amount = Math.abs(Math.round((diff / 100) * totalValue));
      const action = diff > 0.5 ? ('BUY' as const) : diff < -0.5 ? ('SELL' as const) : ('HOLD' as const);
      return { class: t.class, label: t.label, action, amount, color: t.color };
    });

    const totalBuy = trades.filter((t) => t.action === 'BUY').reduce((s, t) => s + t.amount, 0);
    const totalSell = trades.filter((t) => t.action === 'SELL').reduce((s, t) => s + t.amount, 0);
    const estimatedTax = Math.round(totalSell * 0.03);
    const netCashRequired = totalBuy - totalSell;

    set({ result: { trades, totalBuy, totalSell, estimatedTax, netCashRequired } });
  },

  saveTargets: async () => {
    const isDemoMode = useAuthStore.getState().isDemoMode;
    if (isDemoMode) return;
    // Production: save to API
  },
}));
