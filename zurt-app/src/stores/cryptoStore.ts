import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CryptoPortfolio, CryptoHolding } from '../types';
import { useAuthStore } from './authStore';
import { demoCryptoPortfolio } from '../data/demo';
import { logger } from '../utils/logger';

const STORAGE_KEY = '@zurt:crypto';

const COIN_COLORS: Record<string, string> = {
  BTC: '#F7931A', ETH: '#627EEA', USDT: '#26A17B', BNB: '#F3BA2F', SOL: '#9945FF',
  XRP: '#00AAE4', USDC: '#2775CA', ADA: '#0033AD', DOGE: '#C2A633', AVAX: '#E84142',
  TRX: '#FF0013', DOT: '#E6007A', LINK: '#2A5ADA', MATIC: '#8247E5', TON: '#0098EA',
  SHIB: '#FFA409', LTC: '#BFBBBB', UNI: '#FF007A', ATOM: '#2E3148', XLM: '#000000',
};

const COIN_ICONS: Record<string, string> = {
  BTC: '\u20BF', ETH: '\u039E', USDT: '\u20AE', BNB: 'B', SOL: '\u25CE',
  XRP: 'X', USDC: '$', ADA: '\u20B3', DOGE: 'Ð', AVAX: 'A',
  TRX: 'T', DOT: '\u25CF', LINK: '\u26D3', MATIC: 'M', TON: '\u25C6',
  SHIB: 'S', LTC: '\u0141', UNI: '\u{1F984}', ATOM: '\u269B', XLM: '*',
};

interface CryptoState {
  portfolio: CryptoPortfolio;
  isLoading: boolean;
  marketData: CryptoHolding[];

  loadCrypto: () => Promise<void>;
  fetchMarketData: () => Promise<CryptoHolding[]>;
  addHolding: (input: Omit<CryptoHolding, 'id' | 'currentValue'>) => void;
  editHolding: (id: string, updates: Partial<CryptoHolding>) => void;
  removeHolding: (id: string) => void;
  getTotalValue: () => number;
  getDominance: () => { symbol: string; percentage: number; color: string }[];
}

async function fetchFromBRAPI(): Promise<CryptoHolding[]> {
  const response = await fetch(
    'https://brapi.dev/api/v2/crypto?coin=BTC,ETH,SOL,ADA,DOT,AVAX,MATIC,LINK,UNI,DOGE,BNB,XRP,USDT,USDC,LTC,ATOM,XLM,SHIB,TON,TRX&currency=BRL'
  );
  if (!response.ok) throw new Error(`BRAPI error: ${response.status}`);
  const data = await response.json();

  if (!data.coins || data.coins.length === 0) throw new Error('No BRAPI data');

  return data.coins.map((coin: any, index: number) => {
    const symbol = (coin.coin || '').toUpperCase();
    return {
      id: `brapi-${symbol.toLowerCase()}`,
      symbol,
      name: coin.coinName || symbol,
      quantity: 0,
      avgPrice: 0,
      currentPrice: coin.regularMarketPrice ?? 0,
      currentValue: 0,
      change24h: coin.regularMarketChangePercent ?? 0,
      change7d: 0,
      change30d: 0,
      sparkline: [],
      color: COIN_COLORS[symbol] || `hsl(${(index * 37) % 360}, 65%, 55%)`,
      icon: COIN_ICONS[symbol] || symbol.charAt(0),
      marketCap: coin.marketCap ?? 0,
      image: coin.logoUrl ?? '',
    } as CryptoHolding & { marketCap: number; image: string };
  });
}

async function fetchFromCoinGecko(): Promise<CryptoHolding[]> {
  const response = await fetch(
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=brl&order=market_cap_desc&per_page=20&page=1'
  );
  if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`);
  const data = await response.json();

  return data.map((coin: any, index: number) => {
    const symbol = (coin.symbol || '').toUpperCase();
    return {
      id: `cg-${coin.id}`,
      symbol,
      name: coin.name,
      quantity: 0,
      avgPrice: 0,
      currentPrice: coin.current_price ?? 0,
      currentValue: 0,
      change24h: coin.price_change_percentage_24h ?? 0,
      change7d: coin.price_change_percentage_7d_in_currency ?? 0,
      change30d: coin.price_change_percentage_30d_in_currency ?? 0,
      sparkline: coin.sparkline_in_7d?.price?.slice(-7) ?? [],
      color: COIN_COLORS[symbol] || `hsl(${(index * 37) % 360}, 65%, 55%)`,
      icon: COIN_ICONS[symbol] || symbol.charAt(0),
      marketCap: coin.market_cap ?? 0,
      image: coin.image ?? '',
    } as CryptoHolding & { marketCap: number; image: string };
  });
}

async function fetchMarketDataFromAPI(): Promise<CryptoHolding[]> {
  // Try BRAPI first, fall back to CoinGecko
  try {
    return await fetchFromBRAPI();
  } catch {
    return await fetchFromCoinGecko();
  }
}

export const useCryptoStore = create<CryptoState>((set, get) => ({
  portfolio: demoCryptoPortfolio,
  isLoading: false,
  marketData: [],

  fetchMarketData: async () => {
    try {
      const coins = await fetchMarketDataFromAPI();
      set({ marketData: coins });
      return coins;
    } catch (err) {
      logger.warn('CoinGecko fetch failed, using stored data:', err);
      return [];
    }
  },

  loadCrypto: async () => {
    set({ isLoading: true });
    try {
      const isDemoMode = useAuthStore.getState().isDemoMode;
      if (isDemoMode) {
        // Still fetch market data for demo mode to show live prices
        const marketCoins = await fetchMarketDataFromAPI().catch(() => []);
        if (marketCoins.length > 0) {
          // Merge live prices into demo holdings
          const updatedHoldings = demoCryptoPortfolio.holdings.map((h) => {
            const live = marketCoins.find((m) => m.symbol === h.symbol);
            if (live) {
              return {
                ...h,
                currentPrice: live.currentPrice,
                currentValue: h.quantity * live.currentPrice,
                change24h: live.change24h,
              };
            }
            return h;
          });
          const totalValue = updatedHoldings.reduce((s, h) => s + h.currentValue, 0);
          const totalInvested = updatedHoldings.reduce((s, h) => s + h.quantity * h.avgPrice, 0);
          const dominance = updatedHoldings.map((h) => ({
            symbol: h.symbol,
            percentage: totalValue > 0 ? Math.round((h.currentValue / totalValue) * 1000) / 10 : 0,
            color: h.color,
          }));
          set({
            portfolio: {
              ...demoCryptoPortfolio,
              holdings: updatedHoldings,
              totalValue,
              totalInvested,
              totalProfit: totalValue - totalInvested,
              dominance,
            },
            marketData: marketCoins,
            isLoading: false,
          });
        } else {
          set({ portfolio: demoCryptoPortfolio, isLoading: false });
        }
        return;
      }

      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const portfolio: CryptoPortfolio = stored
        ? JSON.parse(stored)
        : { holdings: [], totalValue: 0, totalInvested: 0, totalProfit: 0, change24h: 0, change7d: 0, change30d: 0, fearGreedIndex: 50, dominance: [] };

      // Fetch live market data and merge with stored holdings
      const marketCoins = await fetchMarketDataFromAPI().catch(() => []);
      if (marketCoins.length > 0 && portfolio.holdings.length > 0) {
        const updatedHoldings = portfolio.holdings.map((h) => {
          const live = marketCoins.find((m) => m.symbol === h.symbol);
          if (live) {
            return {
              ...h,
              currentPrice: live.currentPrice,
              currentValue: h.quantity * live.currentPrice,
              change24h: live.change24h,
            };
          }
          return h;
        });
        const totalValue = updatedHoldings.reduce((s, h) => s + h.currentValue, 0);
        const totalInvested = updatedHoldings.reduce((s, h) => s + h.quantity * h.avgPrice, 0);
        const updatedPortfolio: CryptoPortfolio = {
          ...portfolio,
          holdings: updatedHoldings,
          totalValue,
          totalInvested,
          totalProfit: totalValue - totalInvested,
        };
        set({ portfolio: updatedPortfolio, marketData: marketCoins, isLoading: false });
      } else {
        set({ portfolio, marketData: marketCoins, isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  addHolding: (input) => {
    const newHolding: CryptoHolding = {
      ...input,
      id: `c-${Date.now()}`,
      currentValue: input.quantity * input.currentPrice,
    };
    const portfolio = get().portfolio;
    const holdings = [...portfolio.holdings, newHolding];
    const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
    const totalInvested = holdings.reduce((s, h) => s + h.quantity * h.avgPrice, 0);
    const dominance = holdings.map((h) => ({
      symbol: h.symbol,
      percentage: totalValue > 0 ? Math.round((h.currentValue / totalValue) * 1000) / 10 : 0,
      color: h.color,
    }));
    const updated = { ...portfolio, holdings, totalValue, totalInvested, totalProfit: totalValue - totalInvested, dominance };
    set({ portfolio: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  editHolding: (id, updates) => {
    const portfolio = get().portfolio;
    const holdings = portfolio.holdings.map((h) => (h.id === id ? { ...h, ...updates } : h));
    const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
    const updated = { ...portfolio, holdings, totalValue };
    set({ portfolio: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  removeHolding: (id) => {
    const portfolio = get().portfolio;
    const holdings = portfolio.holdings.filter((h) => h.id !== id);
    const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
    const totalInvested = holdings.reduce((s, h) => s + h.quantity * h.avgPrice, 0);
    const dominance = holdings.map((h) => ({
      symbol: h.symbol,
      percentage: totalValue > 0 ? Math.round((h.currentValue / totalValue) * 1000) / 10 : 0,
      color: h.color,
    }));
    const updated = { ...portfolio, holdings, totalValue, totalInvested, totalProfit: totalValue - totalInvested, dominance };
    set({ portfolio: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  getTotalValue: () => get().portfolio.totalValue,

  getDominance: () => get().portfolio.dominance,
}));
