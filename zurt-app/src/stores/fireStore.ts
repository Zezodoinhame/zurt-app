import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FIREParams, FIREResult } from '../types';
import { calculateFIRE } from '../utils/fireCalc';
import { useAuthStore } from './authStore';
import { demoFIREParams } from '../data/demo';

const STORAGE_KEY = '@zurt:fire';

const defaultParams: FIREParams = {
  ...demoFIREParams,
  currentNetWorth: 0,
  annualIncome: 0,
  annualExpenses: 0,
};

const defaultResult = calculateFIRE(defaultParams);
const demoResult = calculateFIRE(demoFIREParams);

interface FIREState {
  params: FIREParams;
  result: FIREResult;
  isLoaded: boolean;

  loadParams: () => Promise<void>;
  setParam: <K extends keyof FIREParams>(key: K, value: FIREParams[K]) => void;
  recalculate: () => void;
  resetDefaults: () => void;
}

export const useFireStore = create<FIREState>((set, get) => ({
  params: defaultParams,
  result: defaultResult,
  isLoaded: false,

  loadParams: async () => {
    const isDemoMode = useAuthStore.getState().isDemoMode;
    if (isDemoMode) {
      set({ params: demoFIREParams, result: demoResult, isLoaded: true });
      return;
    }
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const params = JSON.parse(stored);
        const result = calculateFIRE(params);
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
    const result = calculateFIRE(params);
    set({ params, result });
    const isDemoMode = useAuthStore.getState().isDemoMode;
    if (!isDemoMode) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(params)).catch(() => {});
    }
  },

  recalculate: () => {
    const result = calculateFIRE(get().params);
    set({ result });
  },

  resetDefaults: () => {
    const isDemoMode = useAuthStore.getState().isDemoMode;
    const params = isDemoMode ? demoFIREParams : defaultParams;
    const result = calculateFIRE(params);
    set({ params, result });
    if (!isDemoMode) {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }
  },
}));
