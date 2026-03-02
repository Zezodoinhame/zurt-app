import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RealEstateParams, RealEstateResult } from '../types';
import { calculateRealEstate } from '../utils/realEstateCalc';
import { useAuthStore } from './authStore';
import { demoRealEstateParams } from '../data/demo';

const STORAGE_KEY = '@zurt:realestate';

const defaultParams: RealEstateParams = {
  ...demoRealEstateParams,
  propertyValue: 0,
  downPaymentPct: 20,
  rentValue: 0,
};

const defaultResult = calculateRealEstate(defaultParams);
const demoResult = calculateRealEstate(demoRealEstateParams);

interface RealEstateState {
  params: RealEstateParams;
  result: RealEstateResult;
  isLoaded: boolean;

  loadParams: () => Promise<void>;
  setParam: <K extends keyof RealEstateParams>(key: K, value: RealEstateParams[K]) => void;
  recalculate: () => void;
  resetDefaults: () => void;
}

export const useRealEstateStore = create<RealEstateState>((set, get) => ({
  params: defaultParams,
  result: defaultResult,
  isLoaded: false,

  loadParams: async () => {
    const isDemoMode = useAuthStore.getState().isDemoMode;
    if (isDemoMode) {
      set({ params: demoRealEstateParams, result: demoResult, isLoaded: true });
      return;
    }
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const params = JSON.parse(stored);
        const result = calculateRealEstate(params);
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
    const result = calculateRealEstate(params);
    set({ params, result });
    const isDemoMode = useAuthStore.getState().isDemoMode;
    if (!isDemoMode) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(params)).catch(() => {});
    }
  },

  recalculate: () => {
    const result = calculateRealEstate(get().params);
    set({ result });
  },

  resetDefaults: () => {
    const isDemoMode = useAuthStore.getState().isDemoMode;
    const params = isDemoMode ? demoRealEstateParams : defaultParams;
    const result = calculateRealEstate(params);
    set({ params, result });
    if (!isDemoMode) {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }
  },
}));
