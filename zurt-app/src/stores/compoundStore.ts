import { create } from 'zustand';
import type { CompoundParams, CompoundResult } from '../types';
import { calculateCompoundInterest } from '../utils/compoundCalc';
import { demoCompoundParams } from '../data/demo';

interface CompoundState {
  params: CompoundParams;
  result: CompoundResult;

  setParam: <K extends keyof CompoundParams>(key: K, value: CompoundParams[K]) => void;
  resetDefaults: () => void;
}

const initialResult = calculateCompoundInterest(demoCompoundParams);

export const useCompoundStore = create<CompoundState>((set, get) => ({
  params: demoCompoundParams,
  result: initialResult,

  setParam: (key, value) => {
    const params = { ...get().params, [key]: value };
    const result = calculateCompoundInterest(params);
    set({ params, result });
  },

  resetDefaults: () => {
    set({ params: demoCompoundParams, result: initialResult });
  },
}));
