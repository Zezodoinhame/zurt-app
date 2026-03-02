import { create } from 'zustand';
import type { NewsArticle, NewsCategory } from '../types';
import { useAuthStore } from './authStore';
import { useSettingsStore } from './settingsStore';
import { demoNewsArticles } from '../data/demo';

// =============================================================================
// RSS Parsing (no external dependency)
// =============================================================================

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

function parseRSSItems(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    const extract = (tag: string): string => {
      const m = content.match(
        new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`, 's'),
      );
      return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
    };
    items.push({
      title: extract('title'),
      link: extract('link'),
      pubDate: extract('pubDate'),
      description: extract('description').replace(/<[^>]*>/g, '').slice(0, 150),
    });
  }
  return items;
}

const RSS_FEEDS: { name: string; url: string; fallbackCategory: NewsCategory }[] = [
  { name: 'InfoMoney', url: 'https://www.infomoney.com.br/feed/', fallbackCategory: 'market' },
  { name: 'Valor Econômico', url: 'https://pox.globo.com/rss/valor/', fallbackCategory: 'economy' },
];

function categorize(title: string, fallback: NewsCategory): NewsCategory {
  const t = title.toLowerCase();
  if (/bitcoin|btc|cripto|ethereum|crypto/.test(t)) return 'crypto';
  if (/dólar|câmbio|forex/.test(t)) return 'economy';
  if (/selic|copom|inflação|ipca|pib|fiscal/.test(t)) return 'economy';
  if (/ibovespa|b3|bolsa/.test(t)) return 'market';
  if (/fii|fundo imobiliário|rendimento/.test(t)) return 'funds';
  if (/[A-Z]{4}\d/.test(title)) return 'stocks';
  return fallback;
}

function extractTickers(title: string): string[] {
  return [...new Set(title.match(/[A-Z]{4}\d{1,2}/g) || [])];
}

// =============================================================================
// Store
// =============================================================================

interface NewsState {
  articles: NewsArticle[];
  selectedCategory: NewsCategory | 'all';
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  loadNews: () => Promise<void>;
  refreshNews: () => Promise<void>;
  setCategory: (category: NewsCategory | 'all') => void;
  getFilteredArticles: () => NewsArticle[];
}

async function fetchRSSArticles(): Promise<NewsArticle[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(feed.url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'ZURT/1.0' },
        });
        clearTimeout(timeout);
        const xml = await res.text();
        return parseRSSItems(xml).slice(0, 10).map((item, i) => ({
          id: item.link || `${feed.name}-${i}`,
          title: item.title,
          source: feed.name,
          date: item.pubDate,
          summary: item.description ? item.description + '...' : '',
          category: categorize(item.title, feed.fallbackCategory),
          relatedTickers: extractTickers(item.title),
          url: item.link,
        }));
      } catch {
        clearTimeout(timeout);
        return [];
      }
    }),
  );

  const all: NewsArticle[] = [];
  results.forEach((r) => {
    if (r.status === 'fulfilled') all.push(...r.value);
  });

  // Sort by date (newest first)
  return all.sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    if (isNaN(da) && isNaN(db)) return 0;
    if (isNaN(da)) return 1;
    if (isNaN(db)) return -1;
    return db - da;
  });
}

export const useNewsStore = create<NewsState>((set, get) => ({
  articles: [],
  selectedCategory: 'all',
  isLoading: false,
  isRefreshing: false,
  error: null,

  loadNews: async () => {
    set({ isLoading: true, error: null });
    try {
      const isDemoMode = useAuthStore.getState().isDemoMode;
      if (isDemoMode) {
        set({ articles: demoNewsArticles, isLoading: false });
        return;
      }
      const articles = await fetchRSSArticles();
      set({ articles, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: useSettingsStore.getState().t('news.loadError') });
    }
  },

  refreshNews: async () => {
    set({ isRefreshing: true, error: null });
    try {
      const isDemoMode = useAuthStore.getState().isDemoMode;
      if (isDemoMode) {
        set({ articles: demoNewsArticles, isRefreshing: false });
        return;
      }
      const articles = await fetchRSSArticles();
      set({ articles, isRefreshing: false });
    } catch (err: any) {
      set({ isRefreshing: false, error: useSettingsStore.getState().t('news.loadError') });
    }
  },

  setCategory: (category) => set({ selectedCategory: category }),

  getFilteredArticles: () => {
    const { articles, selectedCategory } = get();
    if (selectedCategory === 'all') return articles;
    return articles.filter((a) => a.category === selectedCategory);
  },
}));
