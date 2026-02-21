import { create } from 'zustand';
import type { Notification, NotificationType } from '../types';
import { fetchNotificationsApi, markNotificationReadApi } from '../services/api';

interface NotificationState {
  notifications: Notification[];
  isLoading: boolean;
  isRefreshing: boolean;
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
  filter: 'all',

  loadNotifications: async () => {
    set({ isLoading: true });
    try {
      const notifications = await fetchNotificationsApi();
      set({ notifications, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  refresh: async () => {
    set({ isRefreshing: true });
    try {
      const notifications = await fetchNotificationsApi();
      set({ notifications, isRefreshing: false });
    } catch {
      set({ isRefreshing: false });
    }
  },

  markAsRead: (id: string) => {
    // Update local state immediately
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    }));
    // Fire-and-forget API call
    markNotificationReadApi(id);
  },

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

  dismiss: (id: string) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  setFilter: (filter: NotificationType | 'all') => set({ filter }),

  getUnreadCount: () => get().notifications.filter((n) => !n.read).length,

  getFilteredNotifications: () => {
    const { notifications, filter } = get();
    if (filter === 'all') return notifications;
    return notifications.filter((n) => n.type === filter);
  },
}));
