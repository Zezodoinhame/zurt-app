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
  _loadedFromDashboard: boolean;

  loadCards: () => Promise<void>;
  refresh: () => Promise<void>;
  setSelectedCardIndex: (index: number) => void;
  getSelectedCard: () => CreditCard | null;
  _setCardsFromDashboard: (cards: CreditCard[]) => void;
}

export const useCardsStore = create<CardsState>((set, get) => ({
  cards: [],
  categorySpending: [],
  selectedCardIndex: 0,
  isLoading: false,
  isRefreshing: false,
  error: null,
  _loadedFromDashboard: false,

  _setCardsFromDashboard: (cards: CreditCard[]) => {
    set({ cards, _loadedFromDashboard: true, isLoading: false, error: null });
  },

  loadCards: async () => {
    // If cards were already loaded from /dashboard/finance, skip
    if (get()._loadedFromDashboard) return;

    set({ isLoading: true, error: null });
    try {
      const data = await fetchCardsApi();
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
    set({ isRefreshing: true, error: null, _loadedFromDashboard: false });
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
