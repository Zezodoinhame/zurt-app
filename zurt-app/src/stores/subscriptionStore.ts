import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Subscription, SubscriptionCategory, SubscriptionStatus } from '../types';
import { useAuthStore } from './authStore';
import { demoSubscriptions } from '../data/demo';

const STORAGE_KEY = '@zurt:subscriptions';

interface SubscriptionState {
  subscriptions: Subscription[];
  isLoading: boolean;

  loadSubscriptions: () => Promise<void>;
  addSubscription: (input: Omit<Subscription, 'id' | 'createdAt'>) => void;
  editSubscription: (id: string, updates: Partial<Subscription>) => void;
  removeSubscription: (id: string) => void;
  toggleStatus: (id: string) => void;
  getTotalMonthly: () => number;
  getTotalYearly: () => number;
  getActiveCount: () => number;
  getByCategory: () => { category: SubscriptionCategory; total: number; count: number }[];
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscriptions: [],
  isLoading: false,

  loadSubscriptions: async () => {
    set({ isLoading: true });
    try {
      const isDemoMode = useAuthStore.getState().isDemoMode;
      if (isDemoMode) {
        set({ subscriptions: demoSubscriptions, isLoading: false });
        return;
      }
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const subscriptions = stored ? JSON.parse(stored) : demoSubscriptions;
      set({ subscriptions, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addSubscription: (input) => {
    const newSub: Subscription = { ...input, id: `sub-${Date.now()}`, createdAt: new Date().toISOString() };
    const updated = [...get().subscriptions, newSub];
    set({ subscriptions: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  editSubscription: (id, updates) => {
    const updated = get().subscriptions.map((s) => (s.id === id ? { ...s, ...updates } : s));
    set({ subscriptions: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  removeSubscription: (id) => {
    const updated = get().subscriptions.filter((s) => s.id !== id);
    set({ subscriptions: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  toggleStatus: (id) => {
    const updated = get().subscriptions.map((s) =>
      s.id === id ? { ...s, status: (s.status === 'active' ? 'cancelled' : 'active') as SubscriptionStatus } : s,
    );
    set({ subscriptions: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  getTotalMonthly: () => {
    return get().subscriptions
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => {
        if (s.billing === 'yearly') return sum + s.amount / 12;
        if (s.billing === 'weekly') return sum + s.amount * 4.33;
        return sum + s.amount;
      }, 0);
  },

  getTotalYearly: () => {
    return get().subscriptions
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => {
        if (s.billing === 'yearly') return sum + s.amount;
        if (s.billing === 'weekly') return sum + s.amount * 52;
        return sum + s.amount * 12;
      }, 0);
  },

  getActiveCount: () => get().subscriptions.filter((s) => s.status === 'active').length,

  getByCategory: () => {
    const active = get().subscriptions.filter((s) => s.status === 'active');
    const map = new Map<SubscriptionCategory, { total: number; count: number }>();
    active.forEach((s) => {
      const monthly = s.billing === 'yearly' ? s.amount / 12 : s.billing === 'weekly' ? s.amount * 4.33 : s.amount;
      const prev = map.get(s.category) || { total: 0, count: 0 };
      map.set(s.category, { total: prev.total + monthly, count: prev.count + 1 });
    });
    return Array.from(map.entries()).map(([category, data]) => ({
      category,
      total: Math.round(data.total * 100) / 100,
      count: data.count,
    }));
  },
}));
