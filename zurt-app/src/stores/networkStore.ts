import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PendingAction } from '../types';
import { logger } from '../utils/logger';

const PENDING_KEY = 'zurt:pendingActions';

interface NetworkState {
  isOnline: boolean;
  lastSyncTime: string | null;
  pendingActions: PendingAction[];

  initNetworkListener: () => () => void;
  addPendingAction: (action: Omit<PendingAction, 'id' | 'createdAt'>) => void;
  syncPendingActions: () => Promise<void>;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isOnline: true,
  lastSyncTime: null,
  pendingActions: [],

  initNetworkListener: () => {
    // Load persisted pending actions
    AsyncStorage.getItem(PENDING_KEY).then((raw) => {
      if (raw) {
        try { set({ pendingActions: JSON.parse(raw) }); } catch { /* ignore */ }
      }
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      const wasOffline = !get().isOnline;
      const isNowOnline = !!(state.isConnected && state.isInternetReachable !== false);

      set({ isOnline: isNowOnline });

      // offline → online transition: auto-sync
      if (wasOffline && isNowOnline && get().pendingActions.length > 0) {
        logger.log('[Network] Back online, syncing pending actions...');
        get().syncPendingActions();
      }
    });

    return unsubscribe;
  },

  addPendingAction: (action) => {
    const pending: PendingAction = {
      ...action,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      createdAt: new Date().toISOString(),
    };
    const updated = [...get().pendingActions, pending];
    set({ pendingActions: updated });
    AsyncStorage.setItem(PENDING_KEY, JSON.stringify(updated)).catch(() => {});
  },

  syncPendingActions: async () => {
    const { pendingActions } = get();
    if (pendingActions.length === 0) return;

    const remaining: PendingAction[] = [];

    for (const action of pendingActions) {
      try {
        // Dynamic import to avoid circular dependency
        const { getToken } = await import('../services/api');
        const token = await getToken();
        const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://zurt.com.br/api';
        const headers: Record<string, string> = {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        await fetch(`${API_BASE}${action.path}`, {
          method: action.method,
          headers,
          body: action.body ? JSON.stringify(action.body) : undefined,
        });
        logger.log(`[Network] Synced: ${action.method} ${action.path}`);
      } catch {
        remaining.push(action);
      }
    }

    set({ pendingActions: remaining, lastSyncTime: new Date().toISOString() });
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
  },
}));
