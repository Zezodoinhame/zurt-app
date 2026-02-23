import { create } from 'zustand';
import type { MonteCarloHorizon, MonteCarloResult, MonteCarloPercentile } from '../types';
import { demoMonteCarloResult } from '../data/demo';

interface MonteCarloState {
  result: MonteCarloResult;
  isRunning: boolean;
  horizon: MonteCarloHorizon;
  targetValue: number;

  setHorizon: (h: MonteCarloHorizon) => void;
  setTargetValue: (v: number) => void;
  runSimulation: () => Promise<void>;
}

function generateResult(horizon: MonteCarloHorizon, initial: number, target: number): MonteCarloResult {
  const labels = ['10th', '25th', '50th', '75th', '90th'];
  const growthRates = [0.02, 0.05, 0.08, 0.11, 0.15];
  const mcColors = ['rgba(58,134,255,0.15)', 'rgba(58,134,255,0.30)', '#3A86FF', 'rgba(58,134,255,0.30)', 'rgba(58,134,255,0.15)'];

  const percentiles: MonteCarloPercentile[] = labels.map((label, idx) => ({
    label,
    values: Array.from({ length: horizon + 1 }, (_, y) => Math.round(initial * Math.pow(1 + growthRates[idx], y))),
    color: mcColors[idx],
  }));

  const medianFinal = percentiles[2].values[horizon];
  const bestFinal = percentiles[4].values[horizon];
  const worstFinal = percentiles[0].values[horizon];
  const successProb = medianFinal >= target ? Math.min(95, 60 + Math.round((medianFinal / target - 1) * 40)) : Math.max(15, Math.round((medianFinal / target) * 60));

  return {
    horizon,
    initialValue: initial,
    targetValue: target,
    successProbability: successProb,
    medianOutcome: medianFinal,
    bestCase: bestFinal,
    worstCase: worstFinal,
    percentiles,
    years: Array.from({ length: horizon + 1 }, (_, i) => i),
  };
}

export const useMonteCarloStore = create<MonteCarloState>((set, get) => ({
  result: demoMonteCarloResult,
  isRunning: false,
  horizon: 20,
  targetValue: 3000000,

  setHorizon: (h) => set({ horizon: h }),
  setTargetValue: (v) => set({ targetValue: v }),

  runSimulation: async () => {
    set({ isRunning: true });
    await new Promise((r) => setTimeout(r, 800));
    const { horizon, targetValue, result } = get();
    const newResult = generateResult(horizon, result.initialValue, targetValue);
    set({ result: newResult, isRunning: false });
  },
}));
