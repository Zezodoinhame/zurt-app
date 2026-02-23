import { create } from 'zustand';
import type { RetirementParams, RetirementResult } from '../types';
import { calculateRetirement } from '../utils/retirementCalc';
import { demoRetirementParams, demoRetirementResult } from '../data/demo';

interface RetirementState {
  params: RetirementParams;
  result: RetirementResult;

  setParam: <K extends keyof RetirementParams>(key: K, value: RetirementParams[K]) => void;
  recalculate: () => void;
  resetDefaults: () => void;
}

export const useRetirementStore = create<RetirementState>((set, get) => ({
  params: demoRetirementParams,
  result: demoRetirementResult,

  setParam: (key, value) => {
    const params = { ...get().params, [key]: value };
    const result = calculateRetirement(params);
    set({ params, result });
  },

  recalculate: () => {
    const result = calculateRetirement(get().params);
    set({ result });
  },

  resetDefaults: () => {
    set({ params: demoRetirementParams, result: demoRetirementResult });
  },
}));
