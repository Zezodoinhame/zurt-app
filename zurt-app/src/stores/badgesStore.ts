import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Badge, BadgeCategory } from '../types';
import { useAuthStore } from './authStore';
import { usePortfolioStore } from './portfolioStore';
import { demoBadges } from '../data/demo';
import { logger } from '../utils/logger';

const STORAGE_KEY = '@zurt:badges_earned';

// -----------------------------------------------------------------------------
// Starter badges — always available, conditions checked at runtime
// -----------------------------------------------------------------------------

const STARTER_BADGES: Omit<Badge, 'status' | 'earnedAt' | 'progress'>[] = [
  { id: 'app_installed', emoji: '\uD83D\uDCF1', title: 'App Instalado', description: 'Abriu o ZURT pela primeira vez', category: 'milestones' },
  { id: 'first_connection', emoji: '\uD83C\uDFE6', title: 'Primeira Conexão', description: 'Conectou a primeira conta bancária', category: 'milestones' },
  { id: 'investor', emoji: '\uD83D\uDCCA', title: 'Investidor', description: 'Possui pelo menos 1 investimento', category: 'milestones' },
  { id: 'cards_mapped', emoji: '\uD83D\uDCB3', title: 'Cartões Mapeados', description: 'Cartões de crédito sincronizados', category: 'milestones' },
  { id: 'goal_created', emoji: '\uD83C\uDFAF', title: 'Meta Definida', description: 'Criou sua primeira meta financeira', category: 'milestones' },
  { id: 'net_worth', emoji: '\uD83D\uDCB0', title: 'Patrimônio Registrado', description: 'Patrimônio líquido maior que R$0', category: 'milestones' },
  { id: 'diversified', emoji: '\uD83D\uDCC8', title: 'Diversificado', description: 'Possui 3 ou mais classes de ativos', category: 'milestones' },
  { id: 'alert_active', emoji: '\uD83D\uDD14', title: 'Alerta Ativo', description: 'Criou um alerta de preço', category: 'milestones' },
  { id: 'family_group', emoji: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67', title: 'Família', description: 'Criou um grupo familiar', category: 'milestones' },
];

interface BadgesState {
  badges: Badge[];
  isLoading: boolean;
  error: string | null;
  loadBadges: () => Promise<void>;
  getEarnedCount: () => number;
  getBadgesByCategory: (category: BadgeCategory | 'all') => Badge[];
}

async function loadEarnedIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch { /* ignore */ }
  return new Set();
}

async function persistEarnedIds(ids: Set<string>) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch { /* ignore */ }
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
      // Load previously earned badges
      const earnedIds = await loadEarnedIds();

      // Auto-check conditions
      const { assets, institutions, allocations, summary } = usePortfolioStore.getState();
      const uniqueClasses = new Set(assets.map((a) => a.class));

      // Check each badge condition
      const autoEarn = new Set(earnedIds);

      // App installed — always earned
      autoEarn.add('app_installed');

      // First connection
      if (institutions.length > 0) autoEarn.add('first_connection');

      // Investor
      if (assets.length > 0) autoEarn.add('investor');

      // Cards mapped
      try {
        const { useCardsStore } = await import('./cardsStore');
        const cards = useCardsStore.getState().cards;
        if (cards && cards.length > 0) autoEarn.add('cards_mapped');
      } catch { /* ignore */ }

      // Goal created
      try {
        const goalsRaw = await AsyncStorage.getItem('@zurt:goals');
        if (goalsRaw) {
          const goals = JSON.parse(goalsRaw);
          if (Array.isArray(goals) && goals.length > 0) autoEarn.add('goal_created');
        }
      } catch { /* ignore */ }

      // Net worth > 0
      if (summary && (summary.totalValue ?? 0) > 0) autoEarn.add('net_worth');

      // Diversified (3+ asset classes)
      if (uniqueClasses.size >= 3) autoEarn.add('diversified');

      // Check family store (zustand persist key)
      try {
        const familyRaw = await AsyncStorage.getItem('zurt-family-storage');
        if (familyRaw) {
          const familyData = JSON.parse(familyRaw);
          const state = familyData?.state;
          if (state?.groups?.length > 0) autoEarn.add('family_group');
        }
      } catch { /* ignore */ }

      // Persist any newly earned badges
      if (autoEarn.size > earnedIds.size) {
        await persistEarnedIds(autoEarn);
      }

      const now = new Date().toISOString().split('T')[0];
      const badges: Badge[] = STARTER_BADGES.map((b) => {
        const isEarned = autoEarn.has(b.id);
        return {
          ...b,
          status: isEarned ? 'earned' : 'locked',
          earnedAt: isEarned ? now : undefined,
        };
      });

      set({ badges, isLoading: false });
    } catch (err: any) {
      logger.log('[BadgesStore] loadBadges error:', err?.message ?? err);
      // Still show badges even on error, just all locked
      const badges: Badge[] = STARTER_BADGES.map((b) => ({
        ...b,
        status: 'locked' as const,
      }));
      set({ badges, isLoading: false });
    }
  },

  getEarnedCount: () => get().badges.filter((b) => b.status === 'earned').length,

  getBadgesByCategory: (category) => {
    if (category === 'all') return get().badges;
    return get().badges.filter((b) => b.category === category);
  },
}));
