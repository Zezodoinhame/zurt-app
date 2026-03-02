import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { type ThemeColors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatCurrency } from '../../utils/formatters';
import { AppIcon, type AppIconName } from '../../hooks/useIcon';
import type { SmartAlert, SmartAlertType } from '../../types';

interface SmartAlertCardProps {
  alert: SmartAlert;
  onDismiss: (id: string) => void;
}

const TYPE_CONFIG: Record<SmartAlertType, { iconName: AppIconName; color: string; actionKey: string }> = {
  portfolio_drift: { iconName: 'rebalance', color: '#3A86FF', actionKey: 'alerts.rebalance' },
  dividend_received: { iconName: 'dividend', color: '#00D4AA', actionKey: 'alerts.viewAsset' },
  goal_milestone: { iconName: 'target', color: '#A855F7', actionKey: 'alerts.viewGoal' },
  tax_deadline: { iconName: 'calendar', color: '#FF6B6B', actionKey: 'alerts.payDarf' },
  market_alert: { iconName: 'trending', color: '#F3BA2F', actionKey: 'alerts.viewAsset' },
};

export function SmartAlertCard({ alert, onDismiss }: SmartAlertCardProps) {
  const colors = useSettingsStore((s) => s.colors);
  const { t, currency } = useSettingsStore();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const config = TYPE_CONFIG[alert.type];

  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    switch (alert.type) {
      case 'portfolio_drift':
        router.push('/rebalance');
        break;
      case 'goal_milestone':
        router.push('/goals');
        break;
      case 'tax_deadline':
        router.push('/tax-dashboard');
        break;
      case 'dividend_received':
      case 'market_alert':
        if (alert.data?.ticker) {
          router.push({ pathname: '/asset-detail', params: { ticker: alert.data.ticker } });
        }
        break;
    }
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss(alert.id);
  };

  const renderTypeSpecific = () => {
    const d = alert.data ?? {};

    switch (alert.type) {
      case 'portfolio_drift':
        return (
          <View style={styles.driftBar}>
            <View style={[styles.driftCurrent, { width: `${Math.min(d.currentPct ?? 0, 100)}%`, backgroundColor: config.color }]} />
            <View style={[styles.driftTarget, { left: `${Math.min(d.targetPct ?? 0, 100)}%` }]} />
          </View>
        );
      case 'dividend_received':
        return (
          <View style={styles.badgeRow}>
            <View style={[styles.amountBadge, { backgroundColor: config.color + '20' }]}>
              <Text style={[styles.amountBadgeText, { color: config.color }]}>
                {formatCurrency(d.amount ?? 0, currency)}
              </Text>
            </View>
            {d.ticker && <Text style={styles.tickerText}>{d.ticker}</Text>}
          </View>
        );
      case 'goal_milestone':
        return (
          <View style={styles.progressRow}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.min(d.progress ?? 0, 100)}%`, backgroundColor: config.color }]} />
            </View>
            <Text style={[styles.progressText, { color: config.color }]}>{d.progress ?? 0}%</Text>
          </View>
        );
      case 'tax_deadline': {
        const dueDate = d.dueDate ? new Date(d.dueDate) : null;
        const now = new Date();
        const daysLeft = dueDate ? Math.max(0, Math.ceil((dueDate.getTime() - now.getTime()) / 86400000)) : 0;
        const urgent = daysLeft <= 3;
        return (
          <View style={[styles.urgencyRow, urgent && { backgroundColor: colors.negative + '10' }]}>
            <AppIcon name="calendar" size={14} color={urgent ? colors.negative : config.color} />
            <Text style={[styles.urgencyText, urgent && { color: colors.negative, fontWeight: '700' }]}>
              {daysLeft}d - {formatCurrency(d.amount ?? 0, currency)}
            </Text>
          </View>
        );
      }
      case 'market_alert':
        return (
          <View style={styles.badgeRow}>
            {d.ticker && <Text style={styles.tickerText}>{d.ticker}</Text>}
            <View style={[styles.changeBadge, { backgroundColor: (d.change ?? 0) >= 0 ? colors.positive + '20' : colors.negative + '20' }]}>
              <Text style={{ color: (d.change ?? 0) >= 0 ? colors.positive : colors.negative, fontSize: 13, fontWeight: '700' }}>
                {(d.change ?? 0) >= 0 ? '+' : ''}{d.change ?? 0}%
              </Text>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.card, { borderLeftColor: config.color }]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: config.color + '15' }]}>
          <AppIcon name={config.iconName} size={18} color={config.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>{alert.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{alert.body}</Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <AppIcon name="close" size={14} color={colors.text.muted} />
        </TouchableOpacity>
      </View>

      {renderTypeSpecific()}

      <TouchableOpacity style={[styles.actionButton, { borderColor: config.color }]} onPress={handleAction}>
        <Text style={[styles.actionText, { color: config.color }]}>{t(config.actionKey)}</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  // Portfolio drift bar
  driftBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  driftCurrent: {
    height: 8,
    borderRadius: 4,
  },
  driftTarget: {
    position: 'absolute',
    top: -2,
    width: 3,
    height: 12,
    backgroundColor: colors.text.primary,
    borderRadius: 1,
  },
  // Badge row
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  amountBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  amountBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tickerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  changeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  // Progress row
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Urgency row
  urgencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
  },
  urgencyText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  // Action button
  actionButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
