import { create } from 'zustand';
import { brapiService } from '../services/brapiService';
import type { BrapiQuote, BrapiCrypto, BrapiCurrency, InflationEntry, PrimeRateEntry, StockListItem } from '../types/brapi';

interface MarketState {
  // Dados
  watchlist: BrapiQuote[];
  searchResults: StockListItem[];
  selectedQuote: BrapiQuote | null;
  cryptos: BrapiCrypto[];
  currencies: BrapiCurrency[];
  inflation: InflationEntry[];
  selic: PrimeRateEntry[];
  ibovespa: BrapiQuote | null;
  allStocks: StockListItem[];

  // Indicadores macro
  usdBrl: BrapiCurrency | null;
  eurBrl: BrapiCurrency | null;
  btcBrl: BrapiCrypto | null;
  currentSelic: number | null;
  currentInflation: number | null;

  // UI
  isLoading: boolean;
  isSearching: boolean;
  isLoadingDetail: boolean;
  error: string | null;
  currentPage: number;
  hasMore: boolean;
  searchQuery: string;
  activeFilter: 'all' | 'stocks' | 'fiis' | 'bdrs' | 'etfs';

  // Actions
  loadMarketOverview: () => Promise<void>;
  loadWatchlist: () => Promise<void>;
  searchAssets: (query: string) => Promise<void>;
  loadQuoteDetail: (ticker: string) => Promise<void>;
  loadAllStocks: (page?: number, filter?: string) => Promise<void>;
  loadCryptos: () => Promise<void>;
  loadCurrencies: () => Promise<void>;
  loadInflation: () => Promise<void>;
  loadSelic: () => Promise<void>;
  loadIbovespa: () => Promise<void>;
  addToWatchlist: (ticker: string) => void;
  removeFromWatchlist: (ticker: string) => void;
  setFilter: (filter: 'all' | 'stocks' | 'fiis' | 'bdrs' | 'etfs') => void;
  clearSearch: () => void;
}

const DEFAULT_WATCHLIST = ['PETR4', 'VALE3', 'ITUB4', 'BBAS3', 'WEGE3', 'MGLU3'];

export const useMarketStore = create<MarketState>((set, get) => ({
  watchlist: [],
  searchResults: [],
  selectedQuote: null,
  cryptos: [],
  currencies: [],
  inflation: [],
  selic: [],
  ibovespa: null,
  allStocks: [],
  usdBrl: null,
  eurBrl: null,
  btcBrl: null,
  currentSelic: null,
  currentInflation: null,
  isLoading: false,
  isSearching: false,
  isLoadingDetail: false,
  error: null,
  currentPage: 1,
  hasMore: true,
  searchQuery: '',
  activeFilter: 'all',

  loadMarketOverview: async () => {
    set({ isLoading: true, error: null });
    try {
      const results = await Promise.allSettled([
        brapiService.getIbovespa(),
        brapiService.getCurrencies({ currency: 'USD-BRL,EUR-BRL' }),
        brapiService.getCryptos({ coin: 'BTC', currency: 'BRL' }),
        brapiService.getPrimeRate({ country: 'brazil' }),
        brapiService.getInflation({ country: 'brazil' }),
        brapiService.getMultipleQuotes(DEFAULT_WATCHLIST),
      ]);

      const ibovespa = results[0].status === 'fulfilled' ? results[0].value : null;
      const currencies = results[1].status === 'fulfilled' ? results[1].value : [];
      const cryptos = results[2].status === 'fulfilled' ? results[2].value : [];
      const selicData = results[3].status === 'fulfilled' ? results[3].value : null;
      const inflationData = results[4].status === 'fulfilled' ? results[4].value : null;
      const watchlistQuotes = results[5].status === 'fulfilled' ? results[5].value : [];

      const usdBrl = currencies.find((c: BrapiCurrency) => c.fromCurrency === 'USD') || null;
      const eurBrl = currencies.find((c: BrapiCurrency) => c.fromCurrency === 'EUR') || null;
      const btcBrl = cryptos[0] || null;

      const selicArr = selicData?.['prime-rate'] || selicData?.prime_rate || [];
      const inflationArr = inflationData?.inflation || [];
      const currentSelic = selicArr[0]?.value ?? null;
      const currentInflation = inflationArr[0]?.value ?? null;

      set({
        ibovespa,
        currencies,
        cryptos,
        usdBrl,
        eurBrl,
        btcBrl,
        currentSelic: Number(currentSelic) || null,
        currentInflation: Number(currentInflation) || null,
        selic: selicArr,
        inflation: inflationArr,
        watchlist: watchlistQuotes,
        isLoading: false,
      });
    } catch (error) {
      console.error('[Market] Overview error:', error);
      set({ isLoading: false, error: 'Erro ao carregar dados do mercado' });
    }
  },

  loadWatchlist: async () => {
    try {
      const quotes = await brapiService.getMultipleQuotes(DEFAULT_WATCHLIST);
      set({ watchlist: quotes });
    } catch (error) {
      console.error('[Market] Watchlist error:', error);
    }
  },

  searchAssets: async (query: string) => {
    if (!query || query.length < 2) {
      set({ searchResults: [], searchQuery: '' });
      return;
    }
    set({ isSearching: true, searchQuery: query });
    try {
      const results = await brapiService.search(query);
      set({ searchResults: results, isSearching: false });
    } catch (error) {
      console.error('[Market] Search error:', error);
      set({ isSearching: false, searchResults: [] });
    }
  },

  loadQuoteDetail: async (ticker: string) => {
    set({ isLoadingDetail: true, selectedQuote: null });
    try {
      const quote = await brapiService.getDetailedQuote(ticker);
      set({ selectedQuote: quote, isLoadingDetail: false });
    } catch (error) {
      console.error('[Market] Detail error:', error);
      set({ isLoadingDetail: false });
    }
  },

  loadAllStocks: async (page = 1, filter?: string) => {
    set({ isLoading: page === 1 });
    try {
      const type = filter === 'fiis' ? 'fund' : filter === 'bdrs' ? 'bdr' : filter === 'stocks' ? 'stock' : undefined;
      const result = await brapiService.listStocks({
        limit: 50,
        page,
        sortBy: 'volume',
        sortOrder: 'desc',
        type,
      });
      const stocks = result.stocks || [];
      set((state) => ({
        allStocks: page === 1 ? stocks : [...state.allStocks, ...stocks],
        currentPage: page,
        hasMore: stocks.length === 50,
        isLoading: false,
      }));
    } catch (error) {
      console.error('[Market] All stocks error:', error);
      set({ isLoading: false, hasMore: false });
    }
  },

  loadCryptos: async () => {
    try {
      const cryptos = await brapiService.getCryptos();
      set({ cryptos });
    } catch (error) {
      console.error('[Market] Cryptos error:', error);
    }
  },

  loadCurrencies: async () => {
    try {
      const currencies = await brapiService.getCurrencies();
      set({ currencies });
    } catch (error) {
      console.error('[Market] Currencies error:', error);
    }
  },

  loadInflation: async () => {
    try {
      const data = await brapiService.getInflation({ historical: true });
      set({ inflation: data?.inflation || [] });
    } catch (error) {
      console.error('[Market] Inflation error:', error);
    }
  },

  loadSelic: async () => {
    try {
      const data = await brapiService.getPrimeRate({ historical: true });
      set({ selic: data?.['prime-rate'] || [] });
    } catch (error) {
      console.error('[Market] Selic error:', error);
    }
  },

  loadIbovespa: async () => {
    try {
      const ibovespa = await brapiService.getIbovespa();
      set({ ibovespa });
    } catch (error) {
      console.error('[Market] Ibovespa error:', error);
    }
  },

  addToWatchlist: (ticker: string) => {
    // TODO: persist to AsyncStorage
    console.log('[Market] Add to watchlist:', ticker);
  },

  removeFromWatchlist: (ticker: string) => {
    set((state) => ({
      watchlist: state.watchlist.filter((q) => q.symbol !== ticker),
    }));
  },

  setFilter: (filter) => {
    set({ activeFilter: filter, allStocks: [], currentPage: 1, hasMore: true });
    get().loadAllStocks(1, filter);
  },

  clearSearch: () => {
    set({ searchResults: [], searchQuery: '' });
  },
}));
