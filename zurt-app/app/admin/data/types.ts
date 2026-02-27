// ---------------------------------------------------------------------------
// Admin Panel — Shared Types (aligned with real backend)
// ---------------------------------------------------------------------------

import type { PlanTier } from '../../../src/stores/planStore';

export type AdminPlan = PlanTier;
export type AdminRole = 'customer' | 'consultant' | 'admin';
export type AdminStatus = 'active' | 'blocked';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: AdminStatus;
  role: AdminRole;
  plan: AdminPlan;
  createdAt: string;
  lastLogin: string;
  openFinance: boolean;
  b3Connected: boolean;
  patrimony: number;
  devices: string[];
  totalLogins: number;
  photoUrl: string | null;
  subscription?: {
    plan?: { id: string; code: string; name: string };
    status?: string;
  };
  financialSummary?: {
    cash: number;
    investments: number;
    debt: number;
    netWorth: number;
  };
  stats?: {
    connections: number;
    goals: number;
    clients: number;
  };
}

export interface BackendPlan {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  connectionLimit: number;
  features: Record<string, any>;
  isActive: boolean;
  role: string;
}

export interface DashboardMetrics {
  kpis: {
    activeUsers: number;
    newUsers: number;
    mrr: number;
    churnRate: number;
    totalUsers?: number;
    totalRevenue?: number;
  };
  userGrowth?: any[];
  revenue?: any[];
  recentRegistrations: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: string;
  }>;
  subscriptionStats?: Record<string, any>;
  alerts?: any[];
  roleDistribution?: Record<string, number>;
}

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  ip: string;
  device: string;
  success: boolean;
  createdAt: string;
}

export interface IntegrationData {
  integrations: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    lastSync?: string;
  }>;
  stats: {
    healthy: number;
    degraded: number;
    down: number;
    total: number;
  };
  logs: Array<{
    id: string;
    message: string;
    level: string;
    createdAt: string;
  }>;
}

// Kept for AdminLogs display (mapped from LoginHistoryEntry)
export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface B3ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

// Plan display configuration for admin badges
export const ADMIN_PLAN_CONFIG: Record<AdminPlan, { color: string; label: string }> = {
  free: { color: '#64748B', label: 'Free' },
  basic: { color: '#3B82F6', label: 'Basico' },
  pro: { color: '#00D4AA', label: 'Pro' },
  unlimited: { color: '#8B5CF6', label: 'Unlimited' },
  consultant: { color: '#F59E0B', label: 'Consultant' },
  enterprise: { color: '#C9A84C', label: 'Enterprise' },
};

// Role display configuration
export const ADMIN_ROLE_CONFIG: Record<AdminRole, { color: string; label: string }> = {
  customer: { color: '#64748B', label: 'Cliente' },
  consultant: { color: '#3A86FF', label: 'Consultor' },
  admin: { color: '#00D4AA', label: 'Admin' },
};
