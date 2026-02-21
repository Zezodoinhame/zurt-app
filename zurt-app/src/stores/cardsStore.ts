import { create } from 'zustand';
import type { CreditCard, CategorySpending } from '../types';
import { fetchCardsApi } from '../services/api';

interface CardsState {
  cards: CreditCard[];
  categorySpending: CategorySpending[];
  selectedCardIndex: number;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

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
  error: null,

  loadCards: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchCardsApi();
      console.log('[ZURT Data] cards:', JSON.stringify(data).substring(0, 500));
      set({
        cards: data.cards,
        categorySpending: data.categorySpending,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err?.message ?? 'Erro ao carregar cartões',
      });
    }
  },

  refresh: async () => {
    set({ isRefreshing: true, error: null });
    try {
      const data = await fetchCardsApi();
      set({
        cards: data.cards,
        categorySpending: data.categorySpending,
        isRefreshing: false,
        error: null,
      });
    } catch (err: any) {
      set({
        isRefreshing: false,
        error: err?.message ?? 'Erro ao atualizar cartões',
      });
    }
  },

  setSelectedCardIndex: (index: number) => set({ selectedCardIndex: index }),

  getSelectedCard: () => {
    const { cards, selectedCardIndex } = get();
    return cards[selectedCardIndex] ?? null;
  },
}));
