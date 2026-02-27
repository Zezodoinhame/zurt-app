// ---------------------------------------------------------------------------
// Admin Panel — Shared Types
// ---------------------------------------------------------------------------

import type { PlanTier } from '../../../src/stores/planStore';

export type AdminPlan = PlanTier;

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'suspended';
  role: 'admin' | 'tester' | 'user';
  plan: AdminPlan;
  createdAt: string;
  lastLogin: string;
  openFinance: boolean;
  b3Connected: boolean;
  patrimony: number;
  devices: string[];
  totalLogins: number;
  photoUrl: string | null;
}

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

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  openFinanceCount: number;
  b3Count: number;
}

export interface ActivityFeedItem {
  id: string;
  userName: string;
  action: string;
  timestamp: string;
  initial: string;
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
