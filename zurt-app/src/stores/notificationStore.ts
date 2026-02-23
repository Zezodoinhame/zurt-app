import { create } from 'zustand';
import * as Notifications from 'expo-notifications';
import type { Notification, NotificationType, SmartAlert } from '../types';
import {
  fetchNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  deleteNotificationApi,
  isDemoMode,
} from '../services/api';
import { demoSmartAlerts } from '../data/demo';

interface NotificationState {
  notifications: Notification[];
  smartAlerts: SmartAlert[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  filter: NotificationType | 'all';

  loadNotifications: () => Promise<void>;
  loadSmartAlerts: () => Promise<void>;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismiss: (id: string) => void;
  dismissSmartAlert: (id: string) => void;
  setFilter: (filter: NotificationType | 'all') => void;
  getUnreadCount: () => number;
  getFilteredNotifications: () => Notification[];
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  smartAlerts: [],
  isLoading: false,
  isRefreshing: false,
  error: null,
  filter: 'all',

  loadNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const notifications = await fetchNotificationsApi();
      set({ notifications, isLoading: false, error: null });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err?.message ?? 'Erro ao carregar notificações',
      });
    }
  },

  refresh: async () => {
    set({ isRefreshing: true, error: null });
    try {
      const notifications = await fetchNotificationsApi();
      set({ notifications, isRefreshing: false, error: null });
    } catch (err: any) {
      set({
        isRefreshing: false,
        error: err?.message ?? 'Erro ao atualizar notificações',
      });
    }
  },

  markAsRead: (id: string) => {
    // Update local state immediately (optimistic)
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    }));
    // Fire-and-forget API call
    markNotificationReadApi(id);
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
    // Fire-and-forget API call
    markAllNotificationsReadApi();
    // Clear OS badge
    Notifications.setBadgeCountAsync(0).catch(() => {});
  },

  dismiss: (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
    // Fire-and-forget API call
    deleteNotificationApi(id);
  },

  loadSmartAlerts: async () => {
    try {
      if (isDemoMode()) {
        set({ smartAlerts: demoSmartAlerts });
        return;
      }
      // Real API call would go here:
      // const data = await apiRequest('/notifications/smart-alerts');
      set({ smartAlerts: demoSmartAlerts });
    } catch {
      // Silently fail
    }
  },

  dismissSmartAlert: (id: string) => {
    set((state) => ({
      smartAlerts: state.smartAlerts.filter((a) => a.id !== id),
    }));
  },

  setFilter: (filter: NotificationType | 'all') => set({ filter }),

  getUnreadCount: () => get().notifications.filter((n) => !n.read).length,

  getFilteredNotifications: () => {
    const { notifications, filter } = get();
    if (filter === 'all') return notifications;
    return notifications.filter((n) => n.type === filter);
  },
}));
