import { create } from 'zustand';
import type { NewsArticle, NewsCategory } from '../types';
import { useAuthStore } from './authStore';
import { demoNewsArticles } from '../data/demo';

interface NewsState {
  articles: NewsArticle[];
  selectedCategory: NewsCategory | 'all';
  isLoading: boolean;
  error: string | null;

  loadNews: () => Promise<void>;
  setCategory: (category: NewsCategory | 'all') => void;
  getFilteredArticles: () => NewsArticle[];
}

export const useNewsStore = create<NewsState>((set, get) => ({
  articles: [],
  selectedCategory: 'all',
  isLoading: false,
  error: null,

  loadNews: async () => {
    set({ isLoading: true, error: null });
    try {
      const isDemoMode = useAuthStore.getState().isDemoMode;
      if (isDemoMode) {
        set({ articles: demoNewsArticles, isLoading: false });
        return;
      }
      // Real API call placeholder
      set({ articles: demoNewsArticles, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message ?? 'Error loading news' });
    }
  },

  setCategory: (category) => set({ selectedCategory: category }),

  getFilteredArticles: () => {
    const { articles, selectedCategory } = get();
    if (selectedCategory === 'all') return articles;
    return articles.filter((a) => a.category === selectedCategory);
  },
}));
