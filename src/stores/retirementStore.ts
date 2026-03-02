import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RetirementParams, RetirementResult } from '../types';
import { calculateRetirement } from '../utils/retirementCalc';
import { useAuthStore } from './authStore';
import { demoRetirementParams, demoRetirementResult } from '../data/demo';

const STORAGE_KEY = '@zurt:retirement';

const defaultParams: RetirementParams = {
  ...demoRetirementParams,
  currentSavings: 0,
  monthlyContribution: 0,
  monthlyExpenses: 0,
};

const defaultResult = calculateRetirement(defaultParams);

interface RetirementState {
  params: RetirementParams;
  result: RetirementResult;
  isLoaded: boolean;

  loadParams: () => Promise<void>;
  setParam: <K extends keyof RetirementParams>(key: K, value: RetirementParams[K]) => void;
  recalculate: () => void;
  resetDefaults: () => void;
}

export const useRetirementStore = create<RetirementState>((set, get) => ({
  params: defaultParams,
  result: defaultResult,
  isLoaded: false,

  loadParams: async () => {
    const isDemoMode = useAuthStore.getState().isDemoMode;
    if (isDemoMode) {
      set({ params: demoRetirementParams, result: demoRetirementResult, isLoaded: true });
      return;
    }
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const params = JSON.parse(stored);
        const result = calculateRetirement(params);
        set({ params, result, isLoaded: true });
      } else {
        set({ params: defaultParams, result: defaultResult, isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  setParam: (key, value) => {
    const params = { ...get().params, [key]: value };
    const result = calculateRetirement(params);
    set({ params, result });
    const isDemoMode = useAuthStore.getState().isDemoMode;
    if (!isDemoMode) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(params)).catch(() => {});
    }
  },

  recalculate: () => {
    const result = calculateRetirement(get().params);
    set({ result });
  },

  resetDefaults: () => {
    const isDemoMode = useAuthStore.getState().isDemoMode;
    const params = isDemoMode ? demoRetirementParams : defaultParams;
    const result = calculateRetirement(params);
    set({ params, result });
    if (!isDemoMode) {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }
  },
}));
