import { create } from 'zustand';
import type { CreditCard, CategorySpending } from '../types';
import { fetchCardsApi } from '../services/api';

interface CardsState {
  cards: CreditCard[];
  categorySpending: CategorySpending[];
  selectedCardIndex: number;
  isLoading: boolean;
  isRefreshing: boolean;

  loadCards: () => Promise<void>;
  refresh: () => Promise<void>;
  setSelectedCardIndex: (index: number) => void;
  getSelectedCard: () => CreditCard | null;
}

export const useCardsStore = create<CardsState>((set, get) => ({
  cards: [],
  categorySpending: [],
  selectedCardIndex: 0,
  isLoading: false,
  isRefreshing: false,

  loadCards: async () => {
    set({ isLoading: true });
    try {
      const data = await fetchCardsApi();
      set({
        cards: data.cards,
        categorySpending: data.categorySpending,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  refresh: async () => {
    set({ isRefreshing: true });
    try {
      const data = await fetchCardsApi();
      set({
        cards: data.cards,
        categorySpending: data.categorySpending,
        isRefreshing: false,
      });
    } catch {
      set({ isRefreshing: false });
    }
  },

  setSelectedCardIndex: (index: number) => set({ selectedCardIndex: index }),

  getSelectedCard: () => {
    const { cards, selectedCardIndex } = get();
    return cards[selectedCardIndex] ?? null;
  },
}));
