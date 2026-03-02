import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { type ThemeColors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { useSettingsStore } from '../../stores/settingsStore';
import { usePlanStore, type LimitFeature } from '../../stores/planStore';

interface UsageBadgeProps {
  feature: LimitFeature;
  compact?: boolean;
}

export function UsageBadge({ feature, compact = false }: UsageBadgeProps) {
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const usage = usePlanStore((s) => s.usage);
  const limits = usePlanStore((s) => s.limits);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const info = getUsageInfo(feature, usage, limits);
  if (!info) return null;

  const { current, max, label } = info;
  const isUnlimited = max >= 999999;
  const ratio = isUnlimited ? 0 : max > 0 ? current / max : 0;
  const isAtLimit = !isUnlimited && current >= max;
  const isNearLimit = !isUnlimited && ratio >= 0.8;

  const badgeColor = isAtLimit
    ? colors.negative
    : isNearLimit
    ? colors.warning
    : colors.positive;

  const labelText = t(label);

  if (compact) {
    return (
      <View style={[styles.compactBadge, { borderColor: badgeColor + '40' }]}>
        <View style={[styles.compactDot, { backgroundColor: badgeColor }]} />
        <Text style={[styles.compactText, { color: badgeColor }]}>
          {isUnlimited ? `${current}` : `${current}/${max}`}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, { borderColor: badgeColor + '30' }]}>
      <View style={styles.badgeRow}>
        <Text style={[styles.badgeCount, { color: badgeColor }]}>
          {isUnlimited ? `${current}` : `${current}/${max}`}
        </Text>
        <Text style={styles.badgeLabel}>{labelText}</Text>
      </View>
      {!isUnlimited && (
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(ratio * 100, 100)}%`,
                backgroundColor: badgeColor,
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

function getUsageInfo(
  feature: LimitFeature,
  usage: { aiQueriesToday: number; reportsThisMonth: number; connectionsCount: number; alertsCount: number },
  limits: { maxAiQueriesPerDay: number; maxReportsPerMonth: number; maxConnections: number; maxAlerts: number; canUseTools: boolean; canUseFamilyGroup: boolean; canExportData: boolean },
): { current: number; max: number; label: string } | null {
  switch (feature) {
    case 'aiQueries':
      return { current: usage.aiQueriesToday, max: limits.maxAiQueriesPerDay, label: 'plan.aiQueriesLabel' };
    case 'reports':
      return { current: usage.reportsThisMonth, max: limits.maxReportsPerMonth, label: 'plan.reportsLabel' };
    case 'connections':
      return { current: usage.connectionsCount, max: limits.maxConnections, label: 'plan.connectionsLabel' };
    case 'alerts':
      return { current: usage.alertsCount, max: limits.maxAlerts, label: 'plan.alertsLabel' };
    default:
      return null;
  }
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    // Full badge
    badge: {
      backgroundColor: colors.card,
      borderRadius: radius.sm,
      borderWidth: 1,
      padding: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: 4,
    },
    badgeCount: {
      fontSize: 13,
      fontWeight: '700',
    },
    badgeLabel: {
      fontSize: 12,
      color: colors.text.secondary,
    },
    progressBar: {
      height: 3,
      backgroundColor: colors.border,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: 3,
      borderRadius: 2,
    },

    // Compact badge
    compactBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: radius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      gap: 4,
    },
    compactDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },
    compactText: {
      fontSize: 11,
      fontWeight: '600',
    },
  });
