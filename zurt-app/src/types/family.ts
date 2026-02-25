// =============================================================================
// ZURT - Family Group Types
// =============================================================================

export interface FamilyGroup {
  id: string;
  name: string;
  avatarUrl?: string;
  createdBy: string;
  createdAt: string;
  members: FamilyMember[];
  goals: FamilyGoal[];
  settings: FamilySettings;
}

export interface FamilyMember {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: FamilyRole;
  joinedAt: string;
  status: 'active' | 'pending' | 'removed';
  permissions: MemberPermissions;
  /** Filled when owner/admin views this member */
  portfolioSummary?: {
    totalPatrimony: number;
    monthlyChange: number;
    monthlyChangePct: number;
    allocations: { label: string; pct: number; value: number; color: string }[];
    lastUpdated: string;
  };
  cardsSummary?: {
    totalInvoices: number;
    totalLimit: number;
    totalUsed: number;
    cards: {
      banco: string;
      ultimos4: string;
      faturaAtual: number;
      limiteTotal: number;
    }[];
  };
}

export interface MemberPermissions {
  canViewPortfolio: boolean;
  canViewCards: boolean;
  canViewMembers: boolean;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canEditGoals: boolean;
  canManageSettings: boolean;
}

export interface FamilyGoal {
  id: string;
  name: string;
  icon: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  contributors: { userId: string; name: string; amount: number }[];
  createdBy: string;
}

export interface FamilySettings {
  allowMembersToSeeEachOther: boolean;
  requireApprovalToJoin: boolean;
  shareCardsData: boolean;
  sharePortfolioData: boolean;
}

export type FamilyRole = 'owner' | 'admin' | 'member' | 'viewer';

export const ROLE_PERMISSIONS: Record<FamilyRole, MemberPermissions> = {
  owner: {
    canViewPortfolio: true,
    canViewCards: true,
    canViewMembers: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canEditGoals: true,
    canManageSettings: true,
  },
  admin: {
    canViewPortfolio: true,
    canViewCards: true,
    canViewMembers: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canEditGoals: true,
    canManageSettings: false,
  },
  member: {
    canViewPortfolio: true,
    canViewCards: false,
    canViewMembers: true,
    canInviteMembers: false,
    canRemoveMembers: false,
    canEditGoals: true,
    canManageSettings: false,
  },
  viewer: {
    canViewPortfolio: true,
    canViewCards: false,
    canViewMembers: true,
    canInviteMembers: false,
    canRemoveMembers: false,
    canEditGoals: false,
    canManageSettings: false,
  },
};
