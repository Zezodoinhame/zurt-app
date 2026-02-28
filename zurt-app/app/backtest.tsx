import React, { useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useBacktestStore } from '../src/stores/backtestStore';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { LineChart } from '../src/components/charts/LineChart';
import { AppIcon } from '../src/hooks/useIcon';
import { formatCurrency, maskValue } from '../src/utils/formatters';

const PERIODS = [
  { key: '1y' as const, label: 'backtest.1y' },
  { key: '3y' as const, label: 'backtest.3y' },
  { key: '5y' as const, label: 'backtest.5y' },
  { key: '10y' as const, label: 'backtest.10y' },
];

// ===========================================================================
// BacktestScreen
// ===========================================================================

export default function BacktestScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const { valuesHidden, isDemoMode } = useAuthStore();

  const {
    allocations, period, result, isRunning,
    updateAllocation, setPeriod, runBacktest,
  } = useBacktestStore();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const displayValue = (value: number) =>
    valuesHidden ? maskValue('') : formatCurrency(value, currency);

  const totalPct = allocations.reduce((s, a) => s + a.percentage, 0);
  const isValid = totalPct === 100;

  const handleRun = useCallback(() => {
    if (!isValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    runBacktest();
  }, [isValid, runBacktest]);

  // Chart data
  const chartData = useMemo(() => {
    if (!result) return [];
    return result.periodReturns.map((pr) => ({
      label: pr.date.slice(5), // 'MM'
      value: pr.value,
    }));
  }, [result]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('backtest.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {!isDemoMode && (
        <View style={{ backgroundColor: colors.elevated, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, marginHorizontal: spacing.xl, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ fontSize: 13, color: colors.text.secondary }}>{'\uD83D\uDD1C'} {t('common.featureInDevelopment')}</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Allocation sliders */}
        <Card delay={0}>
          <Text style={styles.sectionTitle}>{t('backtest.allocation')}</Text>
          {allocations.map((a) => (
            <View key={a.ticker} style={styles.allocRow}>
              <View style={[styles.allocDot, { backgroundColor: a.color }]} />
              <Text style={styles.allocTicker}>{a.ticker}</Text>
              <View style={styles.allocSlider}>
                <View
                  style={[styles.allocFill, { width: `${a.percentage}%`, backgroundColor: a.color }]}
                />
              </View>
              <View style={styles.allocPctButtons}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    updateAllocation(a.ticker, Math.max(0, a.percentage - 5));
                  }}
                  style={styles.allocBtn}
                >
                  <Text style={styles.allocBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.allocPct}>{a.percentage}%</Text>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    updateAllocation(a.ticker, Math.min(100, a.percentage + 5));
                  }}
                  style={styles.allocBtn}
                >
                  <Text style={styles.allocBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={[styles.totalText, { color: isValid ? colors.positive : colors.negative }]}>
              Total: {totalPct}%
            </Text>
            {!isValid && (
              <Text style={styles.totalWarning}>{t('backtest.allocationSum')}</Text>
            )}
          </View>
        </Card>

        {/* Period selector */}
        <Card delay={100}>
          <Text style={styles.sectionTitle}>{t('backtest.period')}</Text>
          <View style={styles.periodRow}>
            {PERIODS.map((p) => {
              const isActive = period === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.periodPill, isActive && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPeriod(p.key);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.periodPillText, isActive && { color: colors.background, fontWeight: '700' }]}>
                    {t(p.label)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Run button */}
        <TouchableOpacity
          style={[styles.runButton, { backgroundColor: isValid ? colors.accent : colors.border }]}
          onPress={handleRun}
          activeOpacity={0.7}
          disabled={!isValid || isRunning}
        >
          {isRunning ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Text style={[styles.runButtonText, { color: isValid ? colors.background : colors.text.muted }]}>
              {t('backtest.run')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Results */}
        {result && !isRunning && (
          <>
            {/* KPI row */}
            <Card variant="glow" delay={200}>
              <Text style={styles.sectionTitle}>{t('backtest.results')}</Text>
              <View style={styles.kpiGrid}>
                <View style={styles.kpiItem}>
                  <Text style={styles.kpiLabel}>{t('backtest.totalReturn')}</Text>
                  <Text style={[styles.kpiValue, { color: result.totalReturn >= 0 ? colors.positive : colors.negative }]}>
                    {valuesHidden ? '••••' : `${result.totalReturn >= 0 ? '+' : ''}${result.totalReturn.toFixed(1)}%`}
                  </Text>
                </View>
                <View style={styles.kpiItem}>
                  <Text style={styles.kpiLabel}>{t('backtest.cagr')}</Text>
                  <Text style={[styles.kpiValue, { color: colors.accent }]}>
                    {valuesHidden ? '••••' : `${result.cagr.toFixed(1)}%`}
                  </Text>
                </View>
                <View style={styles.kpiItem}>
                  <Text style={styles.kpiLabel}>{t('backtest.maxDrawdown')}</Text>
                  <Text style={[styles.kpiValue, { color: colors.negative }]}>
                    {valuesHidden ? '••••' : `${result.maxDrawdown.toFixed(1)}%`}
                  </Text>
                </View>
                <View style={styles.kpiItem}>
                  <Text style={styles.kpiLabel}>{t('backtest.sharpe')}</Text>
                  <Text style={styles.kpiValue}>
                    {valuesHidden ? '••••' : result.sharpe.toFixed(2)}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Portfolio value chart */}
            <Card delay={300}>
              <Text style={styles.sectionTitle}>{t('backtest.portfolio')}</Text>
              <LineChart data={chartData} referenceValue={result.initialValue} />
            </Card>

            {/* Best/worst months */}
            <Card delay={400}>
              <Text style={styles.sectionTitle}>{t('backtest.monthlyReturns')}</Text>
              <View style={styles.monthRow}>
                <View style={styles.monthItem}>
                  <Text style={styles.monthLabel}>{t('backtest.bestMonth')}</Text>
                  <Text style={[styles.monthDate, { color: colors.text.muted }]}>{result.bestMonth.date}</Text>
                  <Badge
                    value={`+${result.bestMonth.returnPct.toFixed(1)}%`}
                    variant="positive"
                    size="sm"
                  />
                </View>
                <View style={styles.monthItem}>
                  <Text style={styles.monthLabel}>{t('backtest.worstMonth')}</Text>
                  <Text style={[styles.monthDate, { color: colors.text.muted }]}>{result.worstMonth.date}</Text>
                  <Badge
                    value={`${result.worstMonth.returnPct.toFixed(1)}%`}
                    variant="negative"
                    size="sm"
                  />
                </View>
              </View>

              <View style={styles.valueSummary}>
                <View style={styles.valueItem}>
                  <Text style={styles.valueLabel}>{t('backtest.initialValue')}</Text>
                  <Text style={styles.valueAmount}>{displayValue(result.initialValue)}</Text>
                </View>
                <View style={styles.valueItem}>
                  <Text style={styles.valueLabel}>{t('backtest.finalValue')}</Text>
                  <Text style={[styles.valueAmount, { color: colors.positive }]}>
                    {displayValue(result.finalValue)}
                  </Text>
                </View>
              </View>
            </Card>
          </>
        )}

        {/* Empty state */}
        {!result && !isRunning && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{'\u23F0'}</Text>
            <Text style={styles.emptyText}>{t('backtest.empty')}</Text>
            <Text style={styles.emptyDesc}>{t('backtest.configureDesc')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ===========================================================================
// Styles
// ===========================================================================

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
    scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: 100 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.md },

    // Allocation
    allocRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
    allocDot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm },
    allocTicker: { width: 56, fontSize: 13, fontWeight: '600', color: colors.text.primary },
    allocSlider: {
      flex: 1, height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden', marginHorizontal: spacing.sm,
    },
    allocFill: { height: 8, borderRadius: 4 },
    allocPctButtons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    allocBtn: {
      width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    allocBtnText: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
    allocPct: { width: 36, textAlign: 'center', fontSize: 13, fontWeight: '700', color: colors.text.primary, fontVariant: ['tabular-nums'] },
    totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
    totalText: { fontSize: 14, fontWeight: '700' },
    totalWarning: { fontSize: 12, color: colors.negative },

    // Period
    periodRow: { flexDirection: 'row', gap: spacing.sm },
    periodPill: {
      paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2, borderRadius: radius.full,
      borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    },
    periodPillText: { fontSize: 13, color: colors.text.secondary, fontWeight: '500' },

    // Run button
    runButton: {
      paddingVertical: spacing.lg, borderRadius: radius.md, alignItems: 'center',
      marginVertical: spacing.lg,
    },
    runButtonText: { fontSize: 16, fontWeight: '700' },

    // KPI
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    kpiItem: { width: '46%' },
    kpiLabel: { fontSize: 12, color: colors.text.muted, marginBottom: 2 },
    kpiValue: { fontSize: 20, fontWeight: '700', color: colors.text.primary, fontVariant: ['tabular-nums'] },

    // Month
    monthRow: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.lg },
    monthItem: { flex: 1, gap: spacing.xs },
    monthLabel: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
    monthDate: { fontSize: 12 },

    // Value summary
    valueSummary: { flexDirection: 'row', gap: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
    valueItem: { flex: 1 },
    valueLabel: { fontSize: 12, color: colors.text.muted, marginBottom: 2 },
    valueAmount: { fontSize: 16, fontWeight: '700', color: colors.text.primary, fontVariant: ['tabular-nums'] },

    // Empty
    emptyState: { alignItems: 'center', paddingVertical: spacing.xxxl },
    emptyEmoji: { fontSize: 56, marginBottom: spacing.lg },
    emptyText: { fontSize: 16, fontWeight: '600', color: colors.text.secondary, marginBottom: spacing.sm },
    emptyDesc: { fontSize: 13, color: colors.text.muted },
  });
