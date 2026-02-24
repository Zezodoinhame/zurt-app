import { create } from 'zustand';
import type { AssetComparisonData } from '../types';
import { useAuthStore } from './authStore';
import { demoComparisonAssets } from '../data/demo';

interface ComparisonState {
  selectedAssets: AssetComparisonData[];
  availableAssets: AssetComparisonData[];
  isLoading: boolean;

  loadAvailable: () => Promise<void>;
  addAsset: (ticker: string) => void;
  removeAsset: (ticker: string) => void;
  clearAll: () => void;
}

export const useComparisonStore = create<ComparisonState>((set, get) => ({
  selectedAssets: [],
  availableAssets: [],
  isLoading: false,

  loadAvailable: async () => {
    set({ isLoading: true });
    try {
      const isDemoMode = useAuthStore.getState().isDemoMode;
      if (isDemoMode) {
        // Pre-select first 2
        set({ availableAssets: demoComparisonAssets, selectedAssets: demoComparisonAssets.slice(0, 2), isLoading: false });
        return;
      }
      // TODO: fetch from API when endpoint is ready
      set({ availableAssets: [], selectedAssets: [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addAsset: (ticker) => {
    const { selectedAssets, availableAssets } = get();
    if (selectedAssets.length >= 3) return;
    const asset = availableAssets.find((a) => a.ticker === ticker);
    if (!asset || selectedAssets.some((a) => a.ticker === ticker)) return;
    set({ selectedAssets: [...selectedAssets, asset] });
  },

  removeAsset: (ticker) => {
    set({ selectedAssets: get().selectedAssets.filter((a) => a.ticker !== ticker) });
  },

  clearAll: () => set({ selectedAssets: [] }),
}));
