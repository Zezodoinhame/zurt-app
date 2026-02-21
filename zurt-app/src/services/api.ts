// =============================================================================
// ZURT Wealth Intelligence - API Service
// Real backend calls with AsyncStorage caching and demo data fallback
// =============================================================================

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://zurt.com.br/api';
const TOKEN_KEY = 'zurt_session';
const REQUEST_TIMEOUT = 15000; // 15s
const MAX_RETRIES = 1;

// =============================================================================
// AsyncStorage Cache
// =============================================================================

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`cache:${key}`);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore parse errors
  }
  return null;
}

export async function setCache(key: string, data: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(`cache:${key}`, JSON.stringify(data));
  } catch {
    // ignore write errors
  }
}

// =============================================================================
// Demo mode flag (set by authStore)
// =============================================================================

let _isDemoMode = false;

export function setDemoMode(value: boolean): void {
  _isDemoMode = value;
}

export function isDemoMode(): boolean {
  return _isDemoMode;
}

// =============================================================================
// 401 handler (set by authStore to avoid circular imports)
// =============================================================================

let _onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(handler: () => void): void {
  _onUnauthorized = handler;
}

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
// HTTP client with retry and 401 handling
// =============================================================================

async function apiRequest<T>(
  path: string,
  options?: RequestInit,
  retryCount = 0,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  console.log(`[ZURT API] >> ${options?.method ?? 'GET'} ${url}`);

  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...(options?.headers as Record<string, string>) },
      signal: controller.signal,
    });

    console.log(`[ZURT API] << ${response.status} ${path}`);

    if (response.status === 401) {
      await clearToken();
      _onUnauthorized?.();
      throw new Error('Unauthorized');
    }

    if (response.status >= 500 && retryCount < MAX_RETRIES) {
      clearTimeout(timeoutId);
      await new Promise((r) => setTimeout(r, 1000));
      return apiRequest<T>(path, options, retryCount + 1);
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(
        `API ${response.status}: ${errorBody || response.statusText}`,
      );
    }

    return await response.json();
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.log(`[ZURT API] !! TIMEOUT after ${REQUEST_TIMEOUT}ms: ${path}`);
    } else {
      console.log(`[ZURT API] !! ERROR ${path}:`, err?.message ?? err);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// =============================================================================
// Helper: fetch with cache and demo fallback
// =============================================================================

async function fetchWithFallback<T>(
  cacheKey: string,
  path: string,
  transform: (data: any) => T,
  demoFallback: T,
  options?: RequestInit,
): Promise<T> {
  if (_isDemoMode) return demoFallback;

  try {
    const data = await apiRequest<any>(path, options);
    const result = transform(data);
    await setCache(cacheKey, result);
    return result;
  } catch (err) {
    const cached = await getCached<T>(cacheKey);
    if (cached) return cached;
    throw err; // Real users: propagate error instead of returning demo data
  }
}

// =============================================================================
// Auth
// =============================================================================

export interface LoginResponse {
  token: string;
  user: any;
}

function mapUser(raw: any, fallbackEmail = ''): User {
  const name = raw.name ?? raw.full_name ?? '';
  return {
    id: String(raw.id ?? '1'),
    name,
    email: raw.email ?? fallbackEmail,
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
  const user = mapUser(raw, email);

  return { token, user };
}

export async function registerApi(
  full_name: string,
  email: string,
  password: string,
  invitation_token?: string,
): Promise<{ token: string; user: User }> {
  const body: any = { full_name, email, password };
  if (invitation_token) body.invitation_token = invitation_token;

  const data = await apiRequest<LoginResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const token = data.token;
  if (token) {
    await saveToken(token);
  }

  const raw = data.user ?? data;
  return { token, user: mapUser(raw, email) };
}

// =============================================================================
// User Profile
// =============================================================================

export async function fetchUserProfile(): Promise<User> {
  return fetchWithFallback(
    'user:profile',
    '/auth/me',
    (data) => mapUser(data.user ?? data),
    demoUser,
  );
}

export async function updateUserProfile(
  updates: { full_name?: string; email?: string },
): Promise<User> {
  const data = await apiRequest<any>('/users/profile', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  const user = mapUser(data.user ?? data);
  await setCache('user:profile', user);
  return user;
}

export async function changePassword(
  current_password: string,
  new_password: string,
): Promise<void> {
  await apiRequest('/users/profile/password', {
    method: 'PATCH',
    body: JSON.stringify({ current_password, new_password }),
  });
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
  const demoResult = {
    summary: portfolioSummary,
    institutions: demoInstitutions,
    allocations: demoAllocations,
    insights: demoInsights,
  };

  return fetchWithFallback(
    'dashboard:summary',
    '/dashboard/summary',
    (data) => {
      const rawSummary = data.summary ?? data.portfolio ?? data;
      const rawAllocations: Allocation[] = data.allocations ?? [];

      // Compute totalValue from multiple possible fields, falling back to sum of allocations
      const allocationsTotal = rawAllocations.reduce((sum: number, a: any) => sum + (a.value ?? 0), 0);
      const totalValue =
        (rawSummary.totalValue ?? rawSummary.total_value ??
        rawSummary.netWorth ?? rawSummary.net_worth ??
        data.totalValue ?? data.total_value ??
        data.netWorth ?? data.net_worth ??
        allocationsTotal) || 0;

      const investedValue = rawSummary.investedValue ?? rawSummary.invested_value ?? data.investedValue ?? data.invested_value ?? 0;
      const profit = rawSummary.profit ?? data.profit ?? ((totalValue - investedValue) || 0);

      const summary: PortfolioSummary = {
        totalValue,
        investedValue,
        profit,
        variation1m: rawSummary.variation1m ?? rawSummary.variation_1m ?? data.variation1m ?? data.netWorthChange ?? 0,
        variation12m: rawSummary.variation12m ?? rawSummary.variation_12m ?? data.variation12m ?? 0,
        history: (rawSummary.history ?? data.history ?? []).map((h: any) => ({
          month: h.month,
          date: h.date,
          value: h.value,
        })),
      };

      return {
        summary,
        institutions: data.institutions ?? [],
        allocations: rawAllocations,
        insights: data.insights ?? [],
      };
    },
    demoResult,
  );
}

// =============================================================================
// Net Worth Evolution
// =============================================================================

export async function fetchNetWorthEvolution(months = 12): Promise<{ date: string; value: number }[]> {
  return fetchWithFallback(
    `dashboard:networth:${months}`,
    `/dashboard/net-worth-evolution?months=${months}`,
    (data) => (Array.isArray(data) ? data : data.evolution ?? data.data ?? []),
    portfolioSummary.history.map((h) => ({ date: h.date, value: h.value })),
  );
}

// =============================================================================
// Spending Analytics
// =============================================================================

export async function fetchSpendingByCategory(
  period = 'month',
  month?: string,
): Promise<CategorySpending[]> {
  const params = new URLSearchParams({ period });
  if (month) params.set('month', month);

  return fetchWithFallback(
    `dashboard:spending:${period}:${month ?? 'current'}`,
    `/dashboard/spending-by-category?${params}`,
    (data) => {
      const raw = data.categories ?? data.spending ?? data ?? [];
      return Array.isArray(raw) ? raw : [];
    },
    demoCategorySpending,
  );
}

// =============================================================================
// Investments
// =============================================================================

export async function fetchInvestments(): Promise<{
  assets: Asset[];
  institutions: Institution[];
  allocations: Allocation[];
}> {
  const demoResult = {
    assets: demoAssets,
    institutions: demoInstitutions,
    allocations: demoAllocations,
  };

  return fetchWithFallback(
    'finance:investments',
    '/finance/investments',
    (data) => {
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
        : [];

      return {
        assets,
        institutions: data.institutions ?? [],
        allocations: data.allocations ?? [],
      };
    },
    demoResult,
  );
}

// =============================================================================
// Accounts
// =============================================================================

export async function fetchAccounts(): Promise<any[]> {
  return fetchWithFallback(
    'finance:accounts',
    '/finance/accounts',
    (data) => data.accounts ?? data ?? [],
    [],
  );
}

// =============================================================================
// Transactions
// =============================================================================

export async function fetchTransactions(params?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}): Promise<{ transactions: any[]; total: number; page: number }> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.category) sp.set('category', params.category);
  if (params?.search) sp.set('search', params.search);

  const query = sp.toString() ? `?${sp}` : '';
  return fetchWithFallback(
    `finance:transactions:${query}`,
    `/finance/transactions${query}`,
    (data) => ({
      transactions: data.transactions ?? data.data ?? [],
      total: data.total ?? 0,
      page: data.page ?? 1,
    }),
    { transactions: [], total: 0, page: 1 },
  );
}

// =============================================================================
// Cards
// =============================================================================

export async function fetchCardsApi(): Promise<{
  cards: CreditCard[];
  categorySpending: CategorySpending[];
}> {
  const demoResult = {
    cards: demoCards,
    categorySpending: demoCategorySpending,
  };

  return fetchWithFallback(
    'finance:cards',
    '/finance/cards',
    (data) => {
      const rawCards: any[] = data.cards ?? data ?? [];
      const cards: CreditCard[] = Array.isArray(rawCards)
        ? rawCards.map((c: any) => ({
            id: String(c.id),
            name: c.name,
            lastFour: c.lastFour ?? c.last_four ?? c.last_four_digits ?? '',
            brand: c.brand ?? 'visa',
            limit: c.limit ?? c.credit_limit ?? 0,
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
        : [];

      return {
        cards,
        categorySpending:
          data.categorySpending ??
          data.category_spending ??
          [],
      };
    },
    demoResult,
  );
}

export async function fetchCardInvoices(cardId: string): Promise<any[]> {
  return fetchWithFallback(
    `cards:invoices:${cardId}`,
    `/cards/${cardId}/invoices`,
    (data) => data.invoices ?? data ?? [],
    [],
  );
}

// =============================================================================
// Notifications
// =============================================================================

export async function fetchNotificationsApi(): Promise<Notification[]> {
  return fetchWithFallback(
    'notifications',
    '/notifications',
    (data) => {
      const rawNotifications: any[] = data.notifications ?? data ?? [];
      return Array.isArray(rawNotifications)
        ? rawNotifications.map((n: any) => ({
            id: String(n.id),
            type: n.type ?? 'system',
            title: n.title,
            body: n.body ?? n.message ?? '',
            date: n.date ?? n.created_at ?? '',
            read: n.read ?? false,
          }))
        : [];
    },
    demoNotifications,
  );
}

export async function fetchUnreadCount(): Promise<number> {
  if (_isDemoMode) return demoNotifications.filter((n) => !n.read).length;
  try {
    const data = await apiRequest<any>('/notifications/unread-count');
    return data.count ?? 0;
  } catch {
    return 0;
  }
}

export async function markNotificationReadApi(id: string): Promise<void> {
  if (_isDemoMode) return;
  try {
    await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
  } catch {
    // Silently fail - local state already updated
  }
}

export async function markAllNotificationsReadApi(): Promise<void> {
  if (_isDemoMode) return;
  try {
    await apiRequest('/notifications/read-all', { method: 'PATCH' });
  } catch {
    // Silently fail
  }
}

export async function deleteNotificationApi(id: string): Promise<void> {
  if (_isDemoMode) return;
  try {
    await apiRequest(`/notifications/${id}`, { method: 'DELETE' });
  } catch {
    // Silently fail
  }
}

// =============================================================================
// Connections (Open Finance)
// =============================================================================

export async function fetchConnections(): Promise<any[]> {
  return fetchWithFallback(
    'connections',
    '/connections',
    (data) => data.connections ?? data ?? [],
    [],
  );
}

export async function searchInstitutions(search: string): Promise<any[]> {
  if (_isDemoMode) return [];
  try {
    const data = await apiRequest<any>(
      `/connections/institutions?search=${encodeURIComponent(search)}`,
    );
    return data.institutions ?? data ?? [];
  } catch {
    return [];
  }
}

export async function getConnectToken(institutionId: string): Promise<string> {
  const data = await apiRequest<any>('/connections/connect-token', {
    method: 'POST',
    body: JSON.stringify({ institutionId }),
  });
  return data.connectToken ?? data.connect_token ?? '';
}

export async function createConnection(itemId: string, connectorId?: string): Promise<any> {
  const body: any = { itemId };
  if (connectorId) body.connectorId = connectorId;
  return apiRequest('/connections', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function syncConnection(connectionId: string): Promise<void> {
  await apiRequest(`/connections/${connectionId}/sync`, { method: 'POST' });
}

export async function deleteConnection(connectionId: string): Promise<void> {
  await apiRequest(`/connections/${connectionId}`, { method: 'DELETE' });
}

export async function syncAllFinance(): Promise<void> {
  if (_isDemoMode) return;
  try {
    await apiRequest('/finance/sync', { method: 'POST' });
  } catch {
    // Silently fail
  }
}

// =============================================================================
// Goals
// =============================================================================

export async function fetchGoals(): Promise<any[]> {
  return fetchWithFallback(
    'goals',
    '/goals',
    (data) => data.goals ?? data ?? [],
    [],
  );
}

export async function createGoal(goal: {
  name: string;
  target_amount: number;
  deadline: string;
  category?: string;
}): Promise<any> {
  return apiRequest('/goals', {
    method: 'POST',
    body: JSON.stringify(goal),
  });
}

export async function updateGoal(
  id: string,
  updates: { name?: string; target_amount?: number; current_amount?: number; deadline?: string },
): Promise<any> {
  return apiRequest(`/goals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteGoal(id: string): Promise<void> {
  await apiRequest(`/goals/${id}`, { method: 'DELETE' });
}

// =============================================================================
// Subscriptions
// =============================================================================

export async function fetchSubscription(): Promise<any> {
  return fetchWithFallback(
    'subscription:current',
    '/subscriptions/me',
    (data) => data,
    null,
  );
}

export async function fetchSubscriptionHistory(): Promise<any[]> {
  return fetchWithFallback(
    'subscription:history',
    '/subscriptions/history',
    (data) => data.history ?? data ?? [],
    [],
  );
}

// =============================================================================
// Reports
// =============================================================================

export async function fetchReports(): Promise<any[]> {
  return fetchWithFallback(
    'reports',
    '/reports',
    (data) => data.reports ?? data ?? [],
    [],
  );
}

export async function generateReport(type: string, parameters: any): Promise<any> {
  return apiRequest('/reports/generate', {
    method: 'POST',
    body: JSON.stringify({ type, parameters }),
  });
}

// =============================================================================
// Customer (Messages / Invitations)
// =============================================================================

export async function fetchConversations(): Promise<any[]> {
  return fetchWithFallback(
    'customer:conversations',
    '/customer/messages/conversations',
    (data) => data.conversations ?? data ?? [],
    [],
  );
}

export async function fetchConversation(id: string): Promise<any> {
  return apiRequest(`/customer/messages/conversations/${id}`);
}

export async function sendMessage(conversationId: string, content: string): Promise<any> {
  return apiRequest(`/customer/messages/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function fetchInvitations(): Promise<any[]> {
  return fetchWithFallback(
    'customer:invitations',
    '/customer/invitations',
    (data) => data.invitations ?? data ?? [],
    [],
  );
}

export async function fetchReferralLink(): Promise<string> {
  if (_isDemoMode) return '';
  try {
    const data = await apiRequest<any>('/customer/referral-link');
    return data.link ?? data.url ?? '';
  } catch {
    return '';
  }
}

// =============================================================================
// Plans (public)
// =============================================================================

export async function fetchPlans(): Promise<any[]> {
  return fetchWithFallback(
    'plans',
    '/plans',
    (data) => data.plans ?? data ?? [],
    [],
  );
}

// =============================================================================
// Investment Holdings & Summary
// =============================================================================

export async function fetchInvestmentHoldings(): Promise<any[]> {
  return fetchWithFallback(
    'investments:holdings',
    '/investments/holdings',
    (data) => data.holdings ?? data ?? [],
    [],
  );
}

export async function fetchInvestmentSummary(): Promise<any> {
  return fetchWithFallback(
    'investments:summary',
    '/investments/summary',
    (data) => data,
    null,
  );
}
