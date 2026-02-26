import { create } from 'zustand';
import { brapiService } from '../services/brapiService';
import type { BrapiQuote, BrapiCrypto, BrapiCurrency, InflationEntry, PrimeRateEntry } from '../types/brapi';

interface MarketState {
  // Dados
  watchlist: BrapiQuote[];
  searchResults: any[];
  selectedQuote: BrapiQuote | null;
  cryptos: BrapiCrypto[];
  currencies: BrapiCurrency[];
  inflation: InflationEntry[];
  selic: PrimeRateEntry[];
  ibovespa: BrapiQuote | null;

  // Loading states
  loading: boolean;
  error: string | null;

  // Actions
  loadWatchlist: () => Promise<void>;
  searchAssets: (query: string) => Promise<void>;
  loadQuoteDetail: (ticker: string) => Promise<void>;
  loadCryptos: () => Promise<void>;
  loadCurrencies: () => Promise<void>;
  loadInflation: () => Promise<void>;
  loadSelic: () => Promise<void>;
  loadIbovespa: () => Promise<void>;
  loadMarketOverview: () => Promise<void>;
  addToWatchlist: (ticker: string) => void;
  removeFromWatchlist: (ticker: string) => void;
}

const DEFAULT_WATCHLIST = ['PETR4', 'VALE3', 'ITUB4', 'MGLU3', 'BBAS3', 'WEGE3'];

export const useMarketStore = create<MarketState>((set, get) => ({
  watchlist: [],
  searchResults: [],
  selectedQuote: null,
  cryptos: [],
  currencies: [],
  inflation: [],
  selic: [],
  ibovespa: null,
  loading: false,
  error: null,

  loadWatchlist: async () => {
    try {
      set({ loading: true, error: null });
      const tickers = DEFAULT_WATCHLIST; // TODO: load from AsyncStorage
      const results = await brapiService.getQuote(tickers, { fundamental: true });
      set({ watchlist: results, loading: false });
    } catch (error: any) {
      console.log('[Market] Error loading watchlist:', error.message);
      set({ loading: false, error: error.message });
    }
  },

  searchAssets: async (query: string) => {
    try {
      set({ loading: true });
      const data = await brapiService.listQuotes({ search: query, limit: 20 });
      set({ searchResults: data.stocks || [], loading: false });
    } catch (error: any) {
      set({ loading: false, error: error.message });
    }
  },

  loadQuoteDetail: async (ticker: string) => {
    try {
      set({ loading: true, error: null });
      const results = await brapiService.getQuote(ticker, {
        range: '1mo',
        interval: '1d',
        fundamental: true,
        dividends: true,
        modules: ['summaryProfile', 'financialData', 'defaultKeyStatistics'],
      });
      set({ selectedQuote: results?.[0] || null, loading: false });
    } catch (error: any) {
      set({ loading: false, error: error.message });
    }
  },

  loadCryptos: async () => {
    try {
      set({ loading: true });
      const coins = await brapiService.getCrypto('BTC,ETH,SOL,BNB,XRP,ADA,DOGE,DOT,AVAX,MATIC', 'BRL');
      set({ cryptos: coins || [], loading: false });
    } catch (error: any) {
      set({ loading: false, error: error.message });
    }
  },

  loadCurrencies: async () => {
    try {
      set({ loading: true });
      const currencies = await brapiService.getCurrency('USD-BRL,EUR-BRL,GBP-BRL,BTC-BRL,JPY-BRL,ARS-BRL,CNY-BRL');
      set({ currencies: currencies || [], loading: false });
    } catch (error: any) {
      set({ loading: false, error: error.message });
    }
  },

  loadInflation: async () => {
    try {
      const inflation = await brapiService.getInflation('brazil', { historical: true });
      set({ inflation: inflation || [] });
    } catch (error: any) {
      console.log('[Market] Error loading inflation:', error.message);
    }
  },

  loadSelic: async () => {
    try {
      const selic = await brapiService.getPrimeRate('brazil', { historical: true });
      set({ selic: selic || [] });
    } catch (error: any) {
      console.log('[Market] Error loading SELIC:', error.message);
    }
  },

  loadIbovespa: async () => {
    try {
      const results = await brapiService.getQuote('^BVSP', { range: '1d' });
      set({ ibovespa: results?.[0] || null });
    } catch (error: any) {
      console.log('[Market] Error loading Ibovespa:', error.message);
    }
  },

  loadMarketOverview: async () => {
    const { loadWatchlist, loadIbovespa, loadCurrencies, loadCryptos } = get();
    await Promise.allSettled([
      loadWatchlist(),
      loadIbovespa(),
      loadCurrencies(),
      loadCryptos(),
    ]);
  },

  addToWatchlist: (ticker: string) => {
    // TODO: persist in AsyncStorage
    const { watchlist } = get();
    if (!watchlist.find(q => q.symbol === ticker)) {
      brapiService.getQuote(ticker, { fundamental: true }).then(results => {
        if (results?.[0]) {
          set({ watchlist: [...get().watchlist, results[0]] });
        }
      });
    }
  },

  removeFromWatchlist: (ticker: string) => {
    set({ watchlist: get().watchlist.filter(q => q.symbol !== ticker) });
  },
}));
