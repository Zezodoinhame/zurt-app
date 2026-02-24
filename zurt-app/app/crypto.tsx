import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useCryptoStore } from '../src/stores/cryptoStore';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { GaugeChart } from '../src/components/charts/GaugeChart';
import { MiniLineChart } from '../src/components/charts/MiniLineChart';
import { AppIcon } from '../src/hooks/useIcon';
import { SkeletonList } from '../src/components/skeletons/Skeleton';
import { formatCurrency, formatPct, maskValue } from '../src/utils/formatters';

// =============================================================================
// Dominance Colors
// =============================================================================

const DOMINANCE_FALLBACK_COLORS = ['#F7931A', '#627EEA', '#14F195', '#E84142', '#2775CA', '#26A17B'];

// =============================================================================
// CryptoScreen
// =============================================================================

export default function CryptoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const { valuesHidden } = useAuthStore();

  const {
    portfolio,
    isLoading,
    loadCrypto,
    fetchMarketData,
    getDominance,
  } = useCryptoStore();

  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => { loadCrypto(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCrypto();
    setRefreshing(false);
  }, [loadCrypto]);

  const displayVal = useCallback(
    (v: number) => (valuesHidden ? maskValue('', currency) : formatCurrency(v, currency)),
    [valuesHidden, currency],
  );

  const dominance = useMemo(() => getDominance(), [portfolio]);

  const fearGreedScore = portfolio.fearGreedIndex ?? 50;
  const fearGreedLabel = useMemo(() => {
    if (fearGreedScore < 30) return t('crypto.fear');
    if (fearGreedScore > 70) return t('crypto.greed');
    return t('crypto.neutral');
  }, [fearGreedScore, t]);

  // =========================================================================
  // Loading
  // =========================================================================

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <AppIcon name="back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('crypto.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <SkeletonList />
      </View>
    );
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('crypto.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} colors={[accentColor]} />
        }
      >
        {/* Hero Card */}
        <Card variant="glow">
          <Text style={styles.heroLabel}>{t('crypto.totalValue')}</Text>
          <Text style={styles.heroValue}>{displayVal(portfolio.totalValue)}</Text>

          {/* 24h / 7d / 30d Badges */}
          <View style={styles.badgeRow}>
            <Badge
              value={formatPct(portfolio.change24h)}
              variant={portfolio.change24h >= 0 ? 'positive' : 'negative'}
              size="sm"
            />
            <Badge
              value={formatPct(portfolio.change7d)}
              variant={portfolio.change7d >= 0 ? 'positive' : 'negative'}
              size="sm"
            />
            <Badge
              value={formatPct(portfolio.change30d)}
              variant={portfolio.change30d >= 0 ? 'positive' : 'negative'}
              size="sm"
            />
          </View>

          {/* Invested + Profit Row */}
          <View style={styles.heroRow}>
            <View style={styles.heroItem}>
              <Text style={styles.heroItemLabel}>{t('crypto.invested')}</Text>
              <Text style={styles.heroItemValue}>{displayVal(portfolio.totalInvested)}</Text>
            </View>
            <View style={styles.heroItem}>
              <Text style={styles.heroItemLabel}>{t('crypto.profit')}</Text>
              <Text style={[styles.heroItemValue, { color: portfolio.totalProfit >= 0 ? colors.positive : colors.negative }]}>
                {displayVal(portfolio.totalProfit)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Fear & Greed Card */}
        <Card style={styles.fearGreedCard}>
          <Text style={styles.sectionTitle}>{t('crypto.fearGreed')}</Text>
          <View style={styles.gaugeContainer}>
            <GaugeChart score={fearGreedScore} size={160} label={fearGreedLabel} />
          </View>
          <Text style={styles.fearGreedSubtext}>
            {fearGreedLabel} ({fearGreedScore}/100)
          </Text>
        </Card>

        {/* Dominance Section */}
        <Text style={styles.sectionTitle}>{t('crypto.dominance')}</Text>
        <Card style={styles.dominanceCard}>
          {/* Horizontal stacked bar */}
          <View style={styles.dominanceBar}>
            {dominance.map((d, i) => (
              <View
                key={d.symbol}
                style={[
                  styles.dominanceSegment,
                  {
                    width: `${d.percentage}%`,
                    backgroundColor: d.color || DOMINANCE_FALLBACK_COLORS[i % DOMINANCE_FALLBACK_COLORS.length],
                    borderTopLeftRadius: i === 0 ? radius.sm : 0,
                    borderBottomLeftRadius: i === 0 ? radius.sm : 0,
                    borderTopRightRadius: i === dominance.length - 1 ? radius.sm : 0,
                    borderBottomRightRadius: i === dominance.length - 1 ? radius.sm : 0,
                  },
                ]}
              />
            ))}
          </View>
          {/* Legend */}
          <View style={styles.dominanceLegend}>
            {dominance.map((d, i) => (
              <View key={d.symbol} style={styles.dominanceLegendItem}>
                <View style={[styles.dominanceDot, { backgroundColor: d.color || DOMINANCE_FALLBACK_COLORS[i % DOMINANCE_FALLBACK_COLORS.length] }]} />
                <Text style={styles.dominanceLegendText}>{d.symbol}</Text>
                <Text style={styles.dominanceLegendPct}>{d.percentage}%</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Holdings List */}
        <Text style={styles.sectionTitle}>{t('crypto.holdings')}</Text>
        {portfolio.holdings.map((holding, index) => {
          const isPositive = holding.change24h >= 0;
          const changeText = formatPct(holding.change24h);

          return (
            <Card key={holding.id} delay={index * 60}>
              <View style={styles.holdingRow}>
                {/* Left: icon + symbol + name */}
                <View style={styles.holdingLeft}>
                  <Text style={styles.holdingIcon}>{holding.icon}</Text>
                  <View style={styles.holdingInfo}>
                    <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
                    <Text style={styles.holdingName} numberOfLines={1}>{holding.name}</Text>
                  </View>
                </View>

                {/* Center: sparkline */}
                <View style={styles.holdingChart}>
                  <MiniLineChart
                    data={holding.sparkline}
                    width={60}
                    height={24}
                    color={isPositive ? colors.positive : colors.negative}
                  />
                </View>

                {/* Right: value + change badge */}
                <View style={styles.holdingRight}>
                  <Text style={styles.holdingValue}>{displayVal(holding.currentValue)}</Text>
                  <Badge
                    value={changeText}
                    variant={isPositive ? 'positive' : 'negative'}
                    size="sm"
                  />
                </View>
              </View>
            </Card>
          );
        })}

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
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
      fontSize: 20,
      fontWeight: '700',
      color: colors.text.primary,
    },
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 100,
      gap: spacing.md,
    },

    // Hero Card
    heroLabel: {
      color: colors.text.muted,
      fontSize: 13,
      marginBottom: 4,
    },
    heroValue: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
      marginBottom: spacing.sm,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    heroRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.md,
    },
    heroItem: {
      flex: 1,
    },
    heroItemLabel: {
      color: colors.text.muted,
      fontSize: 12,
      marginBottom: 2,
    },
    heroItemValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },

    // Fear & Greed
    fearGreedCard: {
      alignItems: 'center' as const,
    },
    gaugeContainer: {
      alignItems: 'center',
      marginVertical: spacing.md,
    },
    fearGreedSubtext: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.secondary,
      marginTop: spacing.xs,
    },

    // Section
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text.primary,
    },

    // Dominance
    dominanceCard: {
      padding: spacing.md,
    },
    dominanceBar: {
      flexDirection: 'row',
      height: 12,
      borderRadius: radius.sm,
      overflow: 'hidden',
      marginBottom: spacing.md,
    },
    dominanceSegment: {
      height: 12,
    },
    dominanceLegend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    dominanceLegendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    dominanceDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    dominanceLegendText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.primary,
    },
    dominanceLegendPct: {
      fontSize: 12,
      color: colors.text.muted,
      fontVariant: ['tabular-nums'],
    },

    // Holdings
    holdingRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    holdingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: spacing.sm,
    },
    holdingIcon: {
      fontSize: 28,
    },
    holdingInfo: {
      flex: 1,
    },
    holdingSymbol: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text.primary,
    },
    holdingName: {
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 2,
    },
    holdingChart: {
      marginHorizontal: spacing.sm,
    },
    holdingRight: {
      alignItems: 'flex-end',
    },
    holdingValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
      marginBottom: 4,
    },
  });
}
