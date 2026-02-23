import { create } from 'zustand';
import type { RealEstateParams, RealEstateResult } from '../types';
import { calculateRealEstate } from '../utils/realEstateCalc';
import { demoRealEstateParams } from '../data/demo';

interface RealEstateState {
  params: RealEstateParams;
  result: RealEstateResult;

  setParam: <K extends keyof RealEstateParams>(key: K, value: RealEstateParams[K]) => void;
  recalculate: () => void;
  resetDefaults: () => void;
}

const initialResult = calculateRealEstate(demoRealEstateParams);

export const useRealEstateStore = create<RealEstateState>((set, get) => ({
  params: demoRealEstateParams,
  result: initialResult,

  setParam: (key, value) => {
    const params = { ...get().params, [key]: value };
    const result = calculateRealEstate(params);
    set({ params, result });
  },

  recalculate: () => {
    const result = calculateRealEstate(get().params);
    set({ result });
  },

  resetDefaults: () => {
    set({ params: demoRealEstateParams, result: initialResult });
  },
}));
