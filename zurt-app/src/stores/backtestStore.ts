import { create } from 'zustand';
import type { BacktestResult, BacktestAllocation } from '../types';
import { demoBacktestResult } from '../data/demo';

type BacktestPeriod = '1y' | '3y' | '5y' | '10y';

interface BacktestState {
  allocations: BacktestAllocation[];
  period: BacktestPeriod;
  result: BacktestResult | null;
  isRunning: boolean;

  setAllocations: (allocs: BacktestAllocation[]) => void;
  updateAllocation: (ticker: string, percentage: number) => void;
  setPeriod: (p: BacktestPeriod) => void;
  runBacktest: () => void;
  reset: () => void;
}

const DEFAULT_ALLOCATIONS: BacktestAllocation[] = [
  { ticker: 'PETR4', name: 'Petrobras PN', percentage: 25, color: '#00D4AA' },
  { ticker: 'VALE3', name: 'Vale ON', percentage: 20, color: '#3A86FF' },
  { ticker: 'ITUB4', name: 'Itau PN', percentage: 20, color: '#FFBE0B' },
  { ticker: 'HGLG11', name: 'CSHG Log', percentage: 15, color: '#A855F7' },
  { ticker: 'BTC', name: 'Bitcoin', percentage: 10, color: '#F3BA2F' },
  { ticker: 'SELIC', name: 'Tesouro Selic', percentage: 10, color: '#F472B6' },
];

export const useBacktestStore = create<BacktestState>((set, get) => ({
  allocations: DEFAULT_ALLOCATIONS,
  period: '5y',
  result: null,
  isRunning: false,

  setAllocations: (allocs) => set({ allocations: allocs }),

  updateAllocation: (ticker, percentage) => {
    const updated = get().allocations.map((a) =>
      a.ticker === ticker ? { ...a, percentage } : a,
    );
    set({ allocations: updated });
  },

  setPeriod: (p) => set({ period: p }),

  runBacktest: () => {
    set({ isRunning: true });
    // Simulate async delay, then return demo result
    setTimeout(() => {
      const { period } = get();
      const periodMonths: Record<BacktestPeriod, number> = { '1y': 12, '3y': 36, '5y': 60, '10y': 60 };
      const months = periodMonths[period];
      const sliced = {
        ...demoBacktestResult,
        periodReturns: demoBacktestResult.periodReturns.slice(-months),
      };
      set({ result: sliced, isRunning: false });
    }, 800);
  },

  reset: () => set({ allocations: DEFAULT_ALLOCATIONS, period: '5y', result: null }),
}));
