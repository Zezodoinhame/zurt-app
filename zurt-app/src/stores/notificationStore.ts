import { create } from 'zustand';
import type { Notification, NotificationType } from '../types';
import {
  fetchNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  deleteNotificationApi,
} from '../services/api';

interface NotificationState {
  notifications: Notification[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  filter: NotificationType | 'all';

  loadNotifications: () => Promise<void>;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismiss: (id: string) => void;
  setFilter: (filter: NotificationType | 'all') => void;
  getUnreadCount: () => number;
  getFilteredNotifications: () => Notification[];
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
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
        error: err?.message ?? 'Erro ao carregar notificacoes',
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
        error: err?.message ?? 'Erro ao atualizar notificacoes',
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
  },

  dismiss: (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
    // Fire-and-forget API call
    deleteNotificationApi(id);
  },

  setFilter: (filter: NotificationType | 'all') => set({ filter }),

  getUnreadCount: () => get().notifications.filter((n) => !n.read).length,

  getFilteredNotifications: () => {
    const { notifications, filter } = get();
    if (filter === 'all') return notifications;
    return notifications.filter((n) => n.type === filter);
  },
}));
