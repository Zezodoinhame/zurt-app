import { create } from 'zustand';
import type { CreditCard, CategorySpending } from '../types';
import type { DashboardTransaction } from '../services/api';
import { fetchCardsApi } from '../services/api';

interface CardsState {
  cards: CreditCard[];
  categorySpending: CategorySpending[];
  dashboardTransactions: DashboardTransaction[];
  selectedCardIndex: number;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  _loadedFromDashboard: boolean;

  loadCards: () => Promise<void>;
  refresh: () => Promise<void>;
  setSelectedCardIndex: (index: number) => void;
  getSelectedCard: () => CreditCard | null;
  _setCardsFromDashboard: (cards: CreditCard[], transactions?: DashboardTransaction[]) => void;
}

export const useCardsStore = create<CardsState>((set, get) => ({
  cards: [],
  categorySpending: [],
  dashboardTransactions: [],
  selectedCardIndex: 0,
  isLoading: false,
  isRefreshing: false,
  error: null,
  _loadedFromDashboard: false,

  _setCardsFromDashboard: (cards: CreditCard[], transactions?: DashboardTransaction[]) => {
    set({
      cards,
      dashboardTransactions: transactions ?? get().dashboardTransactions,
      _loadedFromDashboard: true,
      isLoading: false,
      error: null,
    });
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
        error: err?.message ?? 'Erro ao carregar cartoes',
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
        error: err?.message ?? 'Erro ao atualizar cartoes',
      });
    }
  },

  setSelectedCardIndex: (index: number) => set({ selectedCardIndex: index }),

  getSelectedCard: () => {
    const { cards, selectedCardIndex } = get();
    return cards[selectedCardIndex] ?? null;
  },
}));
