import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchSubscription, isDemoMode } from '../services/api';
import { logger } from '../utils/logger';
import { PLANS, PLAN_HIERARCHY, type PlanId, isAtLeastPlan, getPlanIndex } from '../config/plans';

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
// Admin overrides for controlled testing
// =============================================================================

const ADMIN_EMAILS = ['diego@damainvestimentos.com.br'];

const DEFAULT_OVERRIDES: Record<string, PlanTier> = {
  'diego@damainvestimentos.com.br': 'enterprise',
  'marcelo@damainvestimentos.com.br': 'enterprise',
  'andre@damainvestimentos.com.br': 'enterprise',
};

const OVERRIDES_STORAGE_KEY = '@zurt_plan_overrides';

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
    maxConnections: 2,
    maxAiQueriesPerDay: 10,
    maxReportsPerMonth: 3,
    maxAlerts: 3,
    canUseTools: true,
    canUseFamilyGroup: false,
    canExportData: false,
  },
  pro: {
    maxConnections: 5,
    maxAiQueriesPerDay: 25,
    maxReportsPerMonth: 5,
    maxAlerts: 10,
    canUseTools: true,
    canUseFamilyGroup: true,
    canExportData: true,
  },
  unlimited: {
    maxConnections: UNLIMITED,
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
  { tier: 'free', price: 0, features: ['1 conexao', 'Dashboard basico', 'Cotacoes'] },
  { tier: 'basic', price: 14.90, features: ['2 conexoes', 'Relatorios mensais', '10 consultas IA/dia'] },
  { tier: 'pro', price: 19.90, features: ['5 conexoes', 'IA Financeira', '5 relatorios/mes', 'Alertas', 'Exportacao'] },
  { tier: 'unlimited', price: 49.90, features: ['Conexoes ilimitadas', 'IA ilimitada', 'Suporte prioritario'] },
  { tier: 'consultant', price: 299.90, features: ['Area do cliente', 'Relatorios personalizados'] },
  { tier: 'enterprise', price: 149.90, features: ['Tudo ilimitado', 'Reuniao mensal com consultor', 'Suporte VIP'] },
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

  // Admin overrides
  userEmail: string;
  overrides: Record<string, PlanTier>;

  loadSubscription: (userEmail?: string) => Promise<void>;
  checkLimit: (feature: LimitFeature) => boolean;
  incrementUsage: (feature: LimitFeature) => void;
  resetDailyUsage: () => void;
  setConnectionsCount: (count: number) => void;
  setAlertsCount: (count: number) => void;
  reset: () => void;

  // Admin
  isAdmin: () => boolean;
  setPlanOverride: (email: string, plan: PlanTier) => Promise<void>;
  removePlanOverride: (email: string) => Promise<void>;
  getAllOverrides: () => Record<string, PlanTier>;

  // Plan hierarchy
  isAtLeast: (target: PlanTier) => boolean;
  getUpgradePlan: () => PlanTier | null;
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

  userEmail: '',
  overrides: { ...DEFAULT_OVERRIDES },

  loadSubscription: async (userEmail?: string) => {
    if (get()._initialized) return;
    set({ isLoading: true, _initialized: true });

    const email = (userEmail || '').toLowerCase().trim();
    if (email) set({ userEmail: email });

    // Load saved overrides
    try {
      const savedOverrides = await AsyncStorage.getItem(OVERRIDES_STORAGE_KEY);
      if (savedOverrides) {
        const parsed = JSON.parse(savedOverrides);
        set({ overrides: { ...DEFAULT_OVERRIDES, ...parsed } });
      }
    } catch {
      // ignore
    }

    // Restore persisted usage
    const savedUsage = await loadPersistedUsage();
    if (savedUsage) {
      set({ usage: savedUsage });
    }

    // Reset daily counters if needed
    get().resetDailyUsage();

    // Demo mode -> pro plan for full experience
    if (isDemoMode()) {
      set({
        plan: 'pro',
        status: 'active',
        limits: PLAN_LIMITS.pro,
        isLoading: false,
      });
      return;
    }

    // Check admin override first
    const overrides = get().overrides;
    if (email && overrides[email]) {
      const overrideTier = overrides[email];
      logger.log('[PLAN] Admin override:', email, '->', overrideTier);
      set({
        plan: overrideTier,
        status: 'active',
        limits: PLAN_LIMITS[overrideTier],
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
        set({ plan: 'free', status: 'none', limits: PLAN_LIMITS.free, isLoading: false });
      }
    } catch (err: any) {
      logger.log('[PLAN] Error loading subscription:', err?.message);
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
      userEmail: '',
    });
  },

  // =========================================================================
  // Admin overrides
  // =========================================================================

  isAdmin: () => ADMIN_EMAILS.includes(get().userEmail),

  setPlanOverride: async (email: string, plan: PlanTier) => {
    const key = email.toLowerCase().trim();
    const overrides = { ...get().overrides, [key]: plan };
    await AsyncStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
    set({ overrides });
    logger.log('[PLAN] Override set:', key, '->', plan);
  },

  removePlanOverride: async (email: string) => {
    const key = email.toLowerCase().trim();
    const overrides = { ...get().overrides };
    delete overrides[key];
    await AsyncStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
    set({ overrides });
    logger.log('[PLAN] Override removed:', key);
  },

  getAllOverrides: () => get().overrides,

  // =========================================================================
  // Plan hierarchy
  // =========================================================================

  isAtLeast: (target: PlanTier) => {
    const tierOrder: PlanTier[] = ['free', 'basic', 'pro', 'unlimited', 'consultant', 'enterprise'];
    const currentIdx = tierOrder.indexOf(get().plan);
    const targetIdx = tierOrder.indexOf(target);
    return currentIdx >= targetIdx;
  },

  getUpgradePlan: () => {
    const tierOrder: PlanTier[] = ['free', 'basic', 'pro', 'unlimited', 'enterprise'];
    const currentIdx = tierOrder.indexOf(get().plan);
    if (currentIdx < tierOrder.length - 1) return tierOrder[currentIdx + 1];
    return null;
  },
}));
