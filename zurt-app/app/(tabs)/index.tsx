import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { colors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { useAuthStore } from '../../src/stores/authStore';
import { usePortfolioStore } from '../../src/stores/portfolioStore';
import { useNotificationStore } from '../../src/stores/notificationStore';

import { Card } from '../../src/components/ui/Card';
import { Badge, DotBadge } from '../../src/components/ui/Badge';
import { LineChart } from '../../src/components/charts/LineChart';
import { AllocationBar } from '../../src/components/charts/AllocationBar';
import { AccountCard } from '../../src/components/cards/AccountCard';
import {
  SkeletonCard,
  SkeletonChart,
  SkeletonList,
} from '../../src/components/skeletons/Skeleton';

import {
  formatBRL,
  formatPct,
  maskValue,
  getGreeting,
} from '../../src/utils/formatters';

// ---------------------------------------------------------------------------
// Time range options for the chart
// ---------------------------------------------------------------------------

const TIME_RANGES = ['1M', '3M', '6M', '1A', 'MAX'] as const;
type TimeRange = (typeof TIME_RANGES)[number];

// ---------------------------------------------------------------------------
// Insight type-to-color mapping
// ---------------------------------------------------------------------------

const INSIGHT_COLORS: Record<string, string> = {
  warning: colors.warning,
  info: colors.info,
  opportunity: colors.accent,
};

// ===========================================================================
// HomeScreen
// ===========================================================================

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // ---- Stores -------------------------------------------------------------
  const { user, valuesHidden, toggleValuesHidden } = useAuthStore();
  const {
    summary,
    institutions,
    allocations,
    insights,
    isLoading,
    isRefreshing,
    loadPortfolio,
    refresh,
    selectedTimeRange,
    setTimeRange,
  } = usePortfolioStore();
  const { getUnreadCount, loadNotifications } = useNotificationStore();

  // ---- Effects ------------------------------------------------------------
  useEffect(() => {
    loadPortfolio();
    loadNotifications();
  }, []);

  // ---- Handlers -----------------------------------------------------------
  const handleToggleValues = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleValuesHidden();
  }, [toggleValuesHidden]);

  const handleTimeRangePress = useCallback(
    (range: TimeRange) => {
      Haptics.selectionAsync();
      setTimeRange(range);
    },
    [setTimeRange],
  );

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    refresh();
  }, [refresh]);

  // ---- Derived values -----------------------------------------------------
  const unreadCount = getUnreadCount();
  const firstName = user?.name?.split(' ')[0] ?? '';
  const greeting = `${getGreeting()}, ${firstName}`;

  const variation1mVariant =
    (summary?.variation1m ?? 0) >= 0 ? 'positive' : 'negative';
  const variation12mVariant =
    (summary?.variation12m ?? 0) >= 0 ? 'positive' : 'negative';
  const profitColor =
    (summary?.profit ?? 0) >= 0 ? colors.positive : colors.negative;

  // ---- Helpers for value display ------------------------------------------
  const displayValue = (value: number) =>
    valuesHidden ? maskValue('') : formatBRL(value);

  const displayPct = (value: number) =>
    valuesHidden ? '••••' : formatPct(value);

  // ---- Chart data ---------------------------------------------------------
  const chartData = (summary?.history ?? []).map((h) => ({
    label: h.month,
    value: h.value,
  }));

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            progressBackgroundColor={colors.card}
            colors={[colors.accent]}
          />
        }
      >
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                           */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{greeting}</Text>
          </View>

          <TouchableOpacity
            style={styles.bellContainer}
            activeOpacity={0.7}
            accessibilityLabel={`Notificações, ${unreadCount} não lidas`}
          >
            <Text style={styles.bellIcon}>🔔</Text>
            {unreadCount > 0 && (
              <DotBadge
                count={unreadCount}
                style={styles.dotBadge}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* ---------------------------------------------------------------- */}
        {/* Loading skeleton state                                           */}
        {/* ---------------------------------------------------------------- */}
        {isLoading ? (
          <View>
            <SkeletonCard />
            <SkeletonChart />
            <SkeletonCard />
            <SkeletonList count={3} />
          </View>
        ) : (
          <>
            {/* -------------------------------------------------------------- */}
            {/* Hero Card - Patrimonio Total                                    */}
            {/* -------------------------------------------------------------- */}
            {summary && (
              <Card variant="glow" delay={100}>
                <Text style={styles.heroLabel}>Patrimônio total</Text>

                <View style={styles.heroValueRow}>
                  <Text style={styles.heroValue}>
                    {displayValue(summary.totalValue)}
                  </Text>
                  <TouchableOpacity
                    onPress={handleToggleValues}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityLabel={
                      valuesHidden ? 'Mostrar valores' : 'Ocultar valores'
                    }
                  >
                    <Text style={styles.eyeIcon}>
                      {valuesHidden ? '👁‍🗨' : '👁'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.badgeRow}>
                  <Badge
                    value={displayPct(summary.variation1m)}
                    variant={variation1mVariant}
                    size="sm"
                  />
                  <Badge
                    value={displayPct(summary.variation12m)}
                    variant={variation12mVariant}
                    size="sm"
                    style={styles.badgeSpacing}
                  />
                </View>

                <View style={styles.heroDivider} />

                <View style={styles.heroSubRow}>
                  <View style={styles.heroSubItem}>
                    <Text style={styles.heroSubLabel}>Investido</Text>
                    <Text style={styles.heroSubValue}>
                      {displayValue(summary.investedValue)}
                    </Text>
                  </View>
                  <View style={styles.heroSubSeparator} />
                  <View style={styles.heroSubItem}>
                    <Text style={styles.heroSubLabel}>Lucro</Text>
                    <Text
                      style={[
                        styles.heroSubValue,
                        !valuesHidden && { color: profitColor },
                      ]}
                    >
                      {displayValue(summary.profit)}
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Chart Section - Evolucao patrimonial                            */}
            {/* -------------------------------------------------------------- */}
            {summary && chartData.length > 1 && (
              <Card delay={200}>
                <Text style={styles.sectionTitleInCard}>
                  Evolução patrimonial
                </Text>

                {/* Time range pills */}
                <View style={styles.timeRangeRow}>
                  {TIME_RANGES.map((range) => {
                    const isSelected = selectedTimeRange === range;
                    return (
                      <TouchableOpacity
                        key={range}
                        style={[
                          styles.timeRangePill,
                          isSelected && styles.timeRangePillSelected,
                        ]}
                        onPress={() => handleTimeRangePress(range)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.timeRangeText,
                            isSelected && styles.timeRangeTextSelected,
                          ]}
                        >
                          {range}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <LineChart
                  data={chartData}
                  referenceValue={summary.investedValue}
                />
              </Card>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Allocation Section                                              */}
            {/* -------------------------------------------------------------- */}
            {allocations.length > 0 && (
              <Card delay={300}>
                <Text style={styles.sectionTitleInCard}>
                  Alocação por classe
                </Text>
                <AllocationBar allocations={allocations} />
              </Card>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Contas Conectadas                                               */}
            {/* -------------------------------------------------------------- */}
            {institutions.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Contas conectadas</Text>

                {institutions.map((inst, idx) => (
                  <AccountCard
                    key={inst.id}
                    institution={inst}
                    index={idx}
                  />
                ))}

                <TouchableOpacity
                  style={styles.connectButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.connectButtonText}>
                    + Conectar instituição
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Insights                                                        */}
            {/* -------------------------------------------------------------- */}
            {insights.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Insights</Text>

                {insights.map((insight, idx) => {
                  const borderColor =
                    INSIGHT_COLORS[insight.type] ?? colors.accent;

                  return (
                    <View key={insight.id}>
                      <View
                        style={[
                          styles.insightCard,
                          { borderLeftColor: borderColor },
                        ]}
                      >
                        <View style={styles.insightContent}>
                          <Text style={styles.insightIcon}>
                            {insight.icon}
                          </Text>
                          <Text style={styles.insightText}>
                            {insight.text}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.insightAction}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.insightActionText,
                              { color: borderColor },
                            ]}
                          >
                            {insight.action || 'Ver detalhes'} →
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ===========================================================================
// Styles
// ===========================================================================

const styles = StyleSheet.create({
  // -- Layout ---------------------------------------------------------------
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
  },

  // -- Header ---------------------------------------------------------------
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
  },
  bellContainer: {
    position: 'relative',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: {
    fontSize: 22,
  },
  dotBadge: {
    position: 'absolute',
    top: 2,
    right: 0,
  },

  // -- Hero Card ------------------------------------------------------------
  heroLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  heroValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  eyeIcon: {
    fontSize: 22,
    marginLeft: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  badgeSpacing: {
    marginLeft: spacing.sm,
  },
  heroDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  heroSubRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heroSubItem: {
    flex: 1,
  },
  heroSubSeparator: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  heroSubLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  heroSubValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },

  // -- Section titles -------------------------------------------------------
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
    marginTop: spacing.xl,
  },
  sectionTitleInCard: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },

  // -- Time range pills -----------------------------------------------------
  timeRangeRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  timeRangePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  timeRangePillSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  timeRangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  timeRangeTextSelected: {
    color: colors.background,
  },

  // -- Connect institution button -------------------------------------------
  connectButton: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },

  // -- Insight cards --------------------------------------------------------
  insightCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  insightContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  insightIcon: {
    fontSize: 20,
    marginRight: spacing.md,
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  insightAction: {
    alignSelf: 'flex-end',
  },
  insightActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
