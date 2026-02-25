import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WatchlistItem } from '../types';
import { useAuthStore } from './authStore';
import { demoWatchlist, demoWatchlistSearchResults } from '../data/demo';

const STORAGE_KEY = '@zurt:watchlist';

interface WatchlistState {
  items: WatchlistItem[];
  searchQuery: string;
  searchResults: WatchlistItem[];
  isLoading: boolean;
  error: string | null;

  loadWatchlist: () => Promise<void>;
  addItem: (item: WatchlistItem) => void;
  removeItem: (id: string) => void;
  searchAssets: (query: string) => void;
  clearSearch: () => void;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  items: [],
  searchQuery: '',
  searchResults: [],
  isLoading: false,
  error: null,

  loadWatchlist: async () => {
    set({ isLoading: true, error: null });
    try {
      const isDemoMode = useAuthStore.getState().isDemoMode;
      if (isDemoMode) {
        set({ items: demoWatchlist, isLoading: false });
        return;
      }
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const items = stored ? JSON.parse(stored) : [];
      set({ items, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message ?? 'Erro ao carregar lista' });
    }
  },

  addItem: (item: WatchlistItem) => {
    const exists = get().items.some((i) => i.ticker === item.ticker);
    if (exists) return;
    const newItem = { ...item, id: `w-${Date.now()}`, addedAt: new Date().toISOString() };
    const updated = [...get().items, newItem];
    set({ items: updated, searchQuery: '', searchResults: [] });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  removeItem: (id: string) => {
    const updated = get().items.filter((i) => i.id !== id);
    set({ items: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  searchAssets: (query: string) => {
    set({ searchQuery: query });
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }
    const q = query.toLowerCase();
    const existing = get().items.map((i) => i.ticker);
    // In demo mode, filter from search results
    const isDemoMode = useAuthStore.getState().isDemoMode;
    const searchSource = isDemoMode ? demoWatchlistSearchResults : [];
    const results = searchSource.filter(
      (a) =>
        !existing.includes(a.ticker) &&
        (a.ticker.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)),
    );
    set({ searchResults: results });
  },

  clearSearch: () => set({ searchQuery: '', searchResults: [] }),
}));
