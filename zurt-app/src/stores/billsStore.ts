import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Bill, BillStatus, BillFrequency, TransactionCategory } from '../types';
import { useAuthStore } from './authStore';
import { demoBills } from '../data/demo';

const STORAGE_KEY = '@zurt:bills';

interface BillsState {
  bills: Bill[];
  isLoading: boolean;
  error: string | null;

  loadBills: () => Promise<void>;
  addBill: (bill: Omit<Bill, 'id' | 'createdAt'>) => void;
  editBill: (id: string, updates: Partial<Bill>) => void;
  removeBill: (id: string) => void;
  togglePaid: (id: string) => void;
  saveBills: () => Promise<void>;
  getTotalMonthly: () => number;
  getPaidCount: () => number;
  getNextDue: () => Bill | undefined;
  getBillsByStatus: (status: BillStatus | 'all') => Bill[];
}

export const useBillsStore = create<BillsState>((set, get) => ({
  bills: [],
  isLoading: false,
  error: null,

  loadBills: async () => {
    set({ isLoading: true, error: null });
    try {
      const isDemoMode = useAuthStore.getState().isDemoMode;
      if (isDemoMode) {
        set({ bills: demoBills, isLoading: false });
        return;
      }
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const bills = stored ? JSON.parse(stored) : [];
      set({ bills, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message ?? 'Error loading bills' });
    }
  },

  addBill: (input) => {
    const newBill: Bill = { ...input, id: `bill-${Date.now()}`, createdAt: new Date().toISOString() };
    const updated = [...get().bills, newBill];
    set({ bills: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  editBill: (id, updates) => {
    const updated = get().bills.map((b) => (b.id === id ? { ...b, ...updates } : b));
    set({ bills: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  removeBill: (id) => {
    const updated = get().bills.filter((b) => b.id !== id);
    set({ bills: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  togglePaid: (id) => {
    const updated = get().bills.map((b) =>
      b.id === id ? { ...b, status: (b.status === 'paid' ? 'pending' : 'paid') as BillStatus } : b,
    );
    set({ bills: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  saveBills: async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(get().bills));
  },

  getTotalMonthly: () => get().bills.reduce((sum, b) => sum + b.amount, 0),

  getPaidCount: () => get().bills.filter((b) => b.status === 'paid').length,

  getNextDue: () => {
    const pending = get().bills.filter((b) => b.status !== 'paid').sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return pending[0];
  },

  getBillsByStatus: (status) => {
    const { bills } = get();
    if (status === 'all') return bills;
    return bills.filter((b) => b.status === status);
  },
}));
