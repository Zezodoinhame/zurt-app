import { create } from 'zustand';
import type { CurrencyCode, CurrencyRate } from '../types';
import { convert, getRate, getRateWithHistory, getCrossRates } from '../utils/currencyRates';

interface CurrencyConverterState {
  amount: number;
  from: CurrencyCode;
  to: CurrencyCode;
  convertedAmount: number;
  rate: number;
  rateHistory: number[];
  crossRates: { code: CurrencyCode; rate: number }[];

  setAmount: (amount: number) => void;
  setFrom: (code: CurrencyCode) => void;
  setTo: (code: CurrencyCode) => void;
  swap: () => void;
  recalculate: () => void;
}

function calc(amount: number, from: CurrencyCode, to: CurrencyCode) {
  const rate = getRate(from, to);
  const rateWithHistory = getRateWithHistory(from, to);
  const cross = getCrossRates(from);
  return {
    convertedAmount: convert(amount, from, to),
    rate,
    rateHistory: rateWithHistory.history,
    crossRates: cross,
  };
}

const initial = calc(1000, 'BRL', 'USD');

export const useCurrencyConverterStore = create<CurrencyConverterState>((set, get) => ({
  amount: 1000,
  from: 'BRL',
  to: 'USD',
  ...initial,

  setAmount: (amount) => {
    const { from, to } = get();
    const computed = calc(amount, from, to);
    set({ amount, ...computed });
  },

  setFrom: (from) => {
    const { amount, to } = get();
    const actualTo = from === to ? get().from : to;
    const computed = calc(amount, from, actualTo);
    set({ from, to: actualTo, ...computed });
  },

  setTo: (to) => {
    const { amount, from } = get();
    const actualFrom = to === from ? get().to : from;
    const computed = calc(amount, actualFrom, to);
    set({ to, from: actualFrom, ...computed });
  },

  swap: () => {
    const { amount, from, to } = get();
    const computed = calc(amount, to, from);
    set({ from: to, to: from, ...computed });
  },

  recalculate: () => {
    const { amount, from, to } = get();
    const computed = calc(amount, from, to);
    set(computed);
  },
}));
