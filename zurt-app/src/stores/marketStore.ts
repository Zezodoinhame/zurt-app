import { create } from 'zustand';
import { brapiService } from '../services/brapiService';
import type { BrapiQuote, BrapiCrypto, BrapiCurrency, InflationEntry, PrimeRateEntry, StockListItem } from '../types/brapi';

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

type FilterKey = 'all' | 'stock' | 'fund' | 'bdr';

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
  activeFilter: FilterKey;

  // Actions
  loadMarketOverview: () => Promise<void>;
  loadWatchlist: () => Promise<void>;
  searchAssets: (query: string) => Promise<void>;
  loadQuoteDetail: (ticker: string) => Promise<void>;
  loadAllStocks: (page?: number, filter?: FilterKey) => Promise<void>;
  loadCryptos: () => Promise<void>;
  loadCurrencies: () => Promise<void>;
  loadInflation: () => Promise<void>;
  loadSelic: () => Promise<void>;
  loadIbovespa: () => Promise<void>;
  addToWatchlist: (ticker: string) => void;
  removeFromWatchlist: (ticker: string) => void;
  setFilter: (filter: FilterKey) => void;
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
      // Use /api/available to find matching tickers, then fetch their quotes
      const available: string[] = await brapiService.getAvailable(query);
      const matches = available.slice(0, 20);
      if (matches.length === 0) {
        set({ searchResults: [], isSearching: false });
        return;
      }
      const quotes = await fetchQuotesBatched(matches);
      const items: StockListItem[] = quotes.map((q) => {
        const sym = q.symbol || '';
        const type = sym.endsWith('34') ? 'bdr' : sym.endsWith('11') ? 'fund' : 'stock';
        return quoteToListItem(q, type);
      });
      set({ searchResults: items, isSearching: false });
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

      const quotes = await fetchQuotesBatched(slice);

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
      console.error('[Market] loadAllStocks error:', error);
      set({ isLoading: false, hasMore: false, error: 'Erro ao carregar ativos' });
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

  setFilter: (filter: FilterKey) => {
    set({ activeFilter: filter, allStocks: [], currentPage: 1, hasMore: true });
    get().loadAllStocks(1, filter);
  },

  clearSearch: () => {
    set({ searchResults: [], searchQuery: '' });
  },
}));
