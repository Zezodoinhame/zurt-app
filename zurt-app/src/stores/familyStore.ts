// =============================================================================
// ZURT - Family Store (Local-first with API sync attempt)
// =============================================================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

const STORAGE_KEY = '@zurt:family';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface FamilyMember {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'spouse' | 'member';
  status: 'active' | 'pending';
  joinedAt?: string;
}

export interface FamilyGroup {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  members: FamilyMember[];
}

interface FamilyState {
  group: FamilyGroup | null;
  isLoading: boolean;
  error: string | null;

  loadFamily: () => Promise<void>;
  createGroup: (name: string, ownerEmail: string) => Promise<void>;
  addMember: (email: string, name: string, role: FamilyMember['role']) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  deleteGroup: () => Promise<void>;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function generateId() {
  return `fam_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function persistFamily(group: FamilyGroup | null) {
  try {
    if (group) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(group));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore write errors
  }
}

async function loadPersistedFamily(): Promise<FamilyGroup | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) return parsed;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------

export const useFamilyStore = create<FamilyState>((set, get) => ({
  group: null,
  isLoading: false,
  error: null,

  loadFamily: async () => {
    set({ isLoading: true, error: null });
    try {
      const stored = await loadPersistedFamily();
      set({ group: stored, isLoading: false });
    } catch (err: any) {
      logger.log('[FamilyStore] loadFamily error:', err?.message);
      set({ group: null, isLoading: false });
    }
  },

  createGroup: async (name: string, ownerEmail: string) => {
    const group: FamilyGroup = {
      id: generateId(),
      name: name.trim(),
      ownerId: 'local_owner',
      createdAt: new Date().toISOString(),
      members: [
        {
          id: generateId(),
          email: ownerEmail,
          name: 'Você',
          role: 'owner',
          status: 'active',
          joinedAt: new Date().toISOString(),
        },
      ],
    };
    set({ group });
    await persistFamily(group);
  },

  addMember: async (email: string, name: string, role: FamilyMember['role']) => {
    const { group } = get();
    if (!group) return;

    // Check duplicate
    if (group.members.some((m) => m.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Este email já foi adicionado ao grupo.');
    }

    const member: FamilyMember = {
      id: generateId(),
      email: email.trim(),
      name: name.trim() || email.split('@')[0],
      role,
      status: 'pending',
    };

    const updated: FamilyGroup = {
      ...group,
      members: [...group.members, member],
    };
    set({ group: updated });
    await persistFamily(updated);
  },

  removeMember: async (memberId: string) => {
    const { group } = get();
    if (!group) return;

    const updated: FamilyGroup = {
      ...group,
      members: group.members.filter((m) => m.id !== memberId),
    };
    set({ group: updated });
    await persistFamily(updated);
  },

  deleteGroup: async () => {
    set({ group: null });
    await persistFamily(null);
  },
}));
