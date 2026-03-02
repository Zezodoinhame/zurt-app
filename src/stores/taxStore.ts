import { create } from 'zustand';
import type { TaxSummary, DarfEntry } from '../types';
import { useAuthStore } from './authStore';
import { usePortfolioStore } from './portfolioStore';
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

// Exempt asset types (income is tax-free)
const EXEMPT_TYPES = ['LCI', 'LCA', 'CRI', 'CRA', 'Debenture Incentivada'];

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function computeTaxFromPortfolio(): TaxSummary {
  const { assets } = usePortfolioStore.getState();

  let totalGains = 0;
  let totalLosses = 0;
  let exemptAmount = 0;
  let taxableAmount = 0;

  assets.forEach((a) => {
    const profit = a.currentValue - (a.investedValue ?? a.currentValue);
    const isExempt = EXEMPT_TYPES.some((t) => a.name?.includes(t));

    if (isExempt) {
      exemptAmount += a.currentValue;
    } else {
      taxableAmount += a.currentValue;
      if (profit > 0) totalGains += profit;
      else totalLosses += Math.abs(profit);
    }
  });

  const netGains = totalGains - totalLosses;
  const estimatedIR = netGains > 0 ? netGains * 0.15 : 0;

  // DARF calendar — monthly deadlines
  // Brazilian law: DARF under R$10 is carried forward (not paid)
  const DARF_MINIMUM = 10;
  const now = new Date();
  const year = now.getFullYear();
  const darfs: DarfEntry[] = [];
  const monthlyDarf = Math.round(estimatedIR / 12);
  for (let m = 0; m < 12; m++) {
    const dueDate = new Date(year, m, 28);
    const isPast = m < now.getMonth();
    const isCurrent = m === now.getMonth();
    const hasDarf = m <= now.getMonth() && monthlyDarf >= DARF_MINIMUM;
    darfs.push({
      month: m + 1,
      label: MONTH_LABELS[m],
      amount: hasDarf ? monthlyDarf : 0,
      status: isPast && hasDarf ? 'paid' : isCurrent && hasDarf ? 'pending' : 'exempt',
      dueDate: dueDate.toISOString().split('T')[0],
    });
  }

  return {
    year,
    estimatedIR,
    totalGains,
    totalLosses,
    netGains,
    exemptAmount,
    taxableAmount,
    darfs,
  };
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
      // Compute from real portfolio data
      const computed = computeTaxFromPortfolio();
      set({ summary: computed, isLoading: false });
    } catch (err: any) {
      logger.log('[TaxStore] loadTaxSummary error:', err?.message ?? err);
      // Show empty summary instead of null so the screen renders
      set({
        summary: {
          year: new Date().getFullYear(),
          estimatedIR: 0,
          totalGains: 0,
          totalLosses: 0,
          netGains: 0,
          exemptAmount: 0,
          taxableAmount: 0,
          darfs: [],
        },
        isLoading: false,
      });
    }
  },

  setSelectedYear: (year) => set({ selectedYear: year }),
}));
