// ---------------------------------------------------------------------------
// Admin Panel — API Service
// Backend endpoints: /admin/* (not yet implemented — all functions fall back to mock)
// ---------------------------------------------------------------------------

import { getToken } from '../../../src/services/api';
import { logger } from '../../../src/utils/logger';
import type { AdminUser, LogEntry, AdminStats, ActivityFeedItem } from '../data/types';
import {
  mockUsers,
  mockLogs,
  mockActivityFeed,
} from '../data/mockData';

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
      throw new Error(`Admin API ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Mapper (handles camelCase + snake_case from backend)
// ---------------------------------------------------------------------------

function mapAdminUser(raw: any): AdminUser {
  return {
    id: String(raw.id ?? ''),
    name: raw.name ?? raw.full_name ?? '',
    email: raw.email ?? '',
    phone: raw.phone ?? '',
    status: raw.status ?? 'active',
    role: raw.role ?? 'user',
    plan: raw.plan ?? raw.planTier ?? raw.plan_tier ?? 'free',
    createdAt: raw.createdAt ?? raw.created_at ?? '',
    lastLogin: raw.lastLogin ?? raw.last_login ?? '',
    openFinance: raw.openFinance ?? raw.open_finance ?? false,
    b3Connected: raw.b3Connected ?? raw.b3_connected ?? false,
    patrimony: raw.patrimony ?? raw.net_worth ?? 0,
    devices: raw.devices ?? [],
    totalLogins: raw.totalLogins ?? raw.total_logins ?? 0,
    photoUrl: raw.photoUrl ?? raw.photo_url ?? null,
  };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  try {
    const data = await adminApiRequest<any>('/admin/users');
    const users: any[] = data.users ?? data ?? [];
    return users.map(mapAdminUser);
  } catch (err: any) {
    logger.log('[ADMIN] fetchAdminUsers fallback to mock:', err?.message);
    return mockUsers;
  }
}

export async function fetchAdminUserById(id: string): Promise<AdminUser | null> {
  try {
    const data = await adminApiRequest<any>(`/admin/users/${id}`);
    return mapAdminUser(data.user ?? data);
  } catch (err: any) {
    logger.log('[ADMIN] fetchAdminUserById fallback to mock:', err?.message);
    return mockUsers.find((u) => u.id === id) ?? null;
  }
}

export async function updateAdminUser(
  id: string,
  updates: Partial<Pick<AdminUser, 'role' | 'plan' | 'status'>>,
): Promise<AdminUser | null> {
  try {
    const data = await adminApiRequest<any>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return mapAdminUser(data.user ?? data);
  } catch (err: any) {
    logger.log('[ADMIN] updateAdminUser failed:', err?.message);
    const user = mockUsers.find((u) => u.id === id);
    return user ? { ...user, ...updates } as AdminUser : null;
  }
}

export async function deleteAdminUser(id: string): Promise<boolean> {
  try {
    await adminApiRequest<any>(`/admin/users/${id}`, { method: 'DELETE' });
    return true;
  } catch (err: any) {
    logger.log('[ADMIN] deleteAdminUser failed:', err?.message);
    return false;
  }
}

export async function addAdminUser(user: {
  name: string;
  email: string;
  role: AdminUser['role'];
  plan: AdminUser['plan'];
}): Promise<AdminUser | null> {
  try {
    const data = await adminApiRequest<any>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
    return mapAdminUser(data.user ?? data);
  } catch (err: any) {
    logger.log('[ADMIN] addAdminUser failed:', err?.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Stats / Dashboard
// ---------------------------------------------------------------------------

export async function fetchAdminStats(): Promise<AdminStats> {
  try {
    const data = await adminApiRequest<any>('/admin/stats');
    return {
      totalUsers: data.totalUsers ?? 0,
      activeUsers: data.activeUsers ?? 0,
      openFinanceCount: data.openFinanceCount ?? 0,
      b3Count: data.b3Count ?? 0,
    };
  } catch (err: any) {
    logger.log('[ADMIN] fetchAdminStats fallback to mock:', err?.message);
    return {
      totalUsers: mockUsers.length,
      activeUsers: mockUsers.filter((u) => u.status === 'active').length,
      openFinanceCount: mockUsers.filter((u) => u.openFinance).length,
      b3Count: mockUsers.filter((u) => u.b3Connected).length,
    };
  }
}

export async function fetchActivityFeed(): Promise<ActivityFeedItem[]> {
  try {
    const data = await adminApiRequest<any>('/admin/activity');
    return data.activities ?? data ?? [];
  } catch (err: any) {
    logger.log('[ADMIN] fetchActivityFeed fallback to mock:', err?.message);
    return mockActivityFeed;
  }
}

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

export async function fetchAdminLogs(): Promise<LogEntry[]> {
  try {
    const data = await adminApiRequest<any>('/admin/logs');
    return data.logs ?? data ?? [];
  } catch (err: any) {
    logger.log('[ADMIN] fetchAdminLogs fallback to mock:', err?.message);
    return mockLogs;
  }
}

// ---------------------------------------------------------------------------
// Impersonation
// ---------------------------------------------------------------------------

export async function impersonateUser(userId: string): Promise<{ token: string } | null> {
  try {
    const data = await adminApiRequest<any>(`/admin/impersonate/${userId}`, {
      method: 'POST',
    });
    return { token: data.token };
  } catch (err: any) {
    logger.log('[ADMIN] impersonateUser failed (backend not ready?):', err?.message);
    return null;
  }
}
