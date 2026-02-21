// =============================================================================
// ZURT Wealth Intelligence - API Service
// Real backend calls with demo data fallback
// =============================================================================

import * as SecureStore from 'expo-secure-store';
import {
  demoUser,
  portfolioSummary,
  institutions as demoInstitutions,
  assets as demoAssets,
  allocations as demoAllocations,
  creditCards as demoCards,
  notifications as demoNotifications,
  insights as demoInsights,
  categorySpending as demoCategorySpending,
} from '../data/demo';
import type {
  User,
  PortfolioSummary,
  Institution,
  Asset,
  Allocation,
  CreditCard,
  Notification,
  Insight,
  CategorySpending,
} from '../types';

// =============================================================================
// Config
// =============================================================================

const API_BASE = 'https://zurt.com.br/api';
const TOKEN_KEY = 'zurt_session';
const REQUEST_TIMEOUT = 10000; // 10s

// =============================================================================
// Token management
// =============================================================================

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// =============================================================================
// HTTP client
// =============================================================================

async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...headers, ...(options?.headers as Record<string, string>) },
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(
        `API ${response.status}: ${errorBody || response.statusText}`,
      );
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

// =============================================================================
// Auth
// =============================================================================

export interface LoginResponse {
  token: string;
  user: any;
}

export async function loginApi(
  email: string,
  password: string,
): Promise<{ token: string; user: User }> {
  const data = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const token = data.token;
  if (token) {
    await saveToken(token);
  }

  const raw = data.user ?? data;
  const name = raw.name ?? raw.full_name ?? '';
  const user: User = {
    id: String(raw.id ?? '1'),
    name,
    email: raw.email ?? email,
    initials: name
      .split(' ')
      .filter(Boolean)
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2),
    biometricEnabled: raw.biometricEnabled ?? raw.biometric_enabled ?? true,
    hideValuesOnOpen: raw.hideValuesOnOpen ?? raw.hide_values_on_open ?? false,
    pushEnabled: raw.pushEnabled ?? raw.push_enabled ?? true,
    zurtTokens: raw.zurtTokens ?? raw.zurt_tokens ?? 0,
    revenueShareReceived:
      raw.revenueShareReceived ?? raw.revenue_share_received ?? 0,
    nextDistribution: raw.nextDistribution ?? raw.next_distribution ?? '',
  };

  return { token, user };
}

// =============================================================================
// Dashboard Summary
// =============================================================================

export async function fetchDashboardSummary(): Promise<{
  summary: PortfolioSummary;
  institutions: Institution[];
  allocations: Allocation[];
  insights: Insight[];
}> {
  try {
    const data = await apiRequest<any>('/dashboard/summary');

    const summary: PortfolioSummary = data.summary ??
      data.portfolio ?? {
        totalValue: data.totalValue ?? data.total_value ?? 0,
        investedValue: data.investedValue ?? data.invested_value ?? 0,
        profit: data.profit ?? 0,
        variation1m: data.variation1m ?? data.variation_1m ?? 0,
        variation12m: data.variation12m ?? data.variation_12m ?? 0,
        history: (data.history ?? []).map((h: any) => ({
          month: h.month,
          date: h.date,
          value: h.value,
        })),
      };

    return {
      summary,
      institutions: data.institutions ?? demoInstitutions,
      allocations: data.allocations ?? demoAllocations,
      insights: data.insights ?? demoInsights,
    };
  } catch {
    // Fallback to demo data
    return {
      summary: portfolioSummary,
      institutions: demoInstitutions,
      allocations: demoAllocations,
      insights: demoInsights,
    };
  }
}

// =============================================================================
// Investments
// =============================================================================

export async function fetchInvestments(): Promise<{
  assets: Asset[];
  institutions: Institution[];
  allocations: Allocation[];
}> {
  try {
    const data = await apiRequest<any>('/finance/investments');

    const rawAssets: any[] = data.assets ?? data.investments ?? data ?? [];
    const assets: Asset[] = Array.isArray(rawAssets)
      ? rawAssets.map((a: any) => ({
          id: String(a.id),
          name: a.name,
          ticker: a.ticker,
          class: a.class ?? a.asset_class,
          institution: a.institution ?? a.institution_id,
          quantity: a.quantity ?? 0,
          averagePrice: a.averagePrice ?? a.average_price ?? 0,
          currentPrice: a.currentPrice ?? a.current_price ?? 0,
          investedValue: a.investedValue ?? a.invested_value ?? 0,
          currentValue: a.currentValue ?? a.current_value ?? 0,
          variation: a.variation ?? 0,
          priceHistory: a.priceHistory ?? a.price_history ?? [],
        }))
      : demoAssets;

    return {
      assets,
      institutions: data.institutions ?? demoInstitutions,
      allocations: data.allocations ?? demoAllocations,
    };
  } catch {
    return {
      assets: demoAssets,
      institutions: demoInstitutions,
      allocations: demoAllocations,
    };
  }
}

// =============================================================================
// Cards
// =============================================================================

export async function fetchCardsApi(): Promise<{
  cards: CreditCard[];
  categorySpending: CategorySpending[];
}> {
  try {
    const data = await apiRequest<any>('/finance/cards');

    const rawCards: any[] = data.cards ?? data ?? [];
    const cards: CreditCard[] = Array.isArray(rawCards)
      ? rawCards.map((c: any) => ({
          id: String(c.id),
          name: c.name,
          lastFour: c.lastFour ?? c.last_four ?? '',
          brand: c.brand ?? 'visa',
          limit: c.limit ?? 0,
          used: c.used ?? 0,
          dueDate: c.dueDate ?? c.due_date ?? '',
          closingDate: c.closingDate ?? c.closing_date ?? '',
          color: c.color ?? '#1A1A1A',
          secondaryColor: c.secondaryColor ?? c.secondary_color ?? '#FFFFFF',
          currentInvoice: c.currentInvoice ?? c.current_invoice ?? 0,
          nextInvoice: c.nextInvoice ?? c.next_invoice ?? 0,
          transactions: (c.transactions ?? []).map((t: any) => ({
            id: String(t.id),
            date: t.date,
            description: t.description,
            category: t.category ?? 'shopping',
            amount: t.amount ?? 0,
            installment: t.installment,
          })),
        }))
      : demoCards;

    return {
      cards,
      categorySpending: data.categorySpending ??
        data.category_spending ??
        demoCategorySpending,
    };
  } catch {
    return {
      cards: demoCards,
      categorySpending: demoCategorySpending,
    };
  }
}

// =============================================================================
// Notifications
// =============================================================================

export async function fetchNotificationsApi(): Promise<Notification[]> {
  try {
    const data = await apiRequest<any>('/notifications');

    const rawNotifications: any[] =
      data.notifications ?? data ?? [];
    return Array.isArray(rawNotifications)
      ? rawNotifications.map((n: any) => ({
          id: String(n.id),
          type: n.type ?? 'system',
          title: n.title,
          body: n.body ?? n.message ?? '',
          date: n.date ?? n.created_at ?? '',
          read: n.read ?? false,
        }))
      : demoNotifications;
  } catch {
    return demoNotifications;
  }
}

// =============================================================================
// Mark notification as read
// =============================================================================

export async function markNotificationReadApi(id: string): Promise<void> {
  try {
    await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
  } catch {
    // Silently fail - local state already updated
  }
}

// =============================================================================
// User profile
// =============================================================================

export async function fetchUserProfile(): Promise<User> {
  try {
    const data = await apiRequest<any>('/auth/me');
    const raw = data.user ?? data;
    const name = raw.name ?? raw.full_name ?? '';
    return {
      id: String(raw.id ?? '1'),
      name,
      email: raw.email ?? '',
      initials: name
        .split(' ')
        .filter(Boolean)
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
      biometricEnabled: raw.biometricEnabled ?? raw.biometric_enabled ?? true,
      hideValuesOnOpen:
        raw.hideValuesOnOpen ?? raw.hide_values_on_open ?? false,
      pushEnabled: raw.pushEnabled ?? raw.push_enabled ?? true,
      zurtTokens: raw.zurtTokens ?? raw.zurt_tokens ?? 0,
      revenueShareReceived:
        raw.revenueShareReceived ?? raw.revenue_share_received ?? 0,
      nextDistribution: raw.nextDistribution ?? raw.next_distribution ?? '',
    };
  } catch {
    return demoUser;
  }
}
