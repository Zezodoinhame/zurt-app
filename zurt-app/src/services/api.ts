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
    insights: demoInsights,
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
    console.log('[ZURT API] searchInstitutions raw response:', JSON.stringify(data).slice(0, 500));

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
    return {
      analysis: 'Relatório demonstrativo. Conecte suas contas para gerar um relatório real com análise personalizada da IA.\n\n1. RESUMO EXECUTIVO\nNo modo demonstração, não temos acesso aos seus dados reais.\n\n2. ANALISE DO PATRIMONIO\nConecte suas instituições financeiras para uma análise completa.\n\n3. CARTEIRA DE INVESTIMENTOS\nSeus investimentos aparecerão aqui após conectar suas contas.\n\n4. CARTOES E GASTOS\nSeus cartões e gastos serão analisados após a conexão.\n\n5. CENARIO DE MERCADO\nIBOV em alta, Selic em 13,25%, Dólar estável.\n\n6. RECOMENDACOES\n1. Conecte suas contas reais para análise personalizada\n2. Diversifique seus investimentos\n3. Mantenha uma reserva de emergência\n\n7. PERSPECTIVAS\nAguardamos a conexão das suas contas para fornecer perspectivas personalizadas.',
      portfolio: { contas: [], investimentos: [], cartoes: [] },
      market: {},
      generatedAt: new Date().toISOString(),
      investorName: 'Investidor Demo',
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
// AI Agent
// =============================================================================

// =============================================================================
// Market / Asset Detail (brapi.dev via backend proxy)
// =============================================================================

const BRAPI_URL = 'https://brapi.dev/api/quote';
const BRAPI_TOKEN = '5kSd6kh79GgVf2X4ncFacn';

async function fetchFromBrapi(ticker: string): Promise<any> {
  const url = `${BRAPI_URL}/${encodeURIComponent(ticker)}?token=${BRAPI_TOKEN}&fundamental=true&dividends=true&range=1y&interval=1d&modules=summaryProfile,defaultKeyStatistics,financialData`;
  console.log('[ZURT API] >> brapi fallback:', url.substring(0, 80));
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
      console.log('[ZURT API] !! brapi error:', err?.message);
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
  if (_isDemoMode) {
    const demoResponses: Record<string, { message: string; suggestions: string[] }> = {
      pt: {
        message: 'Olá! Sou o ZURT Agent, seu consultor financeiro inteligente. No modo demonstração, não tenho acesso a dados reais. Faça login com sua conta para receber insights personalizados sobre seu portfólio.',
        suggestions: ['Como funciona?', 'Quais análises você faz?'],
      },
      en: {
        message: 'Hello! I\'m ZURT Agent, your intelligent financial advisor. In demo mode, I don\'t have access to real data. Log in with your account to receive personalized insights about your portfolio.',
        suggestions: ['How does it work?', 'What analyses do you do?'],
      },
      zh: {
        message: '您好！我是ZURT Agent，您的智能金融顾问。在演示模式下，我无法访问真实数据。请登录您的账户以获取关于您投资组合的个性化洞察。',
        suggestions: ['如何运作？', '您做哪些分析？'],
      },
      ar: {
        message: 'مرحباً! أنا ZURT Agent، مستشارك المالي الذكي. في الوضع التجريبي، لا يمكنني الوصول إلى البيانات الحقيقية. سجل الدخول بحسابك للحصول على رؤى مخصصة حول محفظتك.',
        suggestions: ['كيف يعمل؟', 'ما التحليلات التي تقوم بها؟'],
      },
    };
    return demoResponses[language || 'pt'] || demoResponses.pt;
  }

  const data = await apiRequest<any>('/ai/insights', {
    method: 'POST',
    body: JSON.stringify({ message: message ?? undefined, language: language || 'pt' }),
  });

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
  if (_isDemoMode) {
    const demoMessages: Record<string, string> = {
      pt: 'No modo demonstração, o ZURT Agent não está disponível. Faça login para usar.',
      en: 'In demo mode, ZURT Agent is not available. Log in to use.',
      zh: '在演示模式下，ZURT Agent不可用。请登录使用。',
      ar: 'في الوضع التجريبي، ZURT Agent غير متاح. سجل الدخول للاستخدام.',
    };
    return {
      message: demoMessages[language || 'pt'] || demoMessages.pt,
      conversationId: 'demo',
    };
  }

  const data = await apiRequest<any>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, conversationId, language: language || 'pt' }),
  });

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
  if (_isDemoMode) return { group: null, members: [] };
  try {
    return await apiRequest('/family');
  } catch {
    return { group: null, members: [] };
  }
}

export async function createFamilyGroup(name: string): Promise<any> {
  return apiRequest('/family/create', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function inviteFamilyMember(email: string, role: string): Promise<any> {
  return apiRequest('/family/invite', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

export async function acceptFamilyInvite(inviteId: string): Promise<any> {
  return apiRequest(`/family/accept/${inviteId}`, { method: 'POST' });
}

export async function removeFamilyMember(memberId: string): Promise<void> {
  await apiRequest(`/family/member/${memberId}`, { method: 'DELETE' });
}

export async function fetchFamilySummary(): Promise<any> {
  if (_isDemoMode) return { totalNetWorth: 0, members: [] };
  try {
    return await apiRequest('/family/summary');
  } catch {
    return { totalNetWorth: 0, members: [] };
  }
}
