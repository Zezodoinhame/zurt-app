import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CryptoPortfolio, CryptoHolding } from '../types';
import { useAuthStore } from './authStore';
import { demoCryptoPortfolio } from '../data/demo';

const STORAGE_KEY = '@zurt:crypto';

interface CryptoState {
  portfolio: CryptoPortfolio;
  isLoading: boolean;

  loadCrypto: () => Promise<void>;
  addHolding: (input: Omit<CryptoHolding, 'id' | 'currentValue'>) => void;
  editHolding: (id: string, updates: Partial<CryptoHolding>) => void;
  removeHolding: (id: string) => void;
  getTotalValue: () => number;
  getDominance: () => { symbol: string; percentage: number; color: string }[];
}

export const useCryptoStore = create<CryptoState>((set, get) => ({
  portfolio: demoCryptoPortfolio,
  isLoading: false,

  loadCrypto: async () => {
    set({ isLoading: true });
    try {
      const isDemoMode = useAuthStore.getState().isDemoMode;
      if (isDemoMode) {
        set({ portfolio: demoCryptoPortfolio, isLoading: false });
        return;
      }
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const portfolio = stored ? JSON.parse(stored) : { holdings: [], totalValue: 0, totalInvested: 0, totalProfit: 0, dominance: [] };
      set({ portfolio, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addHolding: (input) => {
    const newHolding: CryptoHolding = {
      ...input,
      id: `c-${Date.now()}`,
      currentValue: input.quantity * input.currentPrice,
    };
    const portfolio = get().portfolio;
    const holdings = [...portfolio.holdings, newHolding];
    const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
    const totalInvested = holdings.reduce((s, h) => s + h.quantity * h.avgPrice, 0);
    const dominance = holdings.map((h) => ({
      symbol: h.symbol,
      percentage: totalValue > 0 ? Math.round((h.currentValue / totalValue) * 1000) / 10 : 0,
      color: h.color,
    }));
    const updated = { ...portfolio, holdings, totalValue, totalInvested, totalProfit: totalValue - totalInvested, dominance };
    set({ portfolio: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  editHolding: (id, updates) => {
    const portfolio = get().portfolio;
    const holdings = portfolio.holdings.map((h) => (h.id === id ? { ...h, ...updates } : h));
    const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
    const updated = { ...portfolio, holdings, totalValue };
    set({ portfolio: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  removeHolding: (id) => {
    const portfolio = get().portfolio;
    const holdings = portfolio.holdings.filter((h) => h.id !== id);
    const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
    const totalInvested = holdings.reduce((s, h) => s + h.quantity * h.avgPrice, 0);
    const dominance = holdings.map((h) => ({
      symbol: h.symbol,
      percentage: totalValue > 0 ? Math.round((h.currentValue / totalValue) * 1000) / 10 : 0,
      color: h.color,
    }));
    const updated = { ...portfolio, holdings, totalValue, totalInvested, totalProfit: totalValue - totalInvested, dominance };
    set({ portfolio: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  getTotalValue: () => get().portfolio.totalValue,

  getDominance: () => get().portfolio.dominance,
}));
