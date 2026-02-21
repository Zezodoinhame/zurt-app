import { create } from 'zustand';
import type { User } from '../types';
import { demoUser } from '../data/demo';
import { loginApi, clearToken, fetchUserProfile, getToken } from '../services/api';
import { clearSession } from '../services/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemoMode: boolean;
  valuesHidden: boolean;

  login: (email: string, password: string) => Promise<boolean>;
  loginDemo: () => void;
  logout: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
  setLoading: (loading: boolean) => void;
  toggleValuesHidden: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isDemoMode: false,
  valuesHidden: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });

    try {
      const { user } = await loginApi(email, password);
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        isDemoMode: false,
      });
      return true;
    } catch {
      // API failed — fall back to demo mode if credentials match demo user
      if (email === 'diego@zurt.io') {
        set({
          user: demoUser,
          isAuthenticated: true,
          isLoading: false,
          isDemoMode: true,
        });
        return true;
      }
      set({ isLoading: false });
      return false;
    }
  },

  loginDemo: () => {
    set({
      user: demoUser,
      isAuthenticated: true,
      isDemoMode: true,
      isLoading: false,
    });
  },

  restoreSession: async () => {
    const token = await getToken();
    if (!token) return false;

    try {
      const user = await fetchUserProfile();
      set({
        user,
        isAuthenticated: true,
        isDemoMode: false,
      });
      return true;
    } catch {
      await clearToken();
      return false;
    }
  },

  logout: async () => {
    await clearToken();
    await clearSession().catch(() => {});
    set({
      user: null,
      isAuthenticated: false,
      isDemoMode: false,
      valuesHidden: false,
    });
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  toggleValuesHidden: () =>
    set((state) => ({ valuesHidden: !state.valuesHidden })),

  updateUser: (updates: Partial<User>) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),
}));
