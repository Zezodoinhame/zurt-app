// =============================================================================
// ZURT - Family Store (API-first with demo fallback + Zustand persist)
// =============================================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './authStore';
import {
  fetchFamilyGroup,
  createFamilyGroup as apiCreateGroup,
  inviteFamilyMember as apiInviteMember,
  removeFamilyMember as apiRemoveMember,
  fetchMemberProfile,
  isDemoMode,
} from '../services/api';
import { logger } from '../utils/logger';
import {
  type FamilyGroup,
  type FamilyMember,
  type FamilyGoal,
  type FamilySettings,
  type FamilyRole,
  ROLE_PERMISSIONS,
} from '../types/family';

// Re-export types for backward compatibility
export type { FamilyGroup, FamilyMember, FamilyGoal, FamilySettings, FamilyRole };
export { ROLE_PERMISSIONS };

// -----------------------------------------------------------------------------
// Demo data
// -----------------------------------------------------------------------------

const DEMO_FAMILY: FamilyGroup = {
  id: 'demo-family',
  name: 'Família Oliveira',
  createdBy: 'demo-user',
  createdAt: '2025-01-01T00:00:00.000Z',
  members: [
    {
      userId: 'demo-user',
      name: 'Diego',
      email: 'diego@zurt.com.br',
      role: 'owner',
      status: 'active',
      joinedAt: '2025-01-01T00:00:00.000Z',
      permissions: ROLE_PERMISSIONS.owner,
      portfolioSummary: {
        totalPatrimony: 847392,
        monthlyChange: 12847,
        monthlyChangePct: 1.54,
        allocations: [
          { label: 'Renda Fixa', pct: 45, value: 381326, color: '#00D4AA' },
          { label: 'Ações', pct: 30, value: 254218, color: '#3A86FF' },
          { label: 'FIIs', pct: 15, value: 127109, color: '#FFD93D' },
          { label: 'Internacional', pct: 10, value: 84739, color: '#FF6B6B' },
        ],
        lastUpdated: new Date().toISOString(),
      },
      cardsSummary: {
        totalInvoices: 4230,
        totalLimit: 35000,
        totalUsed: 4230,
        cards: [
          { banco: 'Nubank', ultimos4: '4532', faturaAtual: 2180, limiteTotal: 20000 },
          { banco: 'Itaú', ultimos4: '8891', faturaAtual: 2050, limiteTotal: 15000 },
        ],
      },
    },
    {
      userId: 'demo-ana',
      name: 'Ana',
      email: 'ana@zurt.com.br',
      role: 'admin',
      status: 'active',
      joinedAt: '2025-01-15T00:00:00.000Z',
      permissions: ROLE_PERMISSIONS.admin,
      portfolioSummary: {
        totalPatrimony: 285400,
        monthlyChange: 4320,
        monthlyChangePct: 1.54,
        allocations: [
          { label: 'Renda Fixa', pct: 60, value: 171240, color: '#00D4AA' },
          { label: 'Ações', pct: 25, value: 71350, color: '#3A86FF' },
          { label: 'Crypto', pct: 15, value: 42810, color: '#FFD93D' },
        ],
        lastUpdated: new Date().toISOString(),
      },
      cardsSummary: {
        totalInvoices: 1850,
        totalLimit: 12000,
        totalUsed: 1850,
        cards: [
          { banco: 'Nubank', ultimos4: '7721', faturaAtual: 1850, limiteTotal: 12000 },
        ],
      },
    },
    {
      userId: 'demo-joao',
      name: 'João',
      email: 'joao@zurt.com.br',
      role: 'member',
      status: 'active',
      joinedAt: '2025-02-01T00:00:00.000Z',
      permissions: ROLE_PERMISSIONS.member,
      portfolioSummary: {
        totalPatrimony: 89200,
        monthlyChange: 1230,
        monthlyChangePct: 1.4,
        allocations: [
          { label: 'Renda Fixa', pct: 70, value: 62440, color: '#00D4AA' },
          { label: 'Ações', pct: 30, value: 26760, color: '#3A86FF' },
        ],
        lastUpdated: new Date().toISOString(),
      },
    },
  ],
  goals: [
    {
      id: 'g1',
      name: 'Viagem Europa',
      icon: '✈️',
      targetAmount: 45000,
      currentAmount: 32600,
      deadline: '2025-12-31',
      contributors: [
        { userId: 'demo-user', name: 'Diego', amount: 20000 },
        { userId: 'demo-ana', name: 'Ana', amount: 8600 },
        { userId: 'demo-joao', name: 'João', amount: 4000 },
      ],
      createdBy: 'demo-user',
    },
    {
      id: 'g2',
      name: 'Reserva de Emergência',
      icon: '🛡️',
      targetAmount: 100000,
      currentAmount: 67500,
      contributors: [
        { userId: 'demo-user', name: 'Diego', amount: 40000 },
        { userId: 'demo-ana', name: 'Ana', amount: 27500 },
      ],
      createdBy: 'demo-user',
    },
  ],
  settings: {
    allowMembersToSeeEachOther: true,
    requireApprovalToJoin: true,
    shareCardsData: true,
    sharePortfolioData: true,
  },
};

// -----------------------------------------------------------------------------
// State interface
// -----------------------------------------------------------------------------

interface FamilyState {
  group: FamilyGroup | null;
  isLoading: boolean;
  error: string | null;

  // Viewing member data
  viewingMember: FamilyMember | null;
  viewingMemberPortfolio: any | null;
  viewingMemberCards: any | null;

  // --- Backward-compat aliases (used by family.tsx) ---
  groups: FamilyGroup[];
  activeGroupId: string | null;

  // Group lifecycle
  loadGroup: () => Promise<void>;
  createGroup: (name: string, ownerName?: string, ownerEmail?: string) => Promise<string>;
  deleteGroup: () => Promise<void>;

  // Members
  inviteMember: (email: string, role?: FamilyRole) => Promise<string>;
  removeMember: (userIdOrGroupId: string, memberIdCompat?: string) => Promise<void>;
  updateMemberRole: (userId: string, role: FamilyRole) => Promise<void>;

  // Member portfolio / cards
  loadMemberPortfolio: (userId: string) => Promise<void>;
  loadMemberCards: (userId: string) => Promise<void>;

  // Goals
  createGoal: (goal: Partial<FamilyGoal>) => Promise<void>;
  updateGoal: (goalId: string, updates: Partial<FamilyGoal>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;

  // Settings
  updateSettings: (settings: Partial<FamilySettings>) => Promise<void>;

  // Backward-compat helpers
  addMember: (groupId: string, name: string, email: string, role?: string) => void;
  setActiveGroup: (groupId: string | null) => void;
  getActiveGroup: () => FamilyGroup | null;
}

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => ({
      group: null,
      isLoading: false,
      error: null,
      viewingMember: null,
      viewingMemberPortfolio: null,
      viewingMemberCards: null,

      // Backward-compat: expose group as single-element array
      get groups(): FamilyGroup[] {
        const g = get().group;
        return g ? [g] : [];
      },
      activeGroupId: null,

      // -----------------------------------------------------------------------
      // loadGroup
      // -----------------------------------------------------------------------
      loadGroup: async () => {
        set({ isLoading: true, error: null });
        try {
          if (isDemoMode()) {
            set({ group: DEMO_FAMILY, activeGroupId: DEMO_FAMILY.id, isLoading: false });
            return;
          }
          const data = await fetchFamilyGroup();
          if (data?.group) {
            const members: FamilyMember[] = (data.members || []).map((m: any) => ({
              userId: m.user_id || m.id,
              name: m.full_name || m.name || m.invited_email?.split('@')[0] || '',
              email: m.invited_email || m.email || '',
              avatarUrl: m.avatar_url,
              role: m.role || 'member',
              joinedAt: m.joined_at || m.created_at || new Date().toISOString(),
              status: m.status === 'accepted' ? 'active' : m.status || 'pending',
              permissions: ROLE_PERMISSIONS[(m.role || 'member') as FamilyRole] || ROLE_PERMISSIONS.member,
              portfolioSummary: m.portfolioSummary,
              cardsSummary: m.cardsSummary,
            }));

            const group: FamilyGroup = {
              id: data.group.id,
              name: data.group.name,
              createdBy: data.group.owner_id || data.group.created_by || '',
              createdAt: data.group.created_at || new Date().toISOString(),
              members,
              goals: data.goals || [],
              settings: data.settings || {
                allowMembersToSeeEachOther: true,
                requireApprovalToJoin: true,
                shareCardsData: true,
                sharePortfolioData: true,
              },
            };
            set({ group, activeGroupId: group.id, isLoading: false });
          } else {
            set({ group: null, activeGroupId: null, isLoading: false });
          }
        } catch (err: any) {
          logger.log('[Family] loadGroup error:', err?.message);
          if (err?.status === 404 || err?.message?.includes('404')) {
            set({ group: null, activeGroupId: null, isLoading: false });
          } else {
            set({ error: err?.message || 'Failed to load family', isLoading: false });
          }
        }
      },

      // -----------------------------------------------------------------------
      // createGroup
      // -----------------------------------------------------------------------
      createGroup: async (name: string, ownerName?: string, ownerEmail?: string) => {
        set({ isLoading: true, error: null });
        try {
          if (isDemoMode()) {
            const demoGroup: FamilyGroup = {
              ...DEMO_FAMILY,
              id: `family_${Date.now()}`,
              name: name.trim(),
              members: [DEMO_FAMILY.members[0]],
              goals: [],
            };
            set({ group: demoGroup, activeGroupId: demoGroup.id, isLoading: false });
            return demoGroup.id;
          }
          const data = await apiCreateGroup(name.trim());
          const id = data?.group?.id || `family_${Date.now()}`;

          const user = useAuthStore.getState().user;
          const group: FamilyGroup = {
            id,
            name: name.trim(),
            createdBy: user?.id || '',
            createdAt: new Date().toISOString(),
            members: [
              {
                userId: user?.id || 'self',
                name: ownerName || user?.name || 'Você',
                email: ownerEmail || user?.email || '',
                role: 'owner',
                status: 'active',
                joinedAt: new Date().toISOString(),
                permissions: ROLE_PERMISSIONS.owner,
              },
            ],
            goals: [],
            settings: {
              allowMembersToSeeEachOther: true,
              requireApprovalToJoin: true,
              shareCardsData: true,
              sharePortfolioData: true,
            },
          };
          set({ group, activeGroupId: id, isLoading: false });
          return id;
        } catch (err: any) {
          logger.log('[Family] createGroup error:', err?.message);
          set({ error: err?.message || 'Failed to create group', isLoading: false });
          throw err;
        }
      },

      // -----------------------------------------------------------------------
      // deleteGroup
      // -----------------------------------------------------------------------
      deleteGroup: async () => {
        set({ isLoading: true, error: null });
        try {
          // No dedicated API delete endpoint yet — just clear local state
          set({ group: null, activeGroupId: null, isLoading: false });
        } catch (err: any) {
          logger.log('[Family] deleteGroup error:', err?.message);
          set({ error: err?.message || 'Failed to delete group', isLoading: false });
          throw err;
        }
      },

      // -----------------------------------------------------------------------
      // inviteMember
      // -----------------------------------------------------------------------
      inviteMember: async (email: string, role: FamilyRole = 'member') => {
        set({ error: null });
        try {
          if (isDemoMode()) {
            const newMember: FamilyMember = {
              userId: `demo_${Date.now()}`,
              name: email.split('@')[0],
              email,
              role,
              status: 'pending',
              joinedAt: new Date().toISOString(),
              permissions: ROLE_PERMISSIONS[role],
            };
            set((s) => ({
              group: s.group
                ? { ...s.group, members: [...s.group.members, newMember] }
                : s.group,
            }));
            return `https://zurt.com.br/invite/demo-${Date.now()}`;
          }
          const data = await apiInviteMember(email, role);
          // Reload to get updated member list
          await get().loadGroup();
          return data?.inviteLink || data?.message || 'Invite sent';
        } catch (err: any) {
          logger.log('[Family] inviteMember error:', err?.message);
          set({ error: err?.message || 'Failed to invite member' });
          throw err;
        }
      },

      // -----------------------------------------------------------------------
      // removeMember — also supports legacy 2-arg call: removeMember(groupId, memberId)
      // -----------------------------------------------------------------------
      removeMember: async (userIdOrGroupId: string, memberIdCompat?: string) => {
        // Backward compat: if 2 args passed, the second is the actual member ID
        const targetId = memberIdCompat || userIdOrGroupId;
        set({ error: null });
        try {
          if (!isDemoMode()) {
            await apiRemoveMember(targetId);
          }
          set((s) => ({
            group: s.group
              ? {
                  ...s.group,
                  members: s.group.members.filter(
                    (m) => m.userId !== targetId,
                  ),
                }
              : s.group,
          }));
        } catch (err: any) {
          logger.log('[Family] removeMember error:', err?.message);
          set({ error: err?.message || 'Failed to remove member' });
          throw err;
        }
      },

      // -----------------------------------------------------------------------
      // updateMemberRole
      // -----------------------------------------------------------------------
      updateMemberRole: async (userId: string, role: FamilyRole) => {
        set({ error: null });
        try {
          // API endpoint may not exist yet — update locally
          set((s) => ({
            group: s.group
              ? {
                  ...s.group,
                  members: s.group.members.map((m) =>
                    m.userId === userId
                      ? { ...m, role, permissions: ROLE_PERMISSIONS[role] }
                      : m,
                  ),
                }
              : s.group,
          }));
        } catch (err: any) {
          logger.log('[Family] updateMemberRole error:', err?.message);
          set({ error: err?.message || 'Failed to update role' });
          throw err;
        }
      },

      // -----------------------------------------------------------------------
      // loadMemberPortfolio
      // -----------------------------------------------------------------------
      loadMemberPortfolio: async (userId: string) => {
        set({ viewingMember: null, viewingMemberPortfolio: null });
        try {
          const group = get().group;
          const member = group?.members.find((m) => m.userId === userId);
          if (member) set({ viewingMember: member });

          if (isDemoMode()) {
            set({ viewingMemberPortfolio: member?.portfolioSummary || null });
            return;
          }
          const data = await fetchMemberProfile(userId);
          set({ viewingMemberPortfolio: data });
        } catch (err: any) {
          logger.log('[Family] loadMemberPortfolio error:', err?.message);
          set({ viewingMemberPortfolio: null });
        }
      },

      // -----------------------------------------------------------------------
      // loadMemberCards
      // -----------------------------------------------------------------------
      loadMemberCards: async (userId: string) => {
        set({ viewingMemberCards: null });
        try {
          if (isDemoMode()) {
            const group = get().group;
            const member = group?.members.find((m) => m.userId === userId);
            set({ viewingMemberCards: member?.cardsSummary || null });
            return;
          }
          // Cards endpoint may not exist yet — use member profile
          const data = await fetchMemberProfile(userId);
          set({ viewingMemberCards: data?.cards || null });
        } catch (err: any) {
          logger.log('[Family] loadMemberCards error:', err?.message);
          set({ viewingMemberCards: null });
        }
      },

      // -----------------------------------------------------------------------
      // Goals CRUD
      // -----------------------------------------------------------------------
      createGoal: async (goal: Partial<FamilyGoal>) => {
        set({ error: null });
        try {
          const newGoal: FamilyGoal = {
            id: `goal_${Date.now()}`,
            name: goal.name || '',
            icon: goal.icon || '🎯',
            targetAmount: goal.targetAmount || 0,
            currentAmount: goal.currentAmount || 0,
            deadline: goal.deadline,
            contributors: goal.contributors || [],
            createdBy: useAuthStore.getState().user?.id || 'self',
            ...goal,
          };
          // Goal endpoints may not exist yet — store locally
          set((s) => ({
            group: s.group
              ? { ...s.group, goals: [...s.group.goals, newGoal] }
              : s.group,
          }));
        } catch (err: any) {
          logger.log('[Family] createGoal error:', err?.message);
          set({ error: err?.message || 'Failed to create goal' });
          throw err;
        }
      },

      updateGoal: async (goalId: string, updates: Partial<FamilyGoal>) => {
        set({ error: null });
        try {
          set((s) => ({
            group: s.group
              ? {
                  ...s.group,
                  goals: s.group.goals.map((g) =>
                    g.id === goalId ? { ...g, ...updates } : g,
                  ),
                }
              : s.group,
          }));
        } catch (err: any) {
          logger.log('[Family] updateGoal error:', err?.message);
          set({ error: err?.message || 'Failed to update goal' });
          throw err;
        }
      },

      deleteGoal: async (goalId: string) => {
        set({ error: null });
        try {
          set((s) => ({
            group: s.group
              ? {
                  ...s.group,
                  goals: s.group.goals.filter((g) => g.id !== goalId),
                }
              : s.group,
          }));
        } catch (err: any) {
          logger.log('[Family] deleteGoal error:', err?.message);
          set({ error: err?.message || 'Failed to delete goal' });
          throw err;
        }
      },

      // -----------------------------------------------------------------------
      // Settings
      // -----------------------------------------------------------------------
      updateSettings: async (settings: Partial<FamilySettings>) => {
        set({ error: null });
        try {
          set((s) => ({
            group: s.group
              ? {
                  ...s.group,
                  settings: { ...s.group.settings, ...settings },
                }
              : s.group,
          }));
        } catch (err: any) {
          logger.log('[Family] updateSettings error:', err?.message);
          set({ error: err?.message || 'Failed to update settings' });
          throw err;
        }
      },

      // -----------------------------------------------------------------------
      // Backward-compat helpers (used by existing family.tsx)
      // -----------------------------------------------------------------------
      addMember: (_groupId: string, _name: string, email: string, role: string = 'member') => {
        const validRole = (['owner', 'admin', 'member', 'viewer'].includes(role)
          ? role
          : 'member') as FamilyRole;
        get().inviteMember(email, validRole).catch(() => {});
      },

      setActiveGroup: (groupId: string | null) => {
        set({ activeGroupId: groupId });
      },

      getActiveGroup: () => {
        return get().group;
      },
    }),
    {
      name: 'zurt-family-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        group: state.group,
        activeGroupId: state.activeGroupId,
      }),
    },
  ),
);
