import React, { useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useSpendingInsightsStore } from '../src/stores/spendingInsightsStore';
import { Header } from '../src/components/shared/Header';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { MiniLineChart } from '../src/components/charts/MiniLineChart';
import { AppIcon } from '../src/hooks/useIcon';
import { SkeletonCard, SkeletonList } from '../src/components/skeletons/Skeleton';
import { formatCurrency, maskValue } from '../src/utils/formatters';
import type { TransactionCategory } from '../src/types';

const CATEGORY_ALL = 'all' as const;
type FilterKey = TransactionCategory | typeof CATEGORY_ALL;

export default function SpendingInsightsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const currency = useSettingsStore((s) => s.currency);
  const { valuesHidden } = useAuthStore();
  const { insights, isLoading, selectedCategory, loadInsights, selectCategory } =
    useSpendingInsightsStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    loadInsights();
  }, []);

  const displayVal = useCallback(
    (v: number) => (valuesHidden ? maskValue('') : formatCurrency(v, currency)),
    [valuesHidden, currency],
  );

  const handleCategoryPress = useCallback(
    (cat: FilterKey) => {
      Haptics.selectionAsync();
      selectCategory(cat === CATEGORY_ALL ? null : cat);
    },
    [selectCategory],
  );

  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <AppIcon name="back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('spendingInsights.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.scrollContent}>
          <SkeletonCard />
          <SkeletonList count={4} />
        </View>
      </View>
    );
  }

  if (!insights) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <AppIcon name="back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('spendingInsights.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 60 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>{'\uD83D\uDCA1'}</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, textAlign: 'center', marginBottom: 8 }}>Insights de Gastos</Text>
          <Text style={{ fontSize: 14, color: colors.text.secondary, textAlign: 'center', lineHeight: 20 }}>
            Conecte seu banco para visualizar insights de gastos.
          </Text>
        </View>
      </View>
    );
  }

  const {
    avgDailySpend,
    savingsRate,
    biggestExpense,
    spendingVelocity,
    totalThisMonth,
    totalLastMonth,
    categoryTrends,
    topMerchants,
  } = insights;

  const monthChange =
    totalLastMonth > 0
      ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100
      : 0;

  const filteredTrends = selectedCategory
    ? categoryTrends.filter((ct) => ct.category === selectedCategory)
    : categoryTrends;

  const categoryPills: { key: FilterKey; label: string }[] = [
    { key: CATEGORY_ALL, label: t('spendingInsights.all') },
    ...categoryTrends.map((ct) => ({ key: ct.category as FilterKey, label: ct.label })),
  ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('spendingInsights.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* KPI Cards Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpiRow}
        >
          {/* Avg daily spend */}
          <View style={styles.kpiCard}>
            <AppIcon name="wallet" size={16} color={colors.accent} />
            <Text style={styles.kpiValue}>{displayVal(avgDailySpend)}</Text>
            <Text style={styles.kpiLabel}>/dia</Text>
          </View>

          {/* Savings rate */}
          <View style={styles.kpiCard}>
            <AppIcon name="savings" size={16} color={colors.positive} />
            <Text style={styles.kpiValue}>
              {valuesHidden ? '***' : `${savingsRate.toFixed(1)}%`}
            </Text>
            <Text style={styles.kpiLabel}>{t('spendingInsights.savings')}</Text>
          </View>

          {/* Biggest expense */}
          <View style={styles.kpiCard}>
            <AppIcon name="alert" size={16} color={colors.warning} />
            <Text style={styles.kpiValue} numberOfLines={1}>
              {displayVal(biggestExpense.amount)}
            </Text>
            <Text style={styles.kpiLabel} numberOfLines={1}>
              {biggestExpense.description}
            </Text>
          </View>

          {/* Velocity */}
          <View style={styles.kpiCard}>
            <AppIcon
              name="trending"
              size={16}
              color={spendingVelocity > 100 ? colors.negative : colors.positive}
            />
            <Text
              style={[
                styles.kpiValue,
                { color: spendingVelocity > 100 ? colors.negative : colors.positive },
              ]}
            >
              {valuesHidden ? '***' : `${spendingVelocity}%`}
            </Text>
            <Text style={styles.kpiLabel}>
              {spendingVelocity > 100
                ? t('spendingInsights.faster')
                : t('spendingInsights.slower')}
            </Text>
          </View>
        </ScrollView>

        {/* Month Comparison */}
        <Card delay={100}>
          <Text style={styles.sectionTitle}>{t('spendingInsights.monthComparison')}</Text>
          <View style={styles.compRow}>
            <View style={styles.compItem}>
              <Text style={styles.compLabel}>{t('spendingInsights.thisMonth')}</Text>
              <Text style={styles.compValue}>{displayVal(totalThisMonth)}</Text>
            </View>
            <View style={styles.compItem}>
              <Text style={styles.compLabel}>{t('spendingInsights.lastMonth')}</Text>
              <Text style={styles.compValue}>{displayVal(totalLastMonth)}</Text>
            </View>
          </View>
          <View style={styles.compBadgeRow}>
            <Badge
              value={`${monthChange >= 0 ? '+' : ''}${monthChange.toFixed(1)}%`}
              variant={monthChange > 0 ? 'negative' : 'positive'}
              size="sm"
            />
          </View>
        </Card>

        {/* Category Trends */}
        <Card delay={200}>
          <Text style={styles.sectionTitle}>{t('spendingInsights.categoryTrends')}</Text>

          {/* Category filter pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {categoryPills.map((pill) => {
              const isSelected =
                pill.key === CATEGORY_ALL
                  ? selectedCategory === null
                  : selectedCategory === pill.key;
              return (
                <TouchableOpacity
                  key={pill.key}
                  style={[styles.filterPill, isSelected && styles.filterPillSelected]}
                  onPress={() => handleCategoryPress(pill.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>
                    {pill.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Category trend rows */}
          {filteredTrends.map((ct) => {
            const amounts = ct.months.map((m) => m.amount);
            const latestAmount = amounts[amounts.length - 1] ?? 0;
            return (
              <View key={ct.category} style={styles.trendRow}>
                <View style={[styles.trendDot, { backgroundColor: ct.color }]} />
                <Text style={styles.trendLabel} numberOfLines={1}>
                  {ct.label}
                </Text>
                <View style={styles.trendChart}>
                  <MiniLineChart data={amounts} width={80} height={24} color={ct.color} />
                </View>
                <Text style={styles.trendAmount}>{displayVal(latestAmount)}</Text>
              </View>
            );
          })}
        </Card>

        {/* Top Merchants */}
        <Card delay={300}>
          <Text style={styles.sectionTitle}>{t('spendingInsights.topMerchants')}</Text>
          {topMerchants.slice(0, 5).map((merchant, idx) => (
            <View key={merchant.name} style={styles.merchantRow}>
              <Text style={styles.merchantRank}>{idx + 1}</Text>
              <View style={styles.merchantInfo}>
                <Text style={styles.merchantName} numberOfLines={1}>
                  {merchant.name}
                </Text>
                <Text style={styles.merchantTotal}>{displayVal(merchant.total)}</Text>
              </View>
              <Badge
                value={`${merchant.count}x`}
                variant="neutral"
                size="sm"
              />
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
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

    // KPI Cards
    kpiRow: {
      gap: spacing.sm,
      paddingBottom: spacing.lg,
    },
    kpiCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      minWidth: 130,
      gap: spacing.xs,
    },
    kpiValue: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    kpiLabel: {
      fontSize: 11,
      color: colors.text.muted,
    },

    // Month Comparison
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.lg,
    },
    compRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    compItem: { flex: 1 },
    compLabel: {
      fontSize: 12,
      color: colors.text.secondary,
      marginBottom: spacing.xs,
    },
    compValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    compBadgeRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.md,
    },

    // Category Filter Pills
    filterRow: {
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    filterPill: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterPillSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    filterText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    filterTextSelected: {
      color: colors.background,
    },

    // Category Trend Rows
    trendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border + '40',
    },
    trendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: spacing.sm,
    },
    trendLabel: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.primary,
    },
    trendChart: {
      marginHorizontal: spacing.sm,
    },
    trendAmount: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
      minWidth: 80,
      textAlign: 'right',
    },

    // Top Merchants
    merchantRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border + '40',
    },
    merchantRank: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text.muted,
      width: 24,
      fontVariant: ['tabular-nums'],
    },
    merchantInfo: {
      flex: 1,
      marginRight: spacing.sm,
    },
    merchantName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
    },
    merchantTotal: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text.secondary,
      fontVariant: ['tabular-nums'],
      marginTop: 2,
    },
  });
