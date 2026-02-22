import { create } from 'zustand';
import type { CreditCard, CategorySpending } from '../types';
import type { DashboardTransaction } from '../services/api';
import { fetchCardsApi, fetchTransactions } from '../services/api';
import { logger } from '../utils/logger';

interface CardsState {
  cards: CreditCard[];
  categorySpending: CategorySpending[];
  dashboardTransactions: DashboardTransaction[];
  selectedCardIndex: number;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  _loadedFromDashboard: boolean;
  _transactionsLoaded: boolean;

  loadCards: () => Promise<void>;
  loadTransactions: () => Promise<void>;
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
  _transactionsLoaded: false,

  _setCardsFromDashboard: (cards: CreditCard[], transactions?: DashboardTransaction[]) => {
    const hasTx = transactions && transactions.length > 0;
    set({
      cards,
      dashboardTransactions: hasTx ? transactions : get().dashboardTransactions,
      _loadedFromDashboard: true,
      _transactionsLoaded: hasTx ? true : get()._transactionsLoaded,
      isLoading: false,
      error: null,
    });
  },

  loadTransactions: async () => {
    if (get()._transactionsLoaded && get().dashboardTransactions.length > 0) return;

    try {
      const data = await fetchTransactions({ limit: 30 });
      logger.log('[CardsStore] loadTransactions result:', data.transactions.length);
      if (data.transactions.length > 0) {
        const mapped: DashboardTransaction[] = data.transactions.map((t: any) => ({
          id: String(t.id ?? ''),
          date: t.date ?? t.created_at ?? '',
          amount: parseFloat(t.amount ?? '0') || 0,
          description: t.description ?? t.merchant ?? '',
          merchant: t.merchant ?? '',
          account_name: t.account_name ?? '',
          institution_name: t.institution_name ?? '',
          category: t.category ?? '',
        }));
        set({ dashboardTransactions: mapped, _transactionsLoaded: true });
      }
    } catch (err: any) {
      logger.log('[CardsStore] loadTransactions error:', err?.message);
    }
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
    set({ isRefreshing: true, error: null, _loadedFromDashboard: false, _transactionsLoaded: false });
    try {
      const data = await fetchCardsApi();
      set({
        cards: data.cards,
        categorySpending: data.categorySpending,
        dashboardTransactions: [],
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
