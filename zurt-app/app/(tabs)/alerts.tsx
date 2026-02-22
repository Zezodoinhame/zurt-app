import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { useNotificationStore } from '../../src/stores/notificationStore';
import { formatRelativeDate } from '../../src/utils/formatters';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { SkeletonList } from '../../src/components/skeletons/Skeleton';
import { ErrorState } from '../../src/components/shared/ErrorState';
import { fetchAIAlerts, type AIAlert } from '../../src/services/api';
import type { NotificationType } from '../../src/types';
import { AppIcon, type AppIconName } from '../../src/hooks/useIcon';

const filterOptions: Array<{ key: NotificationType | 'all'; label: string; iconName?: AppIconName }> = [
  { key: 'all', label: 'Todos' },
  { key: 'distribution', label: 'Dist.', iconName: 'diamond' },
  { key: 'maturity', label: 'Venc.', iconName: 'warning' },
  { key: 'invoice', label: 'Fatura', iconName: 'card' },
  { key: 'insight', label: 'Insight', iconName: 'idea' },
  { key: 'system', label: 'Sistema', iconName: 'notification' },
];

export default function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const {
    isLoading,
    isRefreshing,
    error,
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
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);

  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const typeConfig: Record<
    NotificationType,
    { iconName: AppIconName; color: string }
  > = useMemo(() => ({
    distribution: { iconName: 'token', color: colors.accent },
    maturity: { iconName: 'warning', color: colors.warning },
    invoice: { iconName: 'card', color: colors.info },
    insight: { iconName: 'idea', color: '#A855F7' },
    system: { iconName: 'notification', color: colors.text.secondary },
  }), [colors]);

  const aiAlertConfig: Record<string, { iconName: AppIconName; color: string }> = useMemo(() => ({
    warning: { iconName: 'warning', color: colors.warning },
    opportunity: { iconName: 'trending', color: colors.positive },
    info: { iconName: 'idea', color: colors.info },
  }), [colors]);

  const [aiAlerts, setAiAlerts] = useState<AIAlert[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCheckedThisSession, setAiCheckedThisSession] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Auto-check AI alerts once per session
  useEffect(() => {
    if (!aiCheckedThisSession) {
      handleCheckAIAlerts(true);
    }
  }, []);

  const handleCheckAIAlerts = useCallback(async (silent = false) => {
    if (!silent) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAiLoading(true);
    try {
      const alerts = await fetchAIAlerts();
      setAiAlerts(alerts);
      setAiCheckedThisSession(true);
    } catch {
      // Silently fail
    } finally {
      setAiLoading(false);
    }
  }, []);

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

  const dismissAIAlert = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAiAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.screenTitle}>{t('alerts.title')}</Text>
        <View style={{ paddingHorizontal: spacing.xl }}>
          <SkeletonList count={8} />
        </View>
      </View>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.screenTitle}>{t('alerts.title')}</Text>
        <ErrorState message={error} onRetry={loadNotifications} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>{t('alerts.title')}</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAll}>
            <Text style={styles.markAllText}>{t('alerts.markAllRead')}</Text>
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
            <View style={styles.filterChipRow}>
              {opt.iconName && <AppIcon name={opt.iconName} size={14} color={filter === opt.key ? colors.accent : colors.text.secondary} />}
              <Text
                style={[
                  styles.filterChipText,
                  filter === opt.key && styles.filterChipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </View>
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
        {/* AI Alerts Section */}
        <View style={styles.aiSection}>
          <View style={styles.aiSectionHeader}>
            <Text style={styles.aiSectionTitle}>
              <AppIcon name="sparkle" size={15} color={colors.accent} /> {t('alerts.aiSection')}
            </Text>
            <TouchableOpacity
              style={styles.aiCheckButton}
              onPress={() => handleCheckAIAlerts(false)}
              disabled={aiLoading}
              activeOpacity={0.7}
            >
              {aiLoading ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text style={styles.aiCheckText}>{t('alerts.aiCheck')}</Text>
              )}
            </TouchableOpacity>
          </View>

          {aiAlerts.length > 0 && (
            <View style={styles.aiAlertsList}>
              {aiAlerts.map((alert, index) => {
                const config = aiAlertConfig[alert.type] ?? aiAlertConfig.info;
                return (
                  <View key={`ai-alert-${index}-${alert.title}`} style={[styles.aiAlertCard, { borderLeftColor: config.color }]}>
                    <View style={styles.aiAlertRow}>
                      <AppIcon name={config.iconName} size={18} color={config.color} />
                      <View style={styles.aiAlertContent}>
                        <Text style={styles.aiAlertTitle}>{alert.title}</Text>
                        <Text style={styles.aiAlertMessage}>{alert.message}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => dismissAIAlert(alert.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <AppIcon name="close" size={12} color={colors.text.muted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Regular notifications */}
        {notifications.length === 0 && aiAlerts.length === 0 ? (
          <View style={styles.empty}>
            <AppIcon name="notification" size={48} color={colors.text.secondary} />
            <Text style={styles.emptyText}>{t('alerts.noNotifications')}</Text>
          </View>
        ) : (
          notifications.map((notification, index) => {
            const config = typeConfig[notification.type];

            return (
              <View key={`notif-${index}-${notification.id}`}>
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
                      <AppIcon name={config.iconName} size={18} color={config.color} />
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
                    accessibilityLabel={t('alerts.dismiss')}
                  >
                    <AppIcon name="close" size={14} color={colors.text.muted} />
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
  filterChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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

  // AI Alerts section
  aiSection: {
    marginBottom: spacing.lg,
  },
  aiSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  aiSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  aiCheckButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.accent,
    minWidth: 100,
    alignItems: 'center',
  },
  aiCheckText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
  },
  aiAlertsList: {
    gap: spacing.sm,
  },
  aiAlertCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
  },
  aiAlertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  aiAlertIcon: {
    fontSize: 18,
    marginRight: spacing.md,
    marginTop: 2,
  },
  aiAlertContent: {
    flex: 1,
  },
  aiAlertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  aiAlertMessage: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },

  // Notifications
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
