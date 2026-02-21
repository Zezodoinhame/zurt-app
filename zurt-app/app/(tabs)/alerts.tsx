import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { useNotificationStore } from '../../src/stores/notificationStore';
import { formatRelativeDate } from '../../src/utils/formatters';
import { SkeletonList } from '../../src/components/skeletons/Skeleton';
import type { NotificationType } from '../../src/types';

const typeConfig: Record<
  NotificationType,
  { icon: string; color: string; label: string }
> = {
  distribution: { icon: '💎', color: colors.accent, label: 'Distribuição' },
  maturity: { icon: '⚠️', color: colors.warning, label: 'Vencimento' },
  invoice: { icon: '💳', color: colors.info, label: 'Fatura' },
  insight: { icon: '💡', color: '#A855F7', label: 'Insight' },
  system: { icon: '🔔', color: colors.text.secondary, label: 'Sistema' },
};

const filterOptions: Array<{ key: NotificationType | 'all'; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'distribution', label: '💎 Dist.' },
  { key: 'maturity', label: '⚠️ Venc.' },
  { key: 'invoice', label: '💳 Fatura' },
  { key: 'insight', label: '💡 Insight' },
  { key: 'system', label: '🔔 Sistema' },
];

export default function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const {
    isLoading,
    isRefreshing,
    filter,
    loadNotifications,
    refresh,
    markAsRead,
    markAllAsRead,
    dismiss,
    setFilter,
    getUnreadCount,
    getFilteredNotifications,
  } = useNotificationStore();

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const notifications = getFilteredNotifications();
  const unreadCount = getUnreadCount();

  const handleDismiss = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      dismiss(id);
    },
    [dismiss]
  );

  const handleMarkAllRead = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    markAllAsRead();
  }, [markAllAsRead]);

  const handleNotificationPress = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      markAsRead(id);
    },
    [markAsRead]
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.screenTitle}>Alertas</Text>
        <View style={{ paddingHorizontal: spacing.xl }}>
          <SkeletonList count={8} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Alertas</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAll}>
            <Text style={styles.markAllText}>Marcar todos como lido</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {filterOptions.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.filterChip,
              filter === opt.key && styles.filterChipActive,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setFilter(opt.key);
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === opt.key && styles.filterChipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={colors.accent}
          />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔕</Text>
            <Text style={styles.emptyText}>Nenhuma notificação</Text>
          </View>
        ) : (
          notifications.map((notification, index) => {
            const config = typeConfig[notification.type];

            return (
              <View key={notification.id}>
                <TouchableOpacity
                  style={[
                    styles.notificationCard,
                    !notification.read && styles.notificationUnread,
                  ]}
                  onPress={() => handleNotificationPress(notification.id)}
                  activeOpacity={0.7}
                  accessibilityLabel={`${notification.title}: ${notification.body}`}
                >
                  <View style={styles.notificationRow}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: config.color + '15' },
                      ]}
                    >
                      <Text style={styles.icon}>{config.icon}</Text>
                    </View>

                    <View style={styles.notificationContent}>
                      <View style={styles.notificationHeader}>
                        <Text style={styles.notificationTitle} numberOfLines={1}>
                          {notification.title}
                        </Text>
                        <Text style={styles.notificationTime}>
                          {formatRelativeDate(notification.date)}
                        </Text>
                      </View>
                      <Text
                        style={styles.notificationBody}
                        numberOfLines={2}
                      >
                        {notification.body}
                      </Text>
                    </View>

                    {!notification.read && (
                      <View style={styles.unreadDot} />
                    )}
                  </View>

                  {/* Dismiss button */}
                  <TouchableOpacity
                    style={styles.dismissButton}
                    onPress={() => handleDismiss(notification.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Dispensar notificação"
                  >
                    <Text style={styles.dismissText}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  markAll: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  markAllText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
  },
  filterContainer: {
    maxHeight: 44,
    marginBottom: spacing.md,
  },
  filterContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.accent + '20',
    borderColor: colors.accent,
  },
  filterChipText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  notificationCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationUnread: {
    borderColor: colors.accent + '30',
    backgroundColor: colors.accent + '05',
  },
  notificationRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 18,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  notificationTime: {
    fontSize: 11,
    color: colors.text.muted,
  },
  notificationBody: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginLeft: spacing.sm,
    marginTop: 4,
  },
  dismissButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  dismissText: {
    color: colors.text.muted,
    fontSize: 12,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
});
