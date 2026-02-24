import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Subscription, SubscriptionCategory, SubscriptionStatus } from '../types';
import { useAuthStore } from './authStore';
import { demoSubscriptions } from '../data/demo';

const STORAGE_KEY = '@zurt:subscriptions';

// Known subscription service patterns for auto-detection
const SUBSCRIPTION_PATTERNS: Array<{ pattern: RegExp; name: string; icon: string; category: SubscriptionCategory }> = [
  { pattern: /netflix/i, name: 'Netflix', icon: '🎬', category: 'entertainment' },
  { pattern: /spotify/i, name: 'Spotify', icon: '🎵', category: 'entertainment' },
  { pattern: /amazon\s*prime|amzn.*prime|prime\s*video/i, name: 'Amazon Prime', icon: '📦', category: 'entertainment' },
  { pattern: /disney\+|disney\s*plus/i, name: 'Disney+', icon: '🏰', category: 'entertainment' },
  { pattern: /hbo|max/i, name: 'Max (HBO)', icon: '🎭', category: 'entertainment' },
  { pattern: /youtube\s*prem/i, name: 'YouTube Premium', icon: '▶️', category: 'entertainment' },
  { pattern: /apple\s*(tv|music|one|icloud)/i, name: 'Apple Services', icon: '🍎', category: 'cloud' },
  { pattern: /google\s*(one|storage|workspace)/i, name: 'Google One', icon: '☁️', category: 'cloud' },
  { pattern: /microsoft\s*365|office\s*365/i, name: 'Microsoft 365', icon: '💼', category: 'productivity' },
  { pattern: /chatgpt|openai/i, name: 'ChatGPT Plus', icon: '🤖', category: 'productivity' },
  { pattern: /claude|anthropic/i, name: 'Claude Pro', icon: '🧠', category: 'productivity' },
  { pattern: /adobe/i, name: 'Adobe', icon: '🎨', category: 'productivity' },
  { pattern: /uber\s*one|uber.*pass/i, name: 'Uber One', icon: '🚗', category: 'other' },
  { pattern: /ifood/i, name: 'iFood', icon: '🍔', category: 'other' },
  { pattern: /rappi/i, name: 'Rappi', icon: '🛒', category: 'other' },
  { pattern: /gym|academia|smart\s*fit|bio\s*ritmo/i, name: 'Academia', icon: '💪', category: 'health' },
  { pattern: /duolingo/i, name: 'Duolingo', icon: '🦉', category: 'education' },
  { pattern: /xbox|game\s*pass/i, name: 'Xbox Game Pass', icon: '🎮', category: 'entertainment' },
  { pattern: /playstation|ps\s*plus/i, name: 'PlayStation Plus', icon: '🎮', category: 'entertainment' },
  { pattern: /deezer/i, name: 'Deezer', icon: '🎶', category: 'entertainment' },
  { pattern: /globoplay|globo\s*play/i, name: 'Globoplay', icon: '📺', category: 'entertainment' },
  { pattern: /paramount/i, name: 'Paramount+', icon: '⭐', category: 'entertainment' },
  { pattern: /crunchyroll/i, name: 'Crunchyroll', icon: '🍥', category: 'entertainment' },
  { pattern: /notion/i, name: 'Notion', icon: '📝', category: 'productivity' },
  { pattern: /canva/i, name: 'Canva', icon: '🖼️', category: 'productivity' },
];

interface DetectedSubscription {
  id: string;
  name: string;
  icon: string;
  amount: number;
  category: SubscriptionCategory;
  lastCharge: string;
  frequency: 'monthly' | 'yearly' | 'weekly';
}

interface SubscriptionState {
  subscriptions: Subscription[];
  detectedSubscriptions: DetectedSubscription[];
  isLoading: boolean;

  loadSubscriptions: () => Promise<void>;
  autoDetect: () => void;
  confirmDetected: (detected: DetectedSubscription) => void;
  dismissDetected: (id: string) => void;
  addSubscription: (input: Omit<Subscription, 'id' | 'createdAt'>) => void;
  editSubscription: (id: string, updates: Partial<Subscription>) => void;
  removeSubscription: (id: string) => void;
  toggleStatus: (id: string) => void;
  getTotalMonthly: () => number;
  getTotalYearly: () => number;
  getActiveCount: () => number;
  getByCategory: () => { category: SubscriptionCategory; total: number; count: number }[];
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscriptions: [],
  detectedSubscriptions: [],
  isLoading: false,

  loadSubscriptions: async () => {
    set({ isLoading: true });
    try {
      const isDemoMode = useAuthStore.getState().isDemoMode;
      if (isDemoMode) {
        set({ subscriptions: demoSubscriptions, isLoading: false });
        return;
      }
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const subscriptions = stored ? JSON.parse(stored) : [];
      set({ subscriptions, isLoading: false });
      // Auto-detect subscriptions from credit card transactions
      get().autoDetect();
    } catch {
      set({ isLoading: false });
    }
  },

  autoDetect: () => {
    try {
      const { useCardsStore } = require('./cardsStore');
      const transactions = useCardsStore.getState().transactions || [];
      const existing = get().subscriptions;
      const detected: DetectedSubscription[] = [];

      for (const pat of SUBSCRIPTION_PATTERNS) {
        const matches = transactions.filter((t: any) =>
          pat.pattern.test(t.description || '') || pat.pattern.test(t.merchant || ''),
        );
        if (matches.length > 0) {
          const alreadyAdded = existing.some(
            (s) => s.name.toLowerCase() === pat.name.toLowerCase(),
          );
          if (!alreadyAdded) {
            const sorted = [...matches].sort(
              (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            );
            const last = sorted[0] as any;
            detected.push({
              id: `auto_${pat.name.toLowerCase().replace(/\s/g, '_')}`,
              name: pat.name,
              icon: pat.icon,
              amount: Math.abs(last.amount ?? 0),
              category: pat.category,
              lastCharge: last.date,
              frequency: 'monthly',
            });
          }
        }
      }

      if (detected.length > 0) {
        set({ detectedSubscriptions: detected });
      }
    } catch { /* cardsStore may not be loaded yet */ }
  },

  confirmDetected: (detected: DetectedSubscription) => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const newSub: Subscription = {
      id: `sub-${Date.now()}`,
      name: detected.name,
      amount: detected.amount,
      billing: detected.frequency as any,
      category: detected.category,
      status: 'active',
      nextBilling: nextMonth.toISOString().split('T')[0],
      icon: detected.icon,
      color: '#6366F1',
      createdAt: new Date().toISOString(),
    };
    const subs = [...get().subscriptions, newSub];
    const remaining = get().detectedSubscriptions.filter((d) => d.id !== detected.id);
    set({ subscriptions: subs, detectedSubscriptions: remaining });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(subs)).catch(() => {});
  },

  dismissDetected: (id: string) => {
    set({ detectedSubscriptions: get().detectedSubscriptions.filter((d) => d.id !== id) });
  },

  addSubscription: (input) => {
    const newSub: Subscription = { ...input, id: `sub-${Date.now()}`, createdAt: new Date().toISOString() };
    const updated = [...get().subscriptions, newSub];
    set({ subscriptions: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  editSubscription: (id, updates) => {
    const updated = get().subscriptions.map((s) => (s.id === id ? { ...s, ...updates } : s));
    set({ subscriptions: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  removeSubscription: (id) => {
    const updated = get().subscriptions.filter((s) => s.id !== id);
    set({ subscriptions: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  toggleStatus: (id) => {
    const updated = get().subscriptions.map((s) =>
      s.id === id ? { ...s, status: (s.status === 'active' ? 'cancelled' : 'active') as SubscriptionStatus } : s,
    );
    set({ subscriptions: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  getTotalMonthly: () => {
    return get().subscriptions
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => {
        if (s.billing === 'yearly') return sum + s.amount / 12;
        if (s.billing === 'weekly') return sum + s.amount * 4.33;
        return sum + s.amount;
      }, 0);
  },

  getTotalYearly: () => {
    return get().subscriptions
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => {
        if (s.billing === 'yearly') return sum + s.amount;
        if (s.billing === 'weekly') return sum + s.amount * 52;
        return sum + s.amount * 12;
      }, 0);
  },

  getActiveCount: () => get().subscriptions.filter((s) => s.status === 'active').length,

  getByCategory: () => {
    const active = get().subscriptions.filter((s) => s.status === 'active');
    const map = new Map<SubscriptionCategory, { total: number; count: number }>();
    active.forEach((s) => {
      const monthly = s.billing === 'yearly' ? s.amount / 12 : s.billing === 'weekly' ? s.amount * 4.33 : s.amount;
      const prev = map.get(s.category) || { total: 0, count: 0 };
      map.set(s.category, { total: prev.total + monthly, count: prev.count + 1 });
    });
    return Array.from(map.entries()).map(([category, data]) => ({
      category,
      total: Math.round(data.total * 100) / 100,
      count: data.count,
    }));
  },
}));
