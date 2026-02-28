import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { brapiService } from '../services/brapiService';
import {
  fetchMarketIndicators,
  fetchMarketCrypto,
  fetchCurrencyQuote,
  fetchQuoteBatch,
  fetchQuoteFull,
} from '../services/api';
import { logger } from '../utils/logger';
import type { BrapiQuote, BrapiCrypto, BrapiCurrency, InflationEntry, PrimeRateEntry, StockListItem } from '../types/brapi';

const WATCHLIST_KEY = '@zurt_watchlist';
const DEFAULT_USER_WATCHLIST = ['PETR4', 'VALE3', 'ITUB4'];

// ---------------------------------------------------------------------------
// Curated ticker lists (BRAPI /api/quote/list endpoint no longer works on
// the free plan — we fetch quotes directly via /api/quote/{tickers}).
// ---------------------------------------------------------------------------
const POPULAR_STOCKS = [
  'PETR4', 'VALE3', 'ITUB4', 'BBAS3', 'BBDC4', 'WEGE3', 'ABEV3', 'RENT3',
  'RDOR3', 'SUZB3', 'HAPV3', 'GGBR4', 'CSNA3', 'CSAN3', 'JBSS3', 'BRKM5',
  'RAIL3', 'ENGI11', 'PRIO3', 'RAIZ4', 'AZUL4', 'MGLU3', 'TOTS3', 'KLBN11',
  'MULT3', 'CPLE6', 'BRFS3', 'EQTL3', 'LREN3', 'NTCO3', 'CCRO3', 'VIVT3',
  'IRBR3', 'ELET3', 'CMIG4', 'TAEE11', 'B3SA3', 'GOAU4', 'SBSP3', 'UGPA3',
];

const POPULAR_FIIS = [
  'KNRI11', 'HGLG11', 'XPML11', 'VISC11', 'MXRF11', 'HGBS11', 'BTLG11',
  'RECR11', 'KNCR11', 'VGIR11', 'BCFF11', 'IRDM11', 'TGAR11', 'XPLG11',
  'PVBI11',
];

const POPULAR_BDRS = [
  'AAPL34', 'AMZO34', 'GOGL34', 'MSFT34', 'TSLA34', 'NVDC34', 'META34',
  'NFLX34', 'DISB34', 'MELI34',
];

/** Convert a BrapiQuote to the StockListItem used by the market list UI. */
function quoteToListItem(q: BrapiQuote, type: string): StockListItem {
  return {
    stock: q.symbol,
    name: q.shortName || q.longName || q.symbol,
    close: Number(q.regularMarketPrice || 0),
    change: Number(q.regularMarketChangePercent || 0),
    volume: Number(q.regularMarketVolume || 0),
    market_cap: Number(q.marketCap || 0),
    logo: '',
    sector: '',
    type,
  };
}

/** Fetch quotes in batches of `batchSize` to avoid overlong URLs. */
async function fetchQuotesBatched(tickers: string[], batchSize = 20): Promise<BrapiQuote[]> {
  const batches: string[][] = [];
  for (let i = 0; i < tickers.length; i += batchSize) {
    batches.push(tickers.slice(i, i + batchSize));
  }
  const results = await Promise.allSettled(
    batches.map((b) => brapiService.getMultipleQuotes(b)),
  );
  const all: BrapiQuote[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }
  return all;
}

/**
 * Try backend batch endpoint first, fall back to direct BRAPI.
 * Returns BrapiQuote[] in both paths.
 */
async function fetchQuotesWithFallback(tickers: string[]): Promise<BrapiQuote[]> {
  try {
    const backendResults = await fetchQuoteBatch(tickers);
    if (backendResults && backendResults.length > 0) {
      return backendResults as BrapiQuote[];
    }
  } catch {
    // Backend unavailable — fall through
  }
  return fetchQuotesBatched(tickers);
}

type FilterKey = 'all' | 'stock' | 'fund' | 'bdr';

interface MarketState {
  // Dados
  userWatchlist: string[];
  watchlistQuotes: BrapiQuote[];
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
  activeFilter: FilterKey;

  // Actions
  loadMarketOverview: () => Promise<void>;
  loadUserWatchlist: () => Promise<void>;
  searchAssets: (query: string) => Promise<void>;
  loadQuoteDetail: (ticker: string) => Promise<void>;
  loadAllStocks: (page?: number, filter?: FilterKey) => Promise<void>;
  loadCryptos: () => Promise<void>;
  loadCurrencies: () => Promise<void>;
  loadInflation: () => Promise<void>;
  loadSelic: () => Promise<void>;
  loadIbovespa: () => Promise<void>;
  addToWatchlist: (ticker: string) => Promise<void>;
  removeFromWatchlist: (ticker: string) => Promise<void>;
  isInWatchlist: (ticker: string) => boolean;
  setFilter: (filter: FilterKey) => void;
  clearSearch: () => void;
}

export const useMarketStore = create<MarketState>((set, get) => ({
  userWatchlist: [],
  watchlistQuotes: [],
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
      // Try backend first — single request with server-side cache
      const data = await fetchMarketIndicators();

      // Map backend response to store state
      const ibovespa: BrapiQuote = {
        symbol: '^BVSP',
        shortName: 'IBOVESPA',
        regularMarketPrice: data.ibovespa.points,
        regularMarketChangePercent: data.ibovespa.changePercent,
      } as BrapiQuote;

      const currencies: BrapiCurrency[] = (data.currencies ?? []).map((c: any) => ({
        fromCurrency: c.fromCurrency ?? '',
        toCurrency: c.toCurrency ?? '',
        name: c.name ?? '',
        bidPrice: parseFloat(c.bidPrice) || 0,
        askPrice: parseFloat(c.askPrice) || 0,
        regularMarketChange: 0,
        regularMarketChangePercent: parseFloat(c.percentageChange) || 0,
        regularMarketDayHigh: 0,
        regularMarketDayLow: 0,
        regularMarketTime: c.updatedAt ?? '',
        currencyRateFromUSD: 0,
      }));

      const cryptos: BrapiCrypto[] = (data.crypto ?? []).map((c: any) => ({
        coin: c.coin ?? '',
        coinName: c.coinName ?? '',
        currency: 'BRL',
        currencyRateFromUSD: 0,
        regularMarketChange: 0,
        regularMarketPrice: c.regularMarketPrice ?? 0,
        regularMarketChangePercent: c.regularMarketChangePercent ?? 0,
        regularMarketDayHigh: 0,
        regularMarketDayLow: 0,
        regularMarketVolume: 0,
        marketCap: c.marketCap ?? 0,
        coinImageUrl: c.logoUrl ?? '',
      }));

      const usdBrl = currencies.find((c) => c.fromCurrency === 'USD') || null;
      const eurBrl = currencies.find((c) => c.fromCurrency === 'EUR') || null;
      const btcBrl = cryptos[0] || null;
      const currentSelic = data.selic?.value ?? null;
      const currentInflation = data.inflation?.value ?? null;

      set({
        ibovespa,
        currencies,
        cryptos,
        usdBrl,
        eurBrl,
        btcBrl,
        currentSelic: Number(currentSelic) || null,
        currentInflation: Number(currentInflation) || null,
        selic: currentSelic != null ? [{ value: currentSelic, date: data.selic.date, epochDate: new Date(data.selic.date).getTime() / 1000 }] : [],
        inflation: currentInflation != null ? [{ value: currentInflation, date: data.inflation.date, epochDate: new Date(data.inflation.date).getTime() / 1000 }] : [],
        isLoading: false,
      });
    } catch {
      // Backend failed — fall back to direct BRAPI calls
      logger.log('[Market] Backend indicators failed, falling back to BRAPI');
      try {
        const results = await Promise.allSettled([
          brapiService.getIbovespa(),
          brapiService.getCurrencies({ currency: 'USD-BRL,EUR-BRL' }),
          brapiService.getCryptos({ coin: 'BTC', currency: 'BRL' }),
          brapiService.getPrimeRate({ country: 'brazil' }),
          brapiService.getInflation({ country: 'brazil' }),
        ]);

        const ibovespa = results[0].status === 'fulfilled' ? results[0].value : null;
        const currencies = results[1].status === 'fulfilled' ? results[1].value : [];
        const cryptos = results[2].status === 'fulfilled' ? results[2].value : [];
        const selicData = results[3].status === 'fulfilled' ? results[3].value : null;
        const inflationData = results[4].status === 'fulfilled' ? results[4].value : null;

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
          isLoading: false,
        });
      } catch (error) {
        logger.log('[Market] BRAPI fallback also failed:', error);
        set({ isLoading: false, error: 'Erro ao carregar dados do mercado' });
      }
    }
  },

  loadUserWatchlist: async () => {
    try {
      const saved = await AsyncStorage.getItem(WATCHLIST_KEY);
      const tickers: string[] = saved ? JSON.parse(saved) : DEFAULT_USER_WATCHLIST;
      set({ userWatchlist: tickers });
      if (tickers.length > 0) {
        const quotes = await fetchQuotesWithFallback(tickers);
        set({ watchlistQuotes: quotes });
      }
    } catch (error) {
      logger.log('[Market] Watchlist error:', error);
    }
  },

  searchAssets: async (query: string) => {
    if (!query || query.length < 2) {
      set({ searchResults: [], searchQuery: '' });
      return;
    }
    set({ isSearching: true, searchQuery: query });
    try {
      // Use BRAPI /api/available to find matching tickers (no backend equivalent)
      const available: string[] = await brapiService.getAvailable(query);
      const matches = available.slice(0, 20);
      if (matches.length === 0) {
        set({ searchResults: [], isSearching: false });
        return;
      }
      const quotes = await fetchQuotesWithFallback(matches);
      const items: StockListItem[] = quotes.map((q) => {
        const sym = q.symbol || '';
        const type = sym.endsWith('34') ? 'bdr' : sym.endsWith('11') ? 'fund' : 'stock';
        return quoteToListItem(q, type);
      });
      set({ searchResults: items, isSearching: false });
    } catch (error) {
      logger.log('[Market] Search error:', error);
      set({ isSearching: false, searchResults: [] });
    }
  },

  loadQuoteDetail: async (ticker: string) => {
    set({ isLoadingDetail: true, selectedQuote: null });
    try {
      // Try backend full quote first
      const backendQuote = await fetchQuoteFull(ticker);
      if (backendQuote) {
        set({ selectedQuote: backendQuote as BrapiQuote, isLoadingDetail: false });
        return;
      }
    } catch {
      // Fall through to BRAPI
    }
    try {
      const quote = await brapiService.getDetailedQuote(ticker);
      set({ selectedQuote: quote, isLoadingDetail: false });
    } catch (error) {
      logger.log('[Market] Detail error:', error);
      set({ isLoadingDetail: false });
    }
  },

  loadAllStocks: async (page = 1, filter?: FilterKey) => {
    const activeFilter = filter ?? get().activeFilter;
    if (filter) set({ activeFilter: filter });
    set({ isLoading: page === 1, error: null });

    try {
      // Pick the right curated list based on filter
      let tickers: string[];
      let typeLabel: string;
      if (activeFilter === 'stock') {
        tickers = POPULAR_STOCKS;
        typeLabel = 'stock';
      } else if (activeFilter === 'fund') {
        tickers = POPULAR_FIIS;
        typeLabel = 'fund';
      } else if (activeFilter === 'bdr') {
        tickers = POPULAR_BDRS;
        typeLabel = 'bdr';
      } else {
        // 'all' — combine all lists
        tickers = [...POPULAR_STOCKS, ...POPULAR_FIIS, ...POPULAR_BDRS];
        typeLabel = '';
      }

      // Simple pagination: 20 items per page
      const PAGE_SIZE = 20;
      const start = (page - 1) * PAGE_SIZE;
      const slice = tickers.slice(start, start + PAGE_SIZE);

      if (slice.length === 0) {
        set({ hasMore: false, isLoading: false });
        return;
      }

      const quotes = await fetchQuotesWithFallback(slice);

      // Convert to StockListItem
      const items: StockListItem[] = quotes.map((q) => {
        const sym = q.symbol || '';
        const type = typeLabel || (sym.endsWith('34') ? 'bdr' : sym.endsWith('11') ? 'fund' : 'stock');
        return quoteToListItem(q, type);
      });

      // Sort by volume descending
      items.sort((a, b) => b.volume - a.volume);

      set((state) => ({
        allStocks: page === 1 ? items : [...state.allStocks, ...items],
        currentPage: page,
        hasMore: start + PAGE_SIZE < tickers.length,
        isLoading: false,
      }));
    } catch (error) {
      logger.log('[Market] loadAllStocks error:', error);
      set({ isLoading: false, hasMore: false, error: 'Erro ao carregar ativos' });
    }
  },

  loadCryptos: async () => {
    try {
      // Try backend first
      const backendCryptos = await fetchMarketCrypto();
      if (backendCryptos && backendCryptos.length > 0) {
        set({ cryptos: backendCryptos as BrapiCrypto[] });
        return;
      }
    } catch {
      // Fall through
    }
    try {
      const cryptos = await brapiService.getCryptos();
      set({ cryptos });
    } catch (error) {
      logger.log('[Market] Cryptos error:', error);
    }
  },

  loadCurrencies: async () => {
    try {
      // Try backend first
      const data = await fetchCurrencyQuote('USD-BRL,EUR-BRL,GBP-BRL,JPY-BRL,CNY-BRL,ARS-BRL,BTC-BRL');
      const backendCurrencies = data?.currency ?? data;
      if (Array.isArray(backendCurrencies) && backendCurrencies.length > 0) {
        set({ currencies: backendCurrencies as BrapiCurrency[] });
        return;
      }
    } catch {
      // Fall through
    }
    try {
      const currencies = await brapiService.getCurrencies();
      set({ currencies });
    } catch (error) {
      logger.log('[Market] Currencies error:', error);
    }
  },

  loadInflation: async () => {
    try {
      // Try backend indicators for latest value, fall back to BRAPI for historical
      const data = await fetchMarketIndicators();
      if (data?.inflation?.value != null) {
        // Backend only returns latest — for historical we still need BRAPI
        const brapiData = await brapiService.getInflation({ historical: true }).catch(() => null);
        set({ inflation: brapiData?.inflation || [{ value: data.inflation.value, date: data.inflation.date }] });
        return;
      }
    } catch {
      // Fall through
    }
    try {
      const data = await brapiService.getInflation({ historical: true });
      set({ inflation: data?.inflation || [] });
    } catch (error) {
      logger.log('[Market] Inflation error:', error);
    }
  },

  loadSelic: async () => {
    try {
      const data = await fetchMarketIndicators();
      if (data?.selic?.value != null) {
        const brapiData = await brapiService.getPrimeRate({ historical: true }).catch(() => null);
        set({ selic: brapiData?.['prime-rate'] || [{ value: data.selic.value, date: data.selic.date }] });
        return;
      }
    } catch {
      // Fall through
    }
    try {
      const data = await brapiService.getPrimeRate({ historical: true });
      set({ selic: data?.['prime-rate'] || [] });
    } catch (error) {
      logger.log('[Market] Selic error:', error);
    }
  },

  loadIbovespa: async () => {
    try {
      const data = await fetchMarketIndicators();
      if (data?.ibovespa) {
        set({
          ibovespa: {
            symbol: '^BVSP',
            shortName: 'IBOVESPA',
            regularMarketPrice: data.ibovespa.points,
            regularMarketChangePercent: data.ibovespa.changePercent,
          } as BrapiQuote,
        });
        return;
      }
    } catch {
      // Fall through
    }
    try {
      const ibovespa = await brapiService.getIbovespa();
      set({ ibovespa });
    } catch (error) {
      logger.log('[Market] Ibovespa error:', error);
    }
  },

  addToWatchlist: async (ticker: string) => {
    const current = get().userWatchlist;
    if (current.includes(ticker)) return;
    const updated = [...current, ticker];
    await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
    set({ userWatchlist: updated });
    // Reload quotes for the full list
    try {
      const quotes = await fetchQuotesWithFallback(updated);
      set({ watchlistQuotes: quotes });
    } catch (error) {
      logger.log('[Market] Watchlist reload error:', error);
    }
  },

  removeFromWatchlist: async (ticker: string) => {
    const updated = get().userWatchlist.filter((t) => t !== ticker);
    await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
    set({
      userWatchlist: updated,
      watchlistQuotes: get().watchlistQuotes.filter((q) => q.symbol !== ticker),
    });
  },

  isInWatchlist: (ticker: string) => get().userWatchlist.includes(ticker),

  setFilter: (filter: FilterKey) => {
    set({ activeFilter: filter, allStocks: [], currentPage: 1, hasMore: true });
    get().loadAllStocks(1, filter);
  },

  clearSearch: () => {
    set({ searchResults: [], searchQuery: '' });
  },
}));
