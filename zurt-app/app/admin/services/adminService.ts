// ---------------------------------------------------------------------------
// Admin Panel — API Service (aligned with real backend endpoints)
// ---------------------------------------------------------------------------

import { getToken } from '../../../src/services/api';
import type {
  AdminUser,
  AdminRole,
  AdminStatus,
  BackendPlan,
  DashboardMetrics,
  LoginHistoryEntry,
  IntegrationData,
} from '../data/types';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://zurt.com.br/api';
const ADMIN_TIMEOUT = 15000;

// ---------------------------------------------------------------------------
// Internal fetch helper (does NOT trigger global 401 logout)
// ---------------------------------------------------------------------------

async function adminApiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = await getToken();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ADMIN_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...(options?.headers as Record<string, string>) },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Admin API ${response.status}: ${text}`);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Dashboard Metrics — GET /admin/dashboard/metrics
// ---------------------------------------------------------------------------

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const data = await adminApiRequest<any>('/admin/dashboard/metrics');
  return {
    kpis: {
      activeUsers: data.kpis?.activeUsers ?? 0,
      newUsers: data.kpis?.newUsers ?? 0,
      mrr: data.kpis?.mrr ?? 0,
      churnRate: data.kpis?.churnRate ?? 0,
      totalUsers: data.kpis?.totalUsers ?? 0,
      totalRevenue: data.kpis?.totalRevenue ?? 0,
    },
    userGrowth: data.userGrowth ?? [],
    revenue: data.revenue ?? [],
    recentRegistrations: data.recentRegistrations ?? [],
    subscriptionStats: data.subscriptionStats ?? {},
    alerts: data.alerts ?? [],
    roleDistribution: data.roleDistribution ?? {},
  };
}

// ---------------------------------------------------------------------------
// Users — GET /admin/users
// ---------------------------------------------------------------------------

export async function fetchAdminUsers(params?: {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ users: AdminUser[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.role && params.role !== 'all') query.set('role', params.role);
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  query.set('page', String(params?.page ?? 1));
  query.set('limit', String(params?.limit ?? 50));

  const qs = query.toString();
  const data = await adminApiRequest<any>(`/admin/users?${qs}`);
  const users: AdminUser[] = (data.users ?? []).map(mapBackendUser);
  return {
    users,
    pagination: data.pagination ?? { page: 1, limit: 50, total: users.length, totalPages: 1 },
  };
}

// ---------------------------------------------------------------------------
// User Detail — GET /admin/users/:id
// ---------------------------------------------------------------------------

export async function fetchAdminUserById(id: string): Promise<AdminUser | null> {
  const data = await adminApiRequest<any>(`/admin/users/${id}`);
  const raw = data.user ?? data;
  return mapBackendUser(raw);
}

// ---------------------------------------------------------------------------
// User Finance — GET /admin/users/:id/finance (for "Ver como usuario")
// ---------------------------------------------------------------------------

export async function fetchUserFinance(id: string): Promise<any> {
  return adminApiRequest<any>(`/admin/users/${id}/finance`);
}

// ---------------------------------------------------------------------------
// Update User Role — PATCH /admin/users/:id/role
// ---------------------------------------------------------------------------

export async function updateUserRole(id: string, role: AdminRole): Promise<any> {
  return adminApiRequest<any>(`/admin/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

// ---------------------------------------------------------------------------
// Update User Status — PATCH /admin/users/:id/status
// ---------------------------------------------------------------------------

export async function updateUserStatus(id: string, status: AdminStatus): Promise<any> {
  return adminApiRequest<any>(`/admin/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ---------------------------------------------------------------------------
// Update User Plan — PATCH /admin/users/:id/plan (uses UUID planId)
// ---------------------------------------------------------------------------

export async function updateUserPlan(id: string, planId: string): Promise<any> {
  return adminApiRequest<any>(`/admin/users/${id}/plan`, {
    method: 'PATCH',
    body: JSON.stringify({ planId }),
  });
}

// ---------------------------------------------------------------------------
// Delete User — DELETE /admin/users/:id
// ---------------------------------------------------------------------------

export async function deleteAdminUser(id: string): Promise<boolean> {
  await adminApiRequest<any>(`/admin/users/${id}`, { method: 'DELETE' });
  return true;
}

// ---------------------------------------------------------------------------
// Plans — GET /admin/plans
// ---------------------------------------------------------------------------

export async function fetchPlans(): Promise<BackendPlan[]> {
  const data = await adminApiRequest<any>('/admin/plans');
  return data.plans ?? [];
}

// ---------------------------------------------------------------------------
// Login History — GET /admin/login-history
// ---------------------------------------------------------------------------

export async function fetchLoginHistory(params?: {
  page?: number;
  userId?: string;
}): Promise<LoginHistoryEntry[]> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.userId) query.set('userId', params.userId);

  const qs = query.toString();
  const path = qs ? `/admin/login-history?${qs}` : '/admin/login-history';
  const data = await adminApiRequest<any>(path);
  return (data.loginHistory ?? data ?? []).map((entry: any) => ({
    id: String(entry.id ?? ''),
    userId: String(entry.userId ?? entry.user_id ?? ''),
    userName: entry.userName ?? entry.user_name ?? '',
    userEmail: entry.userEmail ?? entry.user_email ?? '',
    ip: entry.ip ?? entry.ipAddress ?? '',
    device: entry.device ?? entry.userAgent ?? '',
    success: entry.success ?? true,
    createdAt: entry.createdAt ?? entry.created_at ?? '',
  }));
}

// ---------------------------------------------------------------------------
// Integrations — GET /admin/integrations
// ---------------------------------------------------------------------------

export async function fetchIntegrations(): Promise<IntegrationData> {
  const data = await adminApiRequest<any>('/admin/integrations');
  return {
    integrations: data.integrations ?? [],
    stats: {
      healthy: data.stats?.healthy ?? 0,
      degraded: data.stats?.degraded ?? 0,
      down: data.stats?.down ?? 0,
      total: data.stats?.total ?? 0,
    },
    logs: data.logs ?? [],
  };
}

// ---------------------------------------------------------------------------
// Backend → AdminUser mapper
// ---------------------------------------------------------------------------

function mapBackendUser(raw: any): AdminUser {
  const subscription = raw.subscription ?? raw.plan_info ?? undefined;
  const planCode = subscription?.plan?.code ?? raw.planTier ?? raw.plan ?? 'free';

  return {
    id: String(raw.id ?? ''),
    name: raw.name ?? raw.full_name ?? '',
    email: raw.email ?? '',
    phone: raw.phone ?? '',
    status: raw.status === 'blocked' ? 'blocked' : 'active',
    role: raw.role ?? 'customer',
    plan: planCode as AdminUser['plan'],
    createdAt: raw.createdAt ?? raw.created_at ?? '',
    lastLogin: raw.lastLogin ?? raw.last_login ?? '',
    openFinance: raw.openFinance ?? raw.open_finance ?? (raw.stats?.connections ?? 0) > 0,
    b3Connected: raw.b3Connected ?? raw.b3_connected ?? false,
    patrimony: raw.financialSummary?.netWorth ?? raw.patrimony ?? raw.net_worth ?? 0,
    devices: raw.devices ?? [],
    totalLogins: raw.totalLogins ?? raw.total_logins ?? raw.stats?.logins ?? 0,
    photoUrl: raw.photoUrl ?? raw.photo_url ?? null,
    subscription: subscription ? {
      plan: subscription.plan ? {
        id: subscription.plan.id ?? '',
        code: subscription.plan.code ?? '',
        name: subscription.plan.name ?? '',
      } : undefined,
      status: subscription.status,
    } : undefined,
    financialSummary: raw.financialSummary ?? undefined,
    stats: raw.stats ?? undefined,
  };
}
