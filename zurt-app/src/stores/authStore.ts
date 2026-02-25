import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../types';
import { demoUser } from '../data/demo';
import {
  loginApi,
  registerApi,
  clearToken,
  fetchUserProfile,
  getToken,
  setDemoMode,
  setOnUnauthorized,
} from '../services/api';
import { clearSession } from '../services/auth';
import { logger } from '../utils/logger';
import { usePushStore } from './pushStore';

// ---------------------------------------------------------------------------
// All AsyncStorage keys that hold user-specific data.
// Settings keys (theme, language, currency, accentColor, iconStyle) are
// intentionally excluded — they are device preferences, not user data.
// ---------------------------------------------------------------------------
const USER_DATA_STORAGE_KEYS = [
  // Backend-synced stores (also cleared in-memory below)
  '@zurt:agent_messages',
  // Local-only user data
  '@zurt:badges_earned',
  '@zurt:bills',
  '@zurt:budget',
  '@zurt:calendar',
  '@zurt:challenges',
  '@zurt:crypto',
  '@zurt:debts',
  '@zurt:diary',
  '@zurt:emergency',
  '@zurt:learn',
  '@zurt:networth',
  '@zurt:priceAlerts',
  '@zurt:recurringInvestments',
  '@zurt:subscriptions',
  '@zurt:watchlist',
  '@zurt_plan_usage',
  // Zustand persist
  'zurt-family-storage',
  // API response cache
  'cache:user:profile',
  'cache:dashboard:finance',
  'cache:finance:investments',
  'cache:finance:accounts',
  'cache:finance:cards',
  'cache:notifications',
  'cache:connections',
  'cache:goals',
  'cache:subscription:current',
  'cache:subscription:history',
  'cache:reports',
  'cache:customer:conversations',
  'cache:customer:invitations',
  'cache:plans',
  'cache:investments:holdings',
  'cache:investments:summary',
  // Offline queue
  'zurt:pendingActions',
];

/** Reset data stores to prevent leaking data between accounts */
function resetDataStores() {
  // 1. Clear in-memory state of backend-synced stores
  try {
    const { usePortfolioStore } = require('./portfolioStore');
    const { useCardsStore } = require('./cardsStore');
    const { useGoalsStore } = require('./goalsStore');
    const { useAgentStore } = require('./agentStore');
    const { useNotificationStore } = require('./notificationStore');
    usePortfolioStore.setState({ summary: null, institutions: [], assets: [], allocations: [], insights: [], benchmarks: null, isLoading: false, isRefreshing: false, error: null });
    useCardsStore.setState({ cards: [], categorySpending: [], dashboardTransactions: [], selectedCardIndex: 0, isLoading: false, isRefreshing: false, error: null, _loadedFromDashboard: false, _transactionsLoaded: false });
    useGoalsStore.setState({ goals: [], isLoading: false, error: null });
    useAgentStore.setState({ messages: [], conversationId: null, isLoading: false, error: null, rateLimited: false, _initialized: false });
    useNotificationStore.setState({ notifications: [], smartAlerts: [], isLoading: false, isRefreshing: false, error: null, filter: 'all' });
    const { usePlanStore } = require('./planStore');
    usePlanStore.getState().reset();
  } catch {
    // Stores may not be loaded yet
  }

  // 2. Clear all user-specific AsyncStorage data + API cache
  AsyncStorage.multiRemove(USER_DATA_STORAGE_KEYS).catch(() => {});
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemoMode: boolean;
  valuesHidden: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  register: (
    fullName: string,
    email: string,
    password: string,
    invitationToken?: string,
  ) => Promise<boolean>;
  loginDemo: () => void;
  logout: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
  setLoading: (loading: boolean) => void;
  toggleValuesHidden: () => void;
  updateUser: (updates: Partial<User>) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Register 401 handler to auto-logout
  setOnUnauthorized(() => {
    const state = get();
    if (state.isAuthenticated && !state.isDemoMode) {
      // Best-effort push token unregister (token already cleared by api.ts)
      try { usePushStore.getState().unregisterPushToken(); } catch {}
      set({
        user: null,
        isAuthenticated: false,
        isDemoMode: false,
        valuesHidden: false,
      });
      setDemoMode(false);
      resetDataStores();
    }
  });

  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isDemoMode: false,
    valuesHidden: false,
    error: null,

    login: async (email: string, password: string) => {
      logger.log('[ZURT Auth] login() called');
      set({ isLoading: true, error: null });
      // Preventive cleanup: clear stale data from any previous session
      resetDataStores();

      try {
        const { user } = await loginApi(email, password);
        logger.log('[ZURT Auth] login() success');
        setDemoMode(false);
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          isDemoMode: false,
          error: null,
        });
        return true;
      } catch (err: any) {
        logger.log('[ZURT Auth] login() failed:', err?.message ?? err);
        // API failed - fall back to demo mode if credentials match demo user
        if (email === 'diego@zurt.io') {
          logger.log('[ZURT Auth] falling back to demo mode');
          setDemoMode(true);
          set({
            user: demoUser,
            isAuthenticated: true,
            isLoading: false,
            isDemoMode: true,
            error: null,
          });
          return true;
        }
        const message =
          err?.message?.includes('401') || err?.message?.includes('Unauthorized')
            ? 'Email ou senha incorretos'
            : 'Erro de conexão. Tente novamente.';
        set({ isLoading: false, error: message });
        return false;
      }
    },

    register: async (
      fullName: string,
      email: string,
      password: string,
      invitationToken?: string,
    ) => {
      set({ isLoading: true, error: null });
      // Preventive cleanup: clear stale data from any previous session
      resetDataStores();

      try {
        // Clear any previous session before registering
        await clearToken();
        const { user } = await registerApi(fullName, email, password, invitationToken);
        setDemoMode(false);
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          isDemoMode: false,
          error: null,
        });
        return true;
      } catch (err: any) {
        const message =
          err?.message?.includes('409') || err?.message?.includes('already')
            ? 'Email já cadastrado'
            : 'Erro ao criar conta. Tente novamente.';
        set({ isLoading: false, error: message });
        return false;
      }
    },

    loginDemo: () => {
      // Preventive cleanup: clear stale data from any previous session
      resetDataStores();
      setDemoMode(true);
      set({
        user: demoUser,
        isAuthenticated: true,
        isDemoMode: true,
        isLoading: false,
        error: null,
      });
    },

    restoreSession: async () => {
      logger.log('[ZURT Auth] restoreSession() called');
      const token = await getToken();
      logger.log('[ZURT Auth] restoreSession() token:', token ? 'EXISTS' : 'NONE');
      if (!token) return false;

      try {
        const user = await fetchUserProfile();
        logger.log('[ZURT Auth] restoreSession() success');
        setDemoMode(false);
        set({
          user,
          isAuthenticated: true,
          isDemoMode: false,
        });
        return true;
      } catch (err: any) {
        logger.log('[ZURT Auth] restoreSession() failed:', err?.message ?? err);
        await clearToken();
        return false;
      }
    },

    logout: async () => {
      try {
        await usePushStore.getState().unregisterPushToken();
      } catch {
        // Silently fail
      }
      await clearToken();
      await clearSession().catch(() => {});
      setDemoMode(false);
      set({
        user: null,
        isAuthenticated: false,
        isDemoMode: false,
        valuesHidden: false,
        error: null,
      });
      resetDataStores();
    },

    setLoading: (loading: boolean) => set({ isLoading: loading }),

    toggleValuesHidden: () =>
      set((state) => ({ valuesHidden: !state.valuesHidden })),

    updateUser: (updates: Partial<User>) =>
      set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),

    clearError: () => set({ error: null }),
  };
});
