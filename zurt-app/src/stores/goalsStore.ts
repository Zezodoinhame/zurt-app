import { create } from 'zustand';
import type { Goal, GoalCategory } from '../types';
import {
  fetchGoals,
  createGoal,
  updateGoal,
  deleteGoal,
} from '../services/api';
import { useAuthStore } from './authStore';
import { demoGoals } from '../data/demo';
import { logger } from '../utils/logger';

interface GoalInput {
  name: string;
  target_amount: number;
  deadline: string;
  category: GoalCategory;
  icon: string;
  color: string;
  monthly_contribution: number;
}

interface GoalsState {
  goals: Goal[];
  isLoading: boolean;
  error: string | null;

  loadGoals: () => Promise<void>;
  addGoal: (input: GoalInput) => Promise<void>;
  editGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
}

export const useGoalsStore = create<GoalsState>((set, get) => ({
  goals: [],
  isLoading: false,
  error: null,

  loadGoals: async () => {
    set({ isLoading: true, error: null });

    const isDemoMode = useAuthStore.getState().isDemoMode;
    if (isDemoMode) {
      set({ goals: demoGoals, isLoading: false });
      return;
    }

    try {
      const data = await fetchGoals();
      const goals: Goal[] = data.map((g: any) => ({
        id: g.id ?? g._id ?? String(Math.random()),
        name: g.name ?? '',
        target_amount: g.target_amount ?? 0,
        current_amount: g.current_amount ?? 0,
        deadline: g.deadline ?? '',
        category: g.category ?? 'custom',
        icon: g.icon ?? '\u{1F3AF}',
        color: g.color ?? '#00D4AA',
        monthly_contribution: g.monthly_contribution ?? 0,
        created_at: g.created_at ?? new Date().toISOString(),
      }));
      set({ goals, isLoading: false });
    } catch (err: any) {
      logger.log('[GoalsStore] loadGoals error:', err?.message ?? err);
      set({ goals: demoGoals, isLoading: false });
    }
  },

  addGoal: async (input: GoalInput) => {
    const isDemoMode = useAuthStore.getState().isDemoMode;

    const newGoal: Goal = {
      id: 'g_' + Date.now(),
      name: input.name,
      target_amount: input.target_amount,
      current_amount: 0,
      deadline: input.deadline,
      category: input.category,
      icon: input.icon,
      color: input.color,
      monthly_contribution: input.monthly_contribution,
      created_at: new Date().toISOString(),
    };

    // Optimistic update
    set({ goals: [...get().goals, newGoal] });

    if (!isDemoMode) {
      try {
        await createGoal(input);
      } catch (err: any) {
        logger.log('[GoalsStore] addGoal error:', err?.message ?? err);
      }
    }
  },

  editGoal: async (id: string, updates: Partial<Goal>) => {
    const isDemoMode = useAuthStore.getState().isDemoMode;

    // Optimistic update
    set({
      goals: get().goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    });

    if (!isDemoMode) {
      try {
        await updateGoal(id, updates);
      } catch (err: any) {
        logger.log('[GoalsStore] editGoal error:', err?.message ?? err);
      }
    }
  },

  removeGoal: async (id: string) => {
    const isDemoMode = useAuthStore.getState().isDemoMode;

    // Optimistic update
    set({ goals: get().goals.filter((g) => g.id !== id) });

    if (!isDemoMode) {
      try {
        await deleteGoal(id);
      } catch (err: any) {
        logger.log('[GoalsStore] removeGoal error:', err?.message ?? err);
      }
    }
  },
}));
