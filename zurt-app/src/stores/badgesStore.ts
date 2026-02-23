import { create } from 'zustand';
import type { Badge, BadgeCategory } from '../types';
import { useAuthStore } from './authStore';
import { demoBadges } from '../data/demo';
import { logger } from '../utils/logger';

interface BadgesState {
  badges: Badge[];
  isLoading: boolean;
  error: string | null;
  loadBadges: () => Promise<void>;
  getEarnedCount: () => number;
  getBadgesByCategory: (category: BadgeCategory | 'all') => Badge[];
}

export const useBadgesStore = create<BadgesState>((set, get) => ({
  badges: [],
  isLoading: false,
  error: null,

  loadBadges: async () => {
    set({ isLoading: true, error: null });

    const isDemoMode = useAuthStore.getState().isDemoMode;
    if (isDemoMode) {
      set({ badges: demoBadges, isLoading: false });
      return;
    }

    try {
      // Production: fetch from API
      set({ badges: demoBadges, isLoading: false });
    } catch (err: any) {
      logger.log('[BadgesStore] loadBadges error:', err?.message ?? err);
      set({ badges: demoBadges, isLoading: false });
    }
  },

  getEarnedCount: () => get().badges.filter((b) => b.status === 'earned').length,

  getBadgesByCategory: (category) => {
    if (category === 'all') return get().badges;
    return get().badges.filter((b) => b.category === category);
  },
}));
