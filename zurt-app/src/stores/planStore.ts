import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchSubscription, isDemoMode } from '../services/api';
import { logger } from '../utils/logger';

// =============================================================================
// Types
// =============================================================================

export type PlanTier = 'free' | 'basic' | 'pro' | 'unlimited' | 'consultant' | 'enterprise';
export type PlanStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'none';

export type LimitFeature =
  | 'connections'
  | 'aiQueries'
  | 'reports'
  | 'alerts'
  | 'tools'
  | 'familyGroup'
  | 'exportData';

export interface PlanLimits {
  maxConnections: number;
  maxAiQueriesPerDay: number;
  maxReportsPerMonth: number;
  maxAlerts: number;
  canUseTools: boolean;
  canUseFamilyGroup: boolean;
  canExportData: boolean;
}

export interface PlanUsage {
  aiQueriesToday: number;
  reportsThisMonth: number;
  connectionsCount: number;
  alertsCount: number;
  lastResetDate: string; // YYYY-MM-DD
}

// =============================================================================
// Plan limits configuration
// =============================================================================

const UNLIMITED = 999999;

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxConnections: 1,
    maxAiQueriesPerDay: 3,
    maxReportsPerMonth: 1,
    maxAlerts: 2,
    canUseTools: false,
    canUseFamilyGroup: false,
    canExportData: false,
  },
  basic: {
    maxConnections: 3,
    maxAiQueriesPerDay: 10,
    maxReportsPerMonth: 5,
    maxAlerts: 10,
    canUseTools: true,
    canUseFamilyGroup: false,
    canExportData: false,
  },
  pro: {
    maxConnections: 10,
    maxAiQueriesPerDay: 50,
    maxReportsPerMonth: UNLIMITED,
    maxAlerts: UNLIMITED,
    canUseTools: true,
    canUseFamilyGroup: true,
    canExportData: true,
  },
  unlimited: {
    maxConnections: 99,
    maxAiQueriesPerDay: UNLIMITED,
    maxReportsPerMonth: UNLIMITED,
    maxAlerts: UNLIMITED,
    canUseTools: true,
    canUseFamilyGroup: true,
    canExportData: true,
  },
  consultant: {
    maxConnections: UNLIMITED,
    maxAiQueriesPerDay: UNLIMITED,
    maxReportsPerMonth: UNLIMITED,
    maxAlerts: UNLIMITED,
    canUseTools: true,
    canUseFamilyGroup: true,
    canExportData: true,
  },
  enterprise: {
    maxConnections: UNLIMITED,
    maxAiQueriesPerDay: UNLIMITED,
    maxReportsPerMonth: UNLIMITED,
    maxAlerts: UNLIMITED,
    canUseTools: true,
    canUseFamilyGroup: true,
    canExportData: true,
  },
};

// =============================================================================
// Plan pricing (BRL)
// =============================================================================

export interface PlanInfo {
  tier: PlanTier;
  price: number;
  features: string[];
}

export const PLAN_INFO: PlanInfo[] = [
  { tier: 'free', price: 0, features: ['1 conexão', 'Dashboard básico', 'Cotações'] },
  { tier: 'basic', price: 14.90, features: ['3 conexões', 'Relatórios mensais', 'Suporte email'] },
  { tier: 'pro', price: 19.90, features: ['10 conexões', 'IA Financeira', 'Relatórios ilimitados', 'Alertas', 'Grupo familiar'] },
  { tier: 'unlimited', price: 49.90, features: ['Conexões ilimitadas', 'Tudo do Pro'] },
  { tier: 'consultant', price: 299.90, features: ['Área do cliente', 'Relatórios personalizados'] },
  { tier: 'enterprise', price: 499.90, features: ['Acesso à API', 'Tudo ilimitado'] },
];

// =============================================================================
// Storage
// =============================================================================

const USAGE_STORAGE_KEY = '@zurt_plan_usage';

async function persistUsage(usage: PlanUsage): Promise<void> {
  try {
    await AsyncStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(usage));
  } catch {
    // ignore
  }
}

async function loadPersistedUsage(): Promise<PlanUsage | null> {
  try {
    const raw = await AsyncStorage.getItem(USAGE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function thisMonthStr(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

function defaultUsage(): PlanUsage {
  return {
    aiQueriesToday: 0,
    reportsThisMonth: 0,
    connectionsCount: 0,
    alertsCount: 0,
    lastResetDate: todayStr(),
  };
}

// =============================================================================
// Store
// =============================================================================

interface PlanState {
  plan: PlanTier;
  status: PlanStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;

  limits: PlanLimits;
  usage: PlanUsage;
  isLoading: boolean;
  _initialized: boolean;

  loadSubscription: () => Promise<void>;
  checkLimit: (feature: LimitFeature) => boolean;
  incrementUsage: (feature: LimitFeature) => void;
  resetDailyUsage: () => void;
  setConnectionsCount: (count: number) => void;
  setAlertsCount: (count: number) => void;
  reset: () => void;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plan: 'free',
  status: 'none',
  stripeCustomerId: undefined,
  stripeSubscriptionId: undefined,
  currentPeriodEnd: undefined,

  limits: PLAN_LIMITS.free,
  usage: defaultUsage(),
  isLoading: false,
  _initialized: false,

  loadSubscription: async () => {
    if (get()._initialized) return;
    set({ isLoading: true, _initialized: true });

    // Restore persisted usage
    const savedUsage = await loadPersistedUsage();
    if (savedUsage) {
      set({ usage: savedUsage });
    }

    // Reset daily counters if needed
    get().resetDailyUsage();

    // Demo mode → pro plan for full experience
    if (isDemoMode()) {
      set({
        plan: 'pro',
        status: 'active',
        limits: PLAN_LIMITS.pro,
        isLoading: false,
      });
      return;
    }

    try {
      const data = await fetchSubscription();
      if (data) {
        const tier: PlanTier = data.plan ?? data.tier ?? data.planId ?? 'free';
        const validTier = PLAN_LIMITS[tier] ? tier : 'free';
        set({
          plan: validTier,
          status: data.status ?? 'active',
          stripeCustomerId: data.stripeCustomerId,
          stripeSubscriptionId: data.stripeSubscriptionId ?? data.subscriptionId,
          currentPeriodEnd: data.currentPeriodEnd ?? data.expiresAt,
          limits: PLAN_LIMITS[validTier],
          isLoading: false,
        });
        logger.log('[PLAN] Loaded subscription:', validTier, data.status ?? 'active');
      } else {
        // No subscription data → free
        set({ plan: 'free', status: 'none', limits: PLAN_LIMITS.free, isLoading: false });
      }
    } catch (err: any) {
      logger.log('[PLAN] Error loading subscription:', err?.message);
      // On error, default to free
      set({ plan: 'free', status: 'none', limits: PLAN_LIMITS.free, isLoading: false });
    }
  },

  checkLimit: (feature: LimitFeature): boolean => {
    const { limits, usage } = get();

    switch (feature) {
      case 'connections':
        return usage.connectionsCount < limits.maxConnections;
      case 'aiQueries':
        return usage.aiQueriesToday < limits.maxAiQueriesPerDay;
      case 'reports':
        return usage.reportsThisMonth < limits.maxReportsPerMonth;
      case 'alerts':
        return usage.alertsCount < limits.maxAlerts;
      case 'tools':
        return limits.canUseTools;
      case 'familyGroup':
        return limits.canUseFamilyGroup;
      case 'exportData':
        return limits.canExportData;
      default:
        return true;
    }
  },

  incrementUsage: (feature: LimitFeature) => {
    const { usage } = get();
    let updated: PlanUsage;

    switch (feature) {
      case 'aiQueries':
        updated = { ...usage, aiQueriesToday: usage.aiQueriesToday + 1 };
        break;
      case 'reports':
        updated = { ...usage, reportsThisMonth: usage.reportsThisMonth + 1 };
        break;
      case 'connections':
        updated = { ...usage, connectionsCount: usage.connectionsCount + 1 };
        break;
      case 'alerts':
        updated = { ...usage, alertsCount: usage.alertsCount + 1 };
        break;
      default:
        return;
    }

    set({ usage: updated });
    persistUsage(updated);
  },

  resetDailyUsage: () => {
    const { usage } = get();
    const today = todayStr();
    const currentMonth = thisMonthStr();

    if (usage.lastResetDate === today) return;

    const resetDate = usage.lastResetDate || '';
    const resetMonth = resetDate.slice(0, 7);

    const updated: PlanUsage = {
      ...usage,
      aiQueriesToday: 0,
      // Reset monthly counters if month changed
      reportsThisMonth: resetMonth !== currentMonth ? 0 : usage.reportsThisMonth,
      lastResetDate: today,
    };

    set({ usage: updated });
    persistUsage(updated);
    logger.log('[PLAN] Reset daily usage, date:', today);
  },

  setConnectionsCount: (count: number) => {
    const usage = { ...get().usage, connectionsCount: count };
    set({ usage });
    persistUsage(usage);
  },

  setAlertsCount: (count: number) => {
    const usage = { ...get().usage, alertsCount: count };
    set({ usage });
    persistUsage(usage);
  },

  reset: () => {
    set({
      plan: 'free',
      status: 'none',
      stripeCustomerId: undefined,
      stripeSubscriptionId: undefined,
      currentPeriodEnd: undefined,
      limits: PLAN_LIMITS.free,
      usage: defaultUsage(),
      isLoading: false,
      _initialized: false,
    });
  },
}));
