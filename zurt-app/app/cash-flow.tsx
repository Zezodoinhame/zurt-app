import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useCashFlowStore } from '../src/stores/cashFlowStore';
import { Card } from '../src/components/ui/Card';
import { AreaChart } from '../src/components/charts/AreaChart';
import { AppIcon } from '../src/hooks/useIcon';
import { SkeletonChart, SkeletonList } from '../src/components/skeletons/Skeleton';
import { formatCurrency, maskValue } from '../src/utils/formatters';

// =============================================================================
// CashFlowScreen
// =============================================================================

export default function CashFlowScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const currency = useSettingsStore((s) => s.currency);
  const { valuesHidden } = useAuthStore();
  const { forecast, isLoading, totalProjectedSavings, loadForecast } = useCashFlowStore();
  const { width: screenWidth } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    loadForecast();
  }, []);

  const displayVal = (v: number) =>
    valuesHidden ? maskValue('', currency) : formatCurrency(v, currency);

  const monthlyAvg = useMemo(() => {
    if (forecast.length === 0) return 0;
    return totalProjectedSavings / forecast.length;
  }, [forecast, totalProjectedSavings]);

  const chartData = useMemo(
    () =>
      forecast.map((m) => ({
        label: m.month,
        income: m.income,
        expenses: m.expenses,
      })),
    [forecast],
  );

  const chartWidth = screenWidth - spacing.xl * 2;

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <AppIcon name="back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('cashFlow.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.scrollContent}>
          <SkeletonChart />
          <SkeletonList count={4} />
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('cashFlow.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Summary Card */}
        <Card variant="glow" delay={100}>
          <Text style={styles.heroLabel}>{t('cashFlow.projectedSavings')}</Text>
          <Text style={styles.heroValue}>{displayVal(totalProjectedSavings)}</Text>
          <View style={styles.avgRow}>
            <Text style={styles.avgLabel}>{t('cashFlow.monthlyAvg')}</Text>
            <Text style={styles.avgValue}>{displayVal(monthlyAvg)}</Text>
          </View>
        </Card>

        {/* Area Chart */}
        <Card delay={200}>
          <Text style={styles.sectionTitle}>{t('cashFlow.forecast')}</Text>
          <AreaChart data={chartData} width={chartWidth} height={200} />

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.positive }]} />
              <Text style={styles.legendText}>{t('cashFlow.income')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.negative }]} />
              <Text style={styles.legendText}>{t('cashFlow.expenses')}</Text>
            </View>
          </View>
        </Card>

        {/* Month-by-month cards */}
        {forecast.map((month, idx) => (
          <Card key={month.date} delay={300 + idx * 60}>
            <Text style={styles.monthLabel}>{month.month}</Text>

            <View style={styles.monthRow}>
              <View style={styles.monthItem}>
                <AppIcon name="trending" size={16} color={colors.positive} />
                <Text style={[styles.monthItemLabel, { color: colors.text.secondary }]}>
                  {t('cashFlow.income')}
                </Text>
              </View>
              <Text style={[styles.monthItemValue, { color: colors.positive }]}>
                {displayVal(month.income)}
              </Text>
            </View>

            <View style={styles.monthRow}>
              <View style={styles.monthItem}>
                <AppIcon name="insights" size={16} color={colors.negative} />
                <Text style={[styles.monthItemLabel, { color: colors.text.secondary }]}>
                  {t('cashFlow.expenses')}
                </Text>
              </View>
              <Text style={[styles.monthItemValue, { color: colors.negative }]}>
                {displayVal(month.expenses)}
              </Text>
            </View>

            <View style={styles.monthDivider} />

            <View style={styles.monthRow}>
              <Text style={styles.netLabel}>{t('cashFlow.net')}</Text>
              <Text
                style={[
                  styles.netValue,
                  { color: month.savings >= 0 ? colors.positive : colors.negative },
                ]}
              >
                {displayVal(month.savings)}
              </Text>
            </View>
          </Card>
        ))}

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>{t('cashFlow.disclaimer')}</Text>
      </ScrollView>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 100,
    },

    // Hero / summary
    heroLabel: {
      fontSize: 14,
      color: colors.text.secondary,
      marginBottom: spacing.xs,
    },
    heroValue: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    avgRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    avgLabel: {
      fontSize: 13,
      color: colors.text.secondary,
    },
    avgValue: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },

    // Section
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.lg,
    },

    // Legend
    legendRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.xl,
      marginTop: spacing.lg,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      fontSize: 12,
      color: colors.text.secondary,
    },

    // Month cards
    monthLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.md,
    },
    monthRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    monthItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    monthItemLabel: {
      fontSize: 13,
    },
    monthItemValue: {
      fontSize: 14,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    monthDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.sm,
    },
    netLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text.primary,
    },
    netValue: {
      fontSize: 16,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },

    // Disclaimer
    disclaimer: {
      fontSize: 11,
      color: colors.text.muted,
      textAlign: 'center',
      marginTop: spacing.lg,
      marginBottom: spacing.xl,
    },
  });
