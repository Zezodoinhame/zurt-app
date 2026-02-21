import { create } from 'zustand';
import type { User } from '../types';
import { demoUser } from '../data/demo';
import {
  loginApi,
  registerApi,
  clearToken,
  fetchUserProfile,
  getToken,
  setDemoMode,
  setOnUnauthorized,
} from '../services/api';
import { clearSession } from '../services/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemoMode: boolean;
  valuesHidden: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  register: (
    fullName: string,
    email: string,
    password: string,
    invitationToken?: string,
  ) => Promise<boolean>;
  loginDemo: () => void;
  logout: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
  setLoading: (loading: boolean) => void;
  toggleValuesHidden: () => void;
  updateUser: (updates: Partial<User>) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Register 401 handler to auto-logout
  setOnUnauthorized(() => {
    const state = get();
    if (state.isAuthenticated && !state.isDemoMode) {
      set({
        user: null,
        isAuthenticated: false,
        isDemoMode: false,
        valuesHidden: false,
      });
      setDemoMode(false);
    }
  });

  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isDemoMode: false,
    valuesHidden: false,
    error: null,

    login: async (email: string, password: string) => {
      console.log('[ZURT Auth] login() called with email:', email);
      set({ isLoading: true, error: null });

      try {
        const { user } = await loginApi(email, password);
        console.log('[ZURT Auth] login() success, user:', user?.name);
        setDemoMode(false);
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          isDemoMode: false,
          error: null,
        });
        return true;
      } catch (err: any) {
        console.log('[ZURT Auth] login() failed:', err?.message ?? err);
        // API failed - fall back to demo mode if credentials match demo user
        if (email === 'diego@zurt.io') {
          console.log('[ZURT Auth] falling back to demo mode');
          setDemoMode(true);
          set({
            user: demoUser,
            isAuthenticated: true,
            isLoading: false,
            isDemoMode: true,
            error: null,
          });
          return true;
        }
        const message =
          err?.message?.includes('401') || err?.message?.includes('Unauthorized')
            ? 'Email ou senha incorretos'
            : 'Erro de conexao. Tente novamente.';
        set({ isLoading: false, error: message });
        return false;
      }
    },

    register: async (
      fullName: string,
      email: string,
      password: string,
      invitationToken?: string,
    ) => {
      set({ isLoading: true, error: null });

      try {
        const { user } = await registerApi(fullName, email, password, invitationToken);
        setDemoMode(false);
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          isDemoMode: false,
          error: null,
        });
        return true;
      } catch (err: any) {
        const message =
          err?.message?.includes('409') || err?.message?.includes('already')
            ? 'Email ja cadastrado'
            : 'Erro ao criar conta. Tente novamente.';
        set({ isLoading: false, error: message });
        return false;
      }
    },

    loginDemo: () => {
      setDemoMode(true);
      set({
        user: demoUser,
        isAuthenticated: true,
        isDemoMode: true,
        isLoading: false,
        error: null,
      });
    },

    restoreSession: async () => {
      console.log('[ZURT Auth] restoreSession() called');
      const token = await getToken();
      console.log('[ZURT Auth] restoreSession() token:', token ? 'EXISTS' : 'NONE');
      if (!token) return false;

      try {
        const user = await fetchUserProfile();
        console.log('[ZURT Auth] restoreSession() success, user:', user?.name);
        setDemoMode(false);
        set({
          user,
          isAuthenticated: true,
          isDemoMode: false,
        });
        return true;
      } catch (err: any) {
        console.log('[ZURT Auth] restoreSession() failed:', err?.message ?? err);
        await clearToken();
        return false;
      }
    },

    logout: async () => {
      await clearToken();
      await clearSession().catch(() => {});
      setDemoMode(false);
      set({
        user: null,
        isAuthenticated: false,
        isDemoMode: false,
        valuesHidden: false,
        error: null,
      });
    },

    setLoading: (loading: boolean) => set({ isLoading: loading }),

    toggleValuesHidden: () =>
      set((state) => ({ valuesHidden: !state.valuesHidden })),

    updateUser: (updates: Partial<User>) =>
      set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),

    clearError: () => set({ error: null }),
  };
});
