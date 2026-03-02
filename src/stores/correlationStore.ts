import { create } from 'zustand';
import type { CorrelationMatrix } from '../types';
import { useAuthStore } from './authStore';
import { demoCorrelationMatrix } from '../data/demo';

interface CorrelationState {
  matrix: CorrelationMatrix | null;
  selectedPair: { a: string; b: string; value: number } | null;
  isLoading: boolean;

  loadMatrix: () => void;
  selectPair: (a: string, b: string) => void;
  clearPair: () => void;
}

export const useCorrelationStore = create<CorrelationState>((set, get) => ({
  matrix: null,
  selectedPair: null,
  isLoading: false,

  loadMatrix: () => {
    set({ isLoading: true });
    const isDemoMode = useAuthStore.getState().isDemoMode;
    if (isDemoMode) {
      set({ matrix: demoCorrelationMatrix, isLoading: false });
    } else {
      // TODO: fetch from API when endpoint is ready
      set({ matrix: null, isLoading: false });
    }
  },

  selectPair: (a, b) => {
    const { matrix } = get();
    if (!matrix) return;
    const idxA = matrix.tickers.indexOf(a);
    const idxB = matrix.tickers.indexOf(b);
    if (idxA === -1 || idxB === -1) return;
    set({ selectedPair: { a, b, value: matrix.values[idxA][idxB] } });
  },

  clearPair: () => set({ selectedPair: null }),
}));
