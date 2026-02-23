import { create } from 'zustand';
import type { FIREParams, FIREResult } from '../types';
import { calculateFIRE } from '../utils/fireCalc';
import { demoFIREParams } from '../data/demo';

interface FIREState {
  params: FIREParams;
  result: FIREResult;

  setParam: <K extends keyof FIREParams>(key: K, value: FIREParams[K]) => void;
  recalculate: () => void;
  resetDefaults: () => void;
}

const initialResult = calculateFIRE(demoFIREParams);

export const useFireStore = create<FIREState>((set, get) => ({
  params: demoFIREParams,
  result: initialResult,

  setParam: (key, value) => {
    const params = { ...get().params, [key]: value };
    const result = calculateFIRE(params);
    set({ params, result });
  },

  recalculate: () => {
    const result = calculateFIRE(get().params);
    set({ result });
  },

  resetDefaults: () => {
    set({ params: demoFIREParams, result: initialResult });
  },
}));
