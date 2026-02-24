import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DiaryEntry, DiaryMood, DiaryTag, DiaryDecision } from '../types';
import { useAuthStore } from './authStore';
import { demoDiaryEntries } from '../data/demo';

const STORAGE_KEY = '@zurt:diary';

interface DiaryState {
  entries: DiaryEntry[];
  selectedTag: DiaryTag | 'all';
  isLoading: boolean;

  loadEntries: () => Promise<void>;
  addEntry: (entry: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editEntry: (id: string, updates: Partial<DiaryEntry>) => void;
  removeEntry: (id: string) => void;
  setTagFilter: (tag: DiaryTag | 'all') => void;
  getFilteredEntries: () => DiaryEntry[];
}

export const useDiaryStore = create<DiaryState>((set, get) => ({
  entries: [],
  selectedTag: 'all',
  isLoading: false,

  loadEntries: async () => {
    set({ isLoading: true });
    try {
      const isDemoMode = useAuthStore.getState().isDemoMode;
      if (isDemoMode) {
        set({ entries: demoDiaryEntries, isLoading: false });
        return;
      }
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const entries = stored ? JSON.parse(stored) : demoDiaryEntries;
      set({ entries, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addEntry: (input) => {
    const now = new Date().toISOString();
    const newEntry: DiaryEntry = {
      ...input,
      id: `diary-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [newEntry, ...get().entries];
    set({ entries: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  editEntry: (id, updates) => {
    const updated = get().entries.map((e) =>
      e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e,
    );
    set({ entries: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  removeEntry: (id) => {
    const updated = get().entries.filter((e) => e.id !== id);
    set({ entries: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  setTagFilter: (tag) => set({ selectedTag: tag }),

  getFilteredEntries: () => {
    const { entries, selectedTag } = get();
    if (selectedTag === 'all') return entries;
    return entries.filter((e) => e.tags.includes(selectedTag));
  },
}));
