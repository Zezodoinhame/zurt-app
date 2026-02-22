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
  insights as demoInsightsData,
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
import { logger } from '../utils/logger';

// =============================================================================
// Config
// =============================================================================

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://zurt.com.br/api';
const TOKEN_KEY = 'zurt_session';
const REQUEST_TIMEOUT = 15000; // 15s for normal endpoints
const AI_REQUEST_TIMEOUT = 30000; // 30s for AI endpoints (they are slower)
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
  timeout?: number,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  logger.log(`[ZURT API] >> ${options?.method ?? 'GET'} ${url}`);

  const token = await getToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  // Only set Content-Type if there's a body — avoids "Body cannot be empty" on DELETE/GET
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }

  const effectiveTimeout = timeout ?? REQUEST_TIMEOUT;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);

  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...(options?.headers as Record<string, string>) },
      signal: controller.signal,
    });

    logger.log(`[ZURT API] << ${response.status} ${path}`);

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
      if (__DEV__) {
        logger.log(`[ZURT API] Error body: ${errorBody}`);
      }
      throw new Error('Request failed. Please try again.');
    }

    return await response.json();
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      logger.log(`[ZURT API] !! TIMEOUT after ${effectiveTimeout}ms: ${path}`);
    } else {
      logger.log(`[ZURT API] !! ERROR ${path}:`, err?.message ?? err);
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
// Dashboard Finance (single endpoint for all data)
// =============================================================================

// Known Brazilian institution colors
const INSTITUTION_COLORS: Record<string, { color: string; secondary: string }> = {
  nubank: { color: '#820AD1', secondary: '#A020F0' },
  inter: { color: '#FF7A00', secondary: '#FF9933' },
  btg: { color: '#191B22', secondary: '#0046BE' },
  xp: { color: '#FFD700', secondary: '#1A1A1A' },
  'itaú': { color: '#003399', secondary: '#FF6600' },
  itau: { color: '#003399', secondary: '#FF6600' },
  bradesco: { color: '#CC092F', secondary: '#FFFFFF' },
  santander: { color: '#EC0000', secondary: '#FFFFFF' },
  c6: { color: '#2B2B2B', secondary: '#CCCCCC' },
  rico: { color: '#FF6600', secondary: '#FFFFFF' },
  clear: { color: '#00C2A8', secondary: '#FFFFFF' },
  binance: { color: '#F0B90B', secondary: '#1E2329' },
  mercado: { color: '#009EE3', secondary: '#FFE600' },
  picpay: { color: '#21C25E', secondary: '#FFFFFF' },
};

function getInstColors(name: string): { color: string; secondaryColor: string } {
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(INSTITUTION_COLORS)) {
    if (lower.includes(key)) return { color: val.color, secondaryColor: val.secondary };
  }
  return { color: '#1A73E8', secondaryColor: '#FFFFFF' };
}

export interface DashboardTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  merchant?: string;
  account_name?: string;
  institution_name?: string;
  category?: string;
}

export async function fetchDashboardSummary(): Promise<{
  summary: PortfolioSummary;
  institutions: Institution[];
  allocations: Allocation[];
  insights: Insight[];
  cards: CreditCard[];
  assets: Asset[];
  transactions: DashboardTransaction[];
}> {
  const demoResult = {
    summary: portfolioSummary,
    institutions: demoInstitutions,
    allocations: demoAllocations,
    insights: demoInsightsData,
    cards: demoCards,
    assets: demoAssets,
    transactions: [] as DashboardTransaction[],
  };

  return fetchWithFallback(
    'dashboard:finance',
    '/dashboard/finance',
    (data) => {
      const rawSummary = data.summary ?? {};

      // Map summary: netWorth → totalValue, cash+investments → investedValue
      const netWorth = rawSummary.netWorth ?? rawSummary.net_worth ?? 0;
      const cash = rawSummary.cash ?? 0;
      const investments = rawSummary.investments ?? 0;
      const investedValue = cash + investments;
      const profit = netWorth - investedValue;

      const summary: PortfolioSummary = {
        totalValue: netWorth,
        investedValue,
        profit,
        variation1m: rawSummary.variation1m ?? rawSummary.variation_1m ?? 0,
        variation12m: rawSummary.variation12m ?? rawSummary.variation_12m ?? 0,
        history: (rawSummary.history ?? data.history ?? []).map((h: any) => ({
          month: h.month ?? '',
          date: h.date ?? '',
          value: h.value ?? 0,
        })),
      };

      // Map accounts grouped by institution_name → Institution[]
      const rawAccounts: any[] = data.accounts ?? [];
      const accountsByInst = new Map<string, any[]>();
      for (const acc of rawAccounts) {
        const name = acc.institution_name ?? acc.institutionName ?? 'Unknown';
        if (!accountsByInst.has(name)) accountsByInst.set(name, []);
        accountsByInst.get(name)!.push(acc);
      }
      const institutions: Institution[] = [];
      for (const [name, accs] of accountsByInst) {
        const id = name.toLowerCase().replace(/\s+/g, '-');
        const totalValue = accs.reduce(
          (sum: number, a: any) => sum + Math.abs(parseFloat(a.current_balance ?? a.balance ?? a.currentBalance ?? a.value ?? '0') || 0),
          0,
        );
        const colors = getInstColors(name);
        institutions.push({
          id,
          name,
          color: colors.color,
          secondaryColor: colors.secondaryColor,
          assetCount: accs.length,
          totalValue,
          status: 'connected',
        });
      }

      // Map breakdown → Allocation[]
      const rawBreakdown: any[] = data.breakdown ?? data.allocations ?? [];
      const allocations: Allocation[] = rawBreakdown.map((b: any) => ({
        class: b.class ?? b.asset_class ?? b.category ?? 'stocks',
        label: b.label ?? b.name ?? b.category ?? '',
        value: b.value ?? b.amount ?? 0,
        percentage: b.percentage ?? b.percent ?? 0,
        color: b.color ?? '#888888',
      }));

      // Map cards → CreditCard[]
      const rawCards: any[] = data.cards ?? [];
      const cards: CreditCard[] = rawCards.map((c: any) => {
        const brand = (c.brand ?? 'visa').toLowerCase();
        return {
          id: String(c.id),
          name: c.institution_name ?? c.name ?? '',
          lastFour: c.last4 ?? c.lastFour ?? c.last_four ?? '',
          brand,
          limit: parseFloat(c.limit ?? c.credit_limit ?? '0') || 0,
          used: parseFloat(c.openDebt ?? c.used ?? '0') || 0,
          dueDate: c.dueDate ?? c.due_date ?? '',
          closingDate: c.closingDate ?? c.closing_date ?? '',
          color: c.color ?? (brand === 'mastercard' ? '#1A1A1A' : '#1A1F71'),
          secondaryColor: c.secondaryColor ?? (brand === 'mastercard' ? '#EB001B' : '#F7B600'),
          currentInvoice: parseFloat(c.openDebt ?? c.currentInvoice ?? c.current_invoice ?? '0') || 0,
          nextInvoice: parseFloat(c.nextInvoice ?? c.next_invoice ?? '0') || 0,
          transactions: (c.transactions ?? []).map((t: any) => ({
            id: String(t.id),
            date: t.date,
            description: t.description,
            category: t.category ?? 'shopping',
            amount: t.amount ?? 0,
            installment: t.installment,
          })),
        };
      });

      // Map investments → Asset[]
      const rawInvestments: any[] = data.investments ?? [];
      const assets: Asset[] = rawInvestments.map((a: any) => ({
        id: String(a.id),
        name: a.name ?? '',
        ticker: a.ticker ?? a.symbol ?? '',
        class: a.class ?? a.asset_class ?? a.type ?? 'stocks',
        institution: a.institution ?? a.institution_name ?? a.institution_id ?? '',
        quantity: a.quantity ?? a.shares ?? 0,
        averagePrice: a.averagePrice ?? a.average_price ?? a.avgPrice ?? 0,
        currentPrice: a.currentPrice ?? a.current_price ?? a.price ?? 0,
        investedValue: a.investedValue ?? a.invested_value ?? 0,
        currentValue: a.currentValue ?? a.current_value ?? a.value ?? 0,
        variation: a.variation ?? a.change ?? 0,
        priceHistory: a.priceHistory ?? a.price_history ?? [],
      }));

      // Map transactions
      const rawTransactions: any[] = data.transactions ?? [];
      const transactions: DashboardTransaction[] = rawTransactions.map((t: any) => ({
        id: String(t.id ?? ''),
        date: t.date ?? t.created_at ?? '',
        amount: parseFloat(t.amount ?? '0') || 0,
        description: t.description ?? t.merchant ?? '',
        merchant: t.merchant ?? '',
        account_name: t.account_name ?? '',
        institution_name: t.institution_name ?? '',
        category: t.category ?? '',
      }));

      return {
        summary,
        institutions,
        allocations,
        insights: data.insights ?? [],
        cards,
        assets,
        transactions,
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
    logger.log('[ZURT API] searchInstitutions raw response:', JSON.stringify(data).slice(0, 500));

    // Handle all possible response shapes
    let results: any[] = [];
    if (Array.isArray(data)) {
      results = data;
    } else if (data?.institutions && Array.isArray(data.institutions)) {
      results = data.institutions;
    } else if (data?.data && Array.isArray(data.data)) {
      results = data.data;
    } else if (data?.results && Array.isArray(data.results)) {
      results = data.results;
    }

    // Sort by relevance: exact name match first, then startsWith, then contains
    const searchLower = search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    results.sort((a: any, b: any) => {
      const nameA = (a.name ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const nameB = (b.name ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      const exactA = nameA === searchLower ? 0 : 1;
      const exactB = nameB === searchLower ? 0 : 1;
      if (exactA !== exactB) return exactA - exactB;

      const startsA = nameA.startsWith(searchLower) ? 0 : 1;
      const startsB = nameB.startsWith(searchLower) ? 0 : 1;
      if (startsA !== startsB) return startsA - startsB;

      const containsA = nameA.includes(searchLower) ? 0 : 1;
      const containsB = nameB.includes(searchLower) ? 0 : 1;
      if (containsA !== containsB) return containsA - containsB;

      return nameA.localeCompare(nameB);
    });

    return results;
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

export async function generateReportApi(period: string, language?: string): Promise<any> {
  if (_isDemoMode) {
    const lang = language || 'pt';
    const analyses: Record<string, string> = {
      pt: '**RESUMO EXECUTIVO**\nEste é um relatório demonstrativo. Conecte suas contas reais para gerar um relatório patrimonial personalizado com análise de IA.\n\n**ANÁLISE DO PATRIMÔNIO**\nNo modo demonstração, seus dados reais não estão disponíveis. O ZURT analisa suas contas bancárias, investimentos e cartões de crédito para gerar insights personalizados.\n\n**CENÁRIO DE MERCADO**\nIBOVESPA em tendência de alta, Selic em 15,00% a.a., Dólar estável na faixa de R$ 5,20.\n\n**RECOMENDAÇÕES**\n1. Conecte suas contas bancárias via Open Finance\n2. Adicione seus investimentos para acompanhar performance\n3. Use o ZURT Agent para insights personalizados\n4. Diversifique seus investimentos entre renda fixa e variável\n5. Mantenha uma reserva de emergência de 6 a 12 meses',
      en: '**EXECUTIVE SUMMARY**\nThis is a demo report. Connect your real accounts to generate a personalized patrimonial report with AI analysis.\n\n**PORTFOLIO ANALYSIS**\nIn demo mode, your real data is not available. ZURT analyzes your bank accounts, investments and credit cards to generate personalized insights.\n\n**MARKET OVERVIEW**\nIBOVESPA trending up, Selic rate at 15.00% p.a., USD/BRL stable around R$ 5.20.\n\n**RECOMMENDATIONS**\n1. Connect your bank accounts via Open Finance\n2. Add your investments to track performance\n3. Use ZURT Agent for personalized insights\n4. Diversify between fixed income and equities\n5. Maintain an emergency fund of 6 to 12 months',
      zh: '**执行摘要**\n这是一份演示报告。连接您的真实账户以生成带有AI分析的个性化资产报告。\n\n**投资组合分析**\n在演示模式下，您的真实数据不可用。ZURT分析您的银行账户、投资和信用卡以生成个性化洞察。\n\n**市场概况**\nIBOVESPA呈上升趋势，Selic利率为15.00%，美元/巴西雷亚尔稳定在R$ 5.20左右。\n\n**建议**\n1. 通过Open Finance连接您的银行账户\n2. 添加您的投资以跟踪表现\n3. 使用ZURT Agent获取个性化洞察',
      ar: '**الملخص التنفيذي**\nهذا تقرير تجريبي. قم بربط حساباتك الحقيقية لإنشاء تقرير مالي مخصص مع تحليل الذكاء الاصطناعي.\n\n**تحليل المحفظة**\nفي الوضع التجريبي، بياناتك الحقيقية غير متوفرة.\n\n**التوصيات**\n1. قم بربط حساباتك المصرفية عبر Open Finance\n2. أضف استثماراتك لتتبع الأداء\n3. استخدم ZURT Agent للحصول على رؤى مخصصة',
    };
    return {
      analysis: analyses[lang] || analyses.pt,
      portfolio: { contas: [], investimentos: [], cartoes: [] },
      market: { ibovespa: { pontos: 190534, var: 1.06 }, dolar: { bid: '5.20' }, selic: '15%' },
      generatedAt: new Date().toISOString(),
      investorName: lang === 'en' ? 'Demo Investor' : lang === 'zh' ? '演示投资者' : lang === 'ar' ? 'مستثمر تجريبي' : 'Investidor Demo',
    };
  }
  return apiRequest('/ai/report', {
    method: 'POST',
    body: JSON.stringify({ period, language: language || 'pt' }),
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

// =============================================================================
// AI Agent — brapi helpers & demo functions
// =============================================================================

const BRAPI_URL = 'https://brapi.dev/api/quote';
const BRAPI_TOKEN = '5kSd6kh79GgVf2X4ncFacn';

async function demoInsights(): Promise<{ message: string; suggestions: string[] }> {
  try {
    logger.log('[AGENT] demoInsights: fetching IBOV + USD from brapi...');
    const [ibovRes, moedaRes] = await Promise.all([
      fetch(`https://brapi.dev/api/quote/^BVSP?token=${BRAPI_TOKEN}`),
      fetch(`https://brapi.dev/api/v2/currency?currency=USD-BRL&token=${BRAPI_TOKEN}`),
    ]);
    const ibov = await ibovRes.json();
    const moeda = await moedaRes.json();
    const ibovPrice = ibov?.results?.[0]?.regularMarketPrice?.toLocaleString('pt-BR') || '-';
    const ibovVar = ibov?.results?.[0]?.regularMarketChangePercent?.toFixed(2) || '-';
    const dolar = moeda?.currency?.[0]?.bidPrice || '-';
    logger.log('[AGENT] demoInsights: IBOV=', ibovPrice, 'USD=', dolar);
    return {
      message: `Olá! Sou o ZURT Agent 🤖\n\nMercado agora:\n\n📊 IBOVESPA: ${ibovPrice} pts (${ibovVar}%)\n💵 Dólar: R$ ${dolar}\n\nEsta é uma conta demo. Conecte suas contas reais para insights personalizados!`,
      suggestions: ['Quanto está a Petrobras?', 'Qual a Selic atual?', 'O que é CDI?'],
    };
  } catch (e: any) {
    logger.log('[AGENT] demoInsights error:', e?.message);
    return {
      message: 'Olá! Sou o ZURT Agent 🤖\n\nEstou no modo demonstração. Conecte suas contas para receber análises personalizadas do seu portfólio!',
      suggestions: ['Como funciona o ZURT?', 'O que é Open Finance?', 'Quais bancos são suportados?'],
    };
  }
}

async function demoChat(userMessage: string): Promise<{ message: string; conversationId: string; suggestions: string[] }> {
  try {
    const query = userMessage.toLowerCase();
    let response = '';

    logger.log('[AGENT] demoChat: query=', query.substring(0, 60));

    if (query.includes('petr') || query.includes('petrobras')) {
      const res = await fetch(`https://brapi.dev/api/quote/PETR4?token=${BRAPI_TOKEN}`);
      const data = await res.json();
      const stock = data?.results?.[0];
      if (stock) {
        response = `PETR4 (Petrobras PN):\n\n💰 Preço: R$ ${stock.regularMarketPrice?.toFixed(2)}\n📈 Variação: ${stock.regularMarketChangePercent?.toFixed(2)}%\n📊 Volume: ${(stock.regularMarketVolume / 1000000)?.toFixed(1)}M`;
      }
    } else if (query.includes('selic')) {
      const res = await fetch(`https://brapi.dev/api/v2/prime-rate?country=brazil&token=${BRAPI_TOKEN}`);
      const data = await res.json();
      const rate = data?.['prime-rate']?.[0];
      if (rate) response = `A taxa Selic atual está em ${rate.value}% a.a.`;
    } else if (query.includes('dolar') || query.includes('dólar') || query.includes('dollar') || query.includes('usd')) {
      const res = await fetch(`https://brapi.dev/api/v2/currency?currency=USD-BRL&token=${BRAPI_TOKEN}`);
      const data = await res.json();
      const cur = data?.currency?.[0];
      if (cur) response = `Dólar (USD/BRL):\n\n💵 Compra: R$ ${cur.bidPrice}\n💵 Venda: R$ ${cur.askPrice}`;
    } else if (query.includes('vale')) {
      const res = await fetch(`https://brapi.dev/api/quote/VALE3?token=${BRAPI_TOKEN}`);
      const data = await res.json();
      const stock = data?.results?.[0];
      if (stock) response = `VALE3:\n\n💰 Preço: R$ ${stock.regularMarketPrice?.toFixed(2)}\n📈 Variação: ${stock.regularMarketChangePercent?.toFixed(2)}%`;
    } else if (query.includes('bitcoin') || query.includes('btc') || query.includes('cripto') || query.includes('crypto')) {
      const res = await fetch(`https://brapi.dev/api/v2/crypto?coin=BTC&currency=BRL&token=${BRAPI_TOKEN}`);
      const data = await res.json();
      const coin = data?.coins?.[0];
      if (coin) response = `Bitcoin (BTC):\n\n💰 Preço: R$ ${parseFloat(coin.regularMarketPrice)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    } else if (query.includes('euro') || query.includes('eur')) {
      const res = await fetch(`https://brapi.dev/api/v2/currency?currency=EUR-BRL&token=${BRAPI_TOKEN}`);
      const data = await res.json();
      const cur = data?.currency?.[0];
      if (cur) response = `Euro (EUR/BRL):\n\n💶 Compra: R$ ${cur.bidPrice}\n💶 Venda: R$ ${cur.askPrice}`;
    } else if (query.includes('ibov') || query.includes('bolsa') || query.includes('mercado')) {
      const res = await fetch(`https://brapi.dev/api/quote/^BVSP?token=${BRAPI_TOKEN}`);
      const data = await res.json();
      const idx = data?.results?.[0];
      if (idx) response = `IBOVESPA:\n\n📊 Pontos: ${idx.regularMarketPrice?.toLocaleString('pt-BR')}\n📈 Variação: ${idx.regularMarketChangePercent?.toFixed(2)}%`;
    } else {
      // Try as ticker directly
      const ticker = userMessage.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (ticker.length >= 4 && ticker.length <= 6) {
        try {
          const res = await fetch(`https://brapi.dev/api/quote/${ticker}?token=${BRAPI_TOKEN}`);
          const data = await res.json();
          const stock = data?.results?.[0];
          if (stock) {
            response = `${stock.symbol} (${stock.shortName ?? stock.longName ?? ''}):\n\n💰 Preço: R$ ${stock.regularMarketPrice?.toFixed(2)}\n📈 Variação: ${stock.regularMarketChangePercent?.toFixed(2)}%`;
          }
        } catch {
          // Not a valid ticker, fall through
        }
      }
    }

    if (!response) {
      response = `No modo demonstração, posso consultar dados reais do mercado!\n\nTente perguntar sobre:\n• Ações (Petrobras, Vale, ou digite o ticker)\n• Dólar ou Euro\n• Selic\n• Bitcoin\n• IBOVESPA\n\nPara análise completa do seu portfólio, crie uma conta e conecte seus bancos!`;
    }

    return {
      message: response,
      conversationId: 'demo-' + Date.now(),
      suggestions: ['Quanto está a PETR4?', 'E a VALE3?', 'Qual o dólar hoje?'],
    };
  } catch (e: any) {
    logger.log('[AGENT] demoChat error:', e?.message);
    return {
      message: 'Desculpe, não consegui buscar os dados no momento. Tente novamente!',
      conversationId: 'demo-' + Date.now(),
      suggestions: ['Tentar novamente'],
    };
  }
}

// =============================================================================
// Market / Asset Detail (brapi.dev via backend proxy)
// =============================================================================

async function fetchFromBrapi(ticker: string): Promise<any> {
  const url = `${BRAPI_URL}/${encodeURIComponent(ticker)}?token=${BRAPI_TOKEN}&fundamental=true&dividends=true&range=1y&interval=1d&modules=summaryProfile,defaultKeyStatistics,financialData`;
  logger.log('[ZURT API] >> brapi fallback:', url.substring(0, 80));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`brapi ${res.status}`);
  return await res.json();
}

export async function fetchAssetDetail(ticker: string): Promise<any> {
  // In demo mode, skip backend (would 401 and trigger logout) — go straight to brapi
  if (_isDemoMode) {
    try {
      return await fetchFromBrapi(ticker);
    } catch (err: any) {
      logger.log('[ZURT API] !! brapi error:', err?.message);
      return { results: [] };
    }
  }

  // Authenticated users: try backend proxy first, fallback to brapi
  try {
    return await apiRequest(`/market/asset/${encodeURIComponent(ticker)}`);
  } catch {
    try {
      return await fetchFromBrapi(ticker);
    } catch {
      return { results: [] };
    }
  }
}

export async function fetchAIInsights(message?: string, language?: string): Promise<{
  message: string;
  suggestions: string[];
}> {
  logger.log('[AGENT] fetchAIInsights called, demoMode:', _isDemoMode, 'language:', language);

  if (_isDemoMode) {
    logger.log('[AGENT] fetchAIInsights: using demoInsights()');
    return demoInsights();
  }

  logger.log('[AGENT] fetchAIInsights: calling backend /ai/insights...');
  const data = await apiRequest<any>(
    '/ai/insights',
    {
      method: 'POST',
      body: JSON.stringify({ message: message ?? undefined, language: language || 'pt' }),
    },
    0,
    AI_REQUEST_TIMEOUT,
  );

  return {
    message: data.message ?? '',
    suggestions: data.suggestions ?? [],
  };
}

export interface AIAlert {
  id: string;
  type: 'warning' | 'opportunity' | 'info';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export async function fetchAIAlerts(): Promise<AIAlert[]> {
  if (_isDemoMode) {
    return [
      {
        id: 'demo-1',
        type: 'info',
        title: 'Modo demonstração',
        message: 'Faça login para receber alertas inteligentes personalizados.',
        severity: 'low',
      },
    ];
  }

  try {
    const data = await apiRequest<any>('/ai/check-alerts', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const alerts: any[] = data.alerts ?? data ?? [];
    return Array.isArray(alerts)
      ? alerts.map((a: any) => ({
          id: String(a.id ?? Date.now()),
          type: a.type ?? 'info',
          title: a.title ?? '',
          message: a.message ?? '',
          severity: a.severity ?? 'low',
        }))
      : [];
  } catch {
    return [];
  }
}

export async function sendAIChat(
  message: string,
  conversationId?: string,
  language?: string,
): Promise<{
  message: string;
  conversationId: string;
  suggestions?: string[];
}> {
  logger.log('[AGENT] sendAIChat called, demoMode:', _isDemoMode, 'message:', message.substring(0, 60));

  if (_isDemoMode) {
    logger.log('[AGENT] sendAIChat: using demoChat()');
    return demoChat(message);
  }

  logger.log('[AGENT] sendAIChat: calling backend /ai/chat...');
  const data = await apiRequest<any>(
    '/ai/chat',
    {
      method: 'POST',
      body: JSON.stringify({ message, conversationId, language: language || 'pt' }),
    },
    0,
    AI_REQUEST_TIMEOUT,
  );

  return {
    message: data.message ?? '',
    conversationId: data.conversationId ?? conversationId ?? '',
    suggestions: data.suggestions,
  };
}

// =============================================================================
// Family Group
// =============================================================================

export async function fetchFamilyGroup(): Promise<any> {
  if (_isDemoMode) {
    return {
      group: { id: 'demo', name: 'Família Demo', owner_id: 'demo', created_at: new Date().toISOString() },
      members: [
        { id: 'demo-1', user_id: 'demo-1', full_name: 'Você (Demo)', role: 'owner', status: 'accepted', visibility: 'full', invited_email: 'demo@zurt.com.br' },
        { id: 'demo-2', user_id: 'demo-2', full_name: 'Maria Demo', role: 'spouse', status: 'accepted', visibility: 'total', invited_email: 'maria@demo.com' },
        { id: 'demo-3', user_id: null, full_name: null, role: 'child', status: 'pending', visibility: 'total', invited_email: 'filho@demo.com' },
      ],
    };
  }
  return apiRequest('/family');
}

export async function createFamilyGroup(name: string): Promise<any> {
  if (_isDemoMode) return { group: { id: 'demo', name }, existing: false };
  return apiRequest('/family/create', { method: 'POST', body: JSON.stringify({ name }) });
}

export async function inviteFamilyMember(email: string, role: string): Promise<any> {
  if (_isDemoMode) return { member: { id: 'demo-new', invited_email: email, role, status: 'pending' }, emailSent: true, autoAccepted: false, message: 'Convite enviado!' };
  return apiRequest('/family/invite', { method: 'POST', body: JSON.stringify({ email, role }) });
}

export async function fetchFamilySummary(): Promise<any> {
  if (_isDemoMode) {
    return {
      totalNetWorth: 487350.00,
      members: [
        { userId: 'demo-1', full_name: 'Você (Demo)', role: 'owner', netWorth: 325000.00, visibility: 'full' },
        { userId: 'demo-2', full_name: 'Maria Demo', role: 'spouse', netWorth: 162350.00, visibility: 'total' },
      ],
    };
  }
  return apiRequest('/family/summary');
}

export async function fetchPendingInvites(): Promise<any> {
  if (_isDemoMode) return { invites: [] };
  return apiRequest('/family/pending');
}

export async function acceptFamilyInvite(token: string): Promise<any> {
  return apiRequest('/family/accept/' + token, { method: 'POST', body: JSON.stringify({}) });
}

export async function rejectFamilyInvite(token: string): Promise<any> {
  return apiRequest('/family/reject/' + token, { method: 'POST', body: JSON.stringify({}) });
}

export async function updateMemberVisibility(memberId: string, visibility: string): Promise<any> {
  return apiRequest('/family/member/' + memberId + '/visibility', { method: 'PUT', body: JSON.stringify({ visibility }) });
}

export async function removeFamilyMember(memberId: string): Promise<any> {
  return apiRequest('/family/member/' + memberId, { method: 'DELETE' });
}
