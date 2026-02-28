import { create } from 'zustand';
import type { CreditCard, CategorySpending } from '../types';
import type { DashboardTransaction } from '../services/api';
import { fetchCardsApi, fetchTransactions, clearCardCaches } from '../services/api';
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
    // When backend confirms no cards, purge stale caches so fetchWithFallback
    // won't restore old data on a future network failure.
    if (cards.length === 0) {
      clearCardCaches();
    }
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
      set({ error: err?.message ?? 'Erro ao carregar transações' });
    }
  },

  loadCards: async () => {
    if (get()._loadedFromDashboard) {
      // Dashboard loaded cards but not categorySpending — fetch it
      if (get().categorySpending.length === 0) {
        try {
          const data = await fetchCardsApi();
          set({ categorySpending: data.categorySpending });
        } catch {
          // Silently fail — spending analysis just won't show
        }
      }
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const data = await fetchCardsApi();
      set({
        cards: data.cards,
        categorySpending: data.categorySpending,
        isLoading: false,
        error: null,
      });
      if (data.cards.length === 0) {
        clearCardCaches();
      }
    } catch (err: any) {
      set({
        isLoading: false,
        error: err?.message ?? 'Erro ao carregar cartões',
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
        dashboardTransactions: get().dashboardTransactions,
        isRefreshing: false,
        error: null,
      });
      if (data.cards.length === 0) {
        clearCardCaches();
      }
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
