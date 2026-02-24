import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EmergencyFundData } from '../types';
import { useAuthStore } from './authStore';
import { demoEmergencyFund } from '../data/demo';

const STORAGE_KEY = '@zurt:emergency';

interface EmergencyFundState {
  data: EmergencyFundData;
  isLoading: boolean;

  loadFund: () => Promise<void>;
  addSavings: (amount: number) => void;
  setMonthlyExpenses: (amount: number) => void;
  setTargetMonths: (months: number) => void;
  getMonthsCovered: () => number;
  getProgress: () => number;
  isProtected: () => boolean;
  getMonthsToTarget: () => number;
}

export const useEmergencyFundStore = create<EmergencyFundState>((set, get) => ({
  data: demoEmergencyFund,
  isLoading: false,

  loadFund: async () => {
    set({ isLoading: true });
    try {
      const isDemoMode = useAuthStore.getState().isDemoMode;
      if (isDemoMode) {
        set({ data: demoEmergencyFund, isLoading: false });
        return;
      }
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const data = stored ? JSON.parse(stored) : demoEmergencyFund;
      set({ data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addSavings: (amount) => {
    const data = { ...get().data };
    data.currentAmount += amount;
    data.contributions = [
      ...data.contributions,
      { date: new Date().toISOString().split('T')[0], amount },
    ];
    set({ data });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  },

  setMonthlyExpenses: (amount) => {
    const data = { ...get().data, monthlyExpenses: amount };
    set({ data });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  },

  setTargetMonths: (months) => {
    const data = { ...get().data, targetMonths: months };
    set({ data });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  },

  getMonthsCovered: () => {
    const { currentAmount, monthlyExpenses } = get().data;
    if (monthlyExpenses <= 0) return 0;
    return Math.round((currentAmount / monthlyExpenses) * 10) / 10;
  },

  getProgress: () => {
    const { currentAmount, monthlyExpenses, targetMonths } = get().data;
    const target = monthlyExpenses * targetMonths;
    if (target <= 0) return 0;
    return Math.min(currentAmount / target, 1);
  },

  isProtected: () => {
    const { currentAmount, monthlyExpenses, targetMonths } = get().data;
    return currentAmount >= monthlyExpenses * targetMonths;
  },

  getMonthsToTarget: () => {
    const { currentAmount, monthlyExpenses, targetMonths, contributions } = get().data;
    const target = monthlyExpenses * targetMonths;
    const remaining = target - currentAmount;
    if (remaining <= 0) return 0;
    // Estimate monthly savings rate from contributions
    const avgContribution = contributions.length > 0
      ? contributions.reduce((s, c) => s + c.amount, 0) / contributions.length
      : 2000;
    if (avgContribution <= 0) return 99;
    return Math.ceil(remaining / avgContribution);
  },
}));
