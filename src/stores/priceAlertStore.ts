import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PriceAlert, PriceAlertCondition, PriceAlertStatus } from '../types';
import { useAuthStore } from './authStore';
import { demoPriceAlerts } from '../data/demo';

const STORAGE_KEY = '@zurt:priceAlerts';

interface PriceAlertState {
  alerts: PriceAlert[];
  isLoading: boolean;

  loadAlerts: () => Promise<void>;
  addAlert: (input: Omit<PriceAlert, 'id' | 'createdAt' | 'status'>) => void;
  editAlert: (id: string, updates: Partial<PriceAlert>) => void;
  removeAlert: (id: string) => void;
  toggleActive: (id: string) => void;
  getActiveCount: () => number;
  getTriggeredTodayCount: () => number;
  getAlertsByStatus: (status: PriceAlertStatus | 'all') => PriceAlert[];
}

export const usePriceAlertStore = create<PriceAlertState>((set, get) => ({
  alerts: [],
  isLoading: false,

  loadAlerts: async () => {
    set({ isLoading: true });
    try {
      const isDemoMode = useAuthStore.getState().isDemoMode;
      if (isDemoMode) {
        set({ alerts: demoPriceAlerts, isLoading: false });
        return;
      }
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const alerts = stored ? JSON.parse(stored) : [];
      set({ alerts, isLoading: false });
    } catch {
      set({ alerts: [], isLoading: false });
    }
  },

  addAlert: (input) => {
    const newAlert: PriceAlert = {
      ...input,
      id: `pa-${Date.now()}`,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    const updated = [...get().alerts, newAlert];
    set({ alerts: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  editAlert: (id, updates) => {
    const updated = get().alerts.map((a) => (a.id === id ? { ...a, ...updates } : a));
    set({ alerts: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  removeAlert: (id) => {
    const updated = get().alerts.filter((a) => a.id !== id);
    set({ alerts: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  toggleActive: (id) => {
    const updated = get().alerts.map((a) => {
      if (a.id !== id) return a;
      const newStatus: PriceAlertStatus = a.status === 'active' ? 'expired' : 'active';
      return { ...a, status: newStatus };
    });
    set({ alerts: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  getActiveCount: () => get().alerts.filter((a) => a.status === 'active').length,

  getTriggeredTodayCount: () => {
    const today = new Date().toISOString().slice(0, 10);
    return get().alerts.filter((a) => a.status === 'triggered' && a.triggeredAt?.startsWith(today)).length;
  },

  getAlertsByStatus: (status) => {
    if (status === 'all') return get().alerts;
    return get().alerts.filter((a) => a.status === status);
  },
}));
