import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavingsChallenge, ChallengeStatus } from '../types';
import { useAuthStore } from './authStore';
import { demoSavingsChallenges } from '../data/demo';

const STORAGE_KEY = '@zurt:challenges';

interface SavingsChallengeState {
  challenges: SavingsChallenge[];
  isLoading: boolean;

  loadChallenges: () => Promise<void>;
  addChallenge: (input: Omit<SavingsChallenge, 'id' | 'createdAt' | 'currentAmount' | 'checkedItems'>) => void;
  removeChallenge: (id: string) => void;
  checkInItem: (challengeId: string, itemIndex: number) => void;
  uncheckItem: (challengeId: string, itemIndex: number) => void;
  setStatus: (id: string, status: ChallengeStatus) => void;
  getTotalSaved: () => number;
  getActiveCount: () => number;
  getCompletedCount: () => number;
}

function calculateAmount(type: string, checkedItems: number[]): number {
  if (type === '52week') {
    return checkedItems.reduce((sum, week) => sum + week, 0);
  }
  return checkedItems.length * 50;
}

export const useSavingsChallengeStore = create<SavingsChallengeState>((set, get) => ({
  challenges: [],
  isLoading: false,

  loadChallenges: async () => {
    set({ isLoading: true });
    try {
      const isDemoMode = useAuthStore.getState().isDemoMode;
      if (isDemoMode) {
        set({ challenges: demoSavingsChallenges, isLoading: false });
        return;
      }
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const challenges = stored ? JSON.parse(stored) : [];
      set({ challenges, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addChallenge: (input) => {
    const newChallenge: SavingsChallenge = {
      ...input,
      id: `ch-${Date.now()}`,
      currentAmount: 0,
      checkedItems: [],
      createdAt: new Date().toISOString(),
    };
    const updated = [...get().challenges, newChallenge];
    set({ challenges: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  removeChallenge: (id) => {
    const updated = get().challenges.filter((c) => c.id !== id);
    set({ challenges: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  checkInItem: (challengeId, itemIndex) => {
    const updated = get().challenges.map((c) => {
      if (c.id !== challengeId) return c;
      if (c.checkedItems.includes(itemIndex)) return c;
      const checkedItems = [...c.checkedItems, itemIndex];
      const currentAmount = calculateAmount(c.type, checkedItems);
      const status: ChallengeStatus = checkedItems.length >= c.totalItems ? 'completed' : c.status;
      return { ...c, checkedItems, currentAmount, status };
    });
    set({ challenges: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  uncheckItem: (challengeId, itemIndex) => {
    const updated = get().challenges.map((c) => {
      if (c.id !== challengeId) return c;
      const checkedItems = c.checkedItems.filter((i) => i !== itemIndex);
      const currentAmount = calculateAmount(c.type, checkedItems);
      return { ...c, checkedItems, currentAmount };
    });
    set({ challenges: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  setStatus: (id, status) => {
    const updated = get().challenges.map((c) => (c.id === id ? { ...c, status } : c));
    set({ challenges: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  getTotalSaved: () => get().challenges.reduce((sum, c) => sum + c.currentAmount, 0),
  getActiveCount: () => get().challenges.filter((c) => c.status === 'active').length,
  getCompletedCount: () => get().challenges.filter((c) => c.status === 'completed').length,
}));
