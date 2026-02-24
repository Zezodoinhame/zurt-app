// =============================================================================
// ZURT - Family Store (Local-first with Zustand persist)
// =============================================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface FamilyMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'spouse' | 'member';
  status: 'active' | 'pending';
  joinedAt: string;
  avatarColor: string;
}

export interface FamilyGroup {
  id: string;
  name: string;
  createdAt: string;
  ownerId: string;
  members: FamilyMember[];
}

interface FamilyState {
  groups: FamilyGroup[];
  activeGroupId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  createGroup: (name: string, ownerName: string, ownerEmail: string) => string;
  deleteGroup: (groupId: string) => void;
  addMember: (groupId: string, name: string, email: string, role?: FamilyMember['role']) => void;
  removeMember: (groupId: string, memberId: string) => void;
  setActiveGroup: (groupId: string | null) => void;
  getActiveGroup: () => FamilyGroup | null;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const AVATAR_COLORS = [
  '#00D4AA', '#45B7D1', '#FF6200', '#820AD1',
  '#EC0000', '#003882', '#FF7A00', '#3A86FF',
];

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => ({
      groups: [],
      activeGroupId: null,
      isLoading: false,
      error: null,

      createGroup: (name: string, ownerName: string, ownerEmail: string) => {
        const id = `family_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const ownerId = `member_${Date.now()}`;
        const newGroup: FamilyGroup = {
          id,
          name: name.trim(),
          createdAt: new Date().toISOString(),
          ownerId,
          members: [
            {
              id: ownerId,
              name: ownerName || 'Você',
              email: ownerEmail,
              role: 'owner',
              status: 'active',
              joinedAt: new Date().toISOString(),
              avatarColor: AVATAR_COLORS[0],
            },
          ],
        };
        set((state) => ({
          groups: [...state.groups, newGroup],
          activeGroupId: id,
          error: null,
        }));
        return id;
      },

      deleteGroup: (groupId: string) => {
        set((state) => ({
          groups: state.groups.filter((g) => g.id !== groupId),
          activeGroupId: state.activeGroupId === groupId ? null : state.activeGroupId,
        }));
      },

      addMember: (groupId: string, name: string, email: string, role: FamilyMember['role'] = 'member') => {
        const memberId = `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        set((state) => ({
          groups: state.groups.map((g) => {
            if (g.id !== groupId) return g;
            // Check duplicate email
            if (g.members.some((m) => m.email.toLowerCase() === email.toLowerCase())) return g;
            return {
              ...g,
              members: [
                ...g.members,
                {
                  id: memberId,
                  name: name.trim() || email.split('@')[0],
                  email: email.trim().toLowerCase(),
                  role,
                  status: 'pending' as const,
                  joinedAt: new Date().toISOString(),
                  avatarColor: AVATAR_COLORS[g.members.length % AVATAR_COLORS.length],
                },
              ],
            };
          }),
        }));
      },

      removeMember: (groupId: string, memberId: string) => {
        set((state) => ({
          groups: state.groups.map((g) => {
            if (g.id !== groupId) return g;
            // Cannot remove owner
            if (g.members.find((m) => m.id === memberId)?.role === 'owner') return g;
            return {
              ...g,
              members: g.members.filter((m) => m.id !== memberId),
            };
          }),
        }));
      },

      setActiveGroup: (groupId: string | null) => {
        set({ activeGroupId: groupId });
      },

      getActiveGroup: () => {
        const state = get();
        return state.groups.find((g) => g.id === state.activeGroupId) || null;
      },
    }),
    {
      name: 'zurt-family-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
