import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CompoundParams, CompoundResult } from '../types';
import { calculateCompoundInterest } from '../utils/compoundCalc';
import { useAuthStore } from './authStore';
import { demoCompoundParams } from '../data/demo';

const STORAGE_KEY = '@zurt:compound';

const defaultParams: CompoundParams = {
  ...demoCompoundParams,
  initialAmount: 0,
  monthlyContribution: 0,
};

const defaultResult = calculateCompoundInterest(defaultParams);
const demoResult = calculateCompoundInterest(demoCompoundParams);

interface CompoundState {
  params: CompoundParams;
  result: CompoundResult;
  isLoaded: boolean;

  loadParams: () => Promise<void>;
  setParam: <K extends keyof CompoundParams>(key: K, value: CompoundParams[K]) => void;
  resetDefaults: () => void;
}

export const useCompoundStore = create<CompoundState>((set, get) => ({
  params: defaultParams,
  result: defaultResult,
  isLoaded: false,

  loadParams: async () => {
    const isDemoMode = useAuthStore.getState().isDemoMode;
    if (isDemoMode) {
      set({ params: demoCompoundParams, result: demoResult, isLoaded: true });
      return;
    }
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const params = JSON.parse(stored);
        const result = calculateCompoundInterest(params);
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
    const result = calculateCompoundInterest(params);
    set({ params, result });
    const isDemoMode = useAuthStore.getState().isDemoMode;
    if (!isDemoMode) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(params)).catch(() => {});
    }
  },

  resetDefaults: () => {
    const isDemoMode = useAuthStore.getState().isDemoMode;
    const params = isDemoMode ? demoCompoundParams : defaultParams;
    const result = calculateCompoundInterest(params);
    set({ params, result });
    if (!isDemoMode) {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }
  },
}));
