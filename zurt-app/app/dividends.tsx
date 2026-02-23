// =============================================================================
// ZURT Wealth Intelligence - Dividend Calendar Screen
// Monthly dividend calendar with event details and income summary
// =============================================================================

import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useDividendStore } from '../src/stores/dividendStore';
import { Header } from '../src/components/shared/Header';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { AppIcon } from '../src/hooks/useIcon';
import { SkeletonList, SkeletonCard } from '../src/components/skeletons/Skeleton';
import type { DividendEvent } from '../src/types';

// =============================================================================
// Helpers
// =============================================================================

const MONTH_LABELS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });

const fmtShort = (v: number) =>
  v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const DIVIDEND_TYPE_CONFIG: Record<string, { label: string; variant: 'positive' | 'info' | 'warning' }> = {
  dividend: { label: 'Dividendo', variant: 'positive' },
  jcp: { label: 'JCP', variant: 'info' },
  rendimento: { label: 'Rendimento', variant: 'warning' },
};

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// =============================================================================
// Main Screen Component
// =============================================================================

export default function DividendsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const { valuesHidden } = useAuthStore();
  const {
    months,
    selectedMonth,
    isLoading,
    totalAnnualIncome,
    loadDividends,
    selectMonth,
  } = useDividendStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    loadDividends();
  }, []);

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const monthlyAverage = useMemo(() => {
    if (months.length === 0) return 0;
    return totalAnnualIncome / months.length;
  }, [months, totalAnnualIncome]);

  const maxMonthIncome = useMemo(() => {
    return Math.max(...months.map((m) => m.totalIncome), 1);
  }, [months]);

  const selectedMonthData = useMemo(() => {
    if (!selectedMonth) return null;
    return months.find((m) => m.date === selectedMonth) ?? null;
  }, [months, selectedMonth]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [router]);

  const handleMonthPress = useCallback(
    (date: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      selectMonth(selectedMonth === date ? null : date);
    },
    [selectedMonth, selectMonth],
  );

  // ---------------------------------------------------------------------------
  // Display helpers
  // ---------------------------------------------------------------------------

  const displayVal = (v: number) => (valuesHidden ? 'R$ \u2022\u2022\u2022\u2022\u2022' : fmt(v));
  const displayValShort = (v: number) => (valuesHidden ? '\u2022\u2022\u2022' : fmtShort(v));

  // ---------------------------------------------------------------------------
  // Render event row
  // ---------------------------------------------------------------------------

  const renderEventItem = useCallback(
    ({ item }: { item: DividendEvent }) => {
      const typeConfig = DIVIDEND_TYPE_CONFIG[item.type] ?? DIVIDEND_TYPE_CONFIG.dividend;

      return (
        <View style={styles.eventRow}>
          <View style={styles.eventLeft}>
            <Text style={styles.eventTicker}>{item.ticker}</Text>
            <Text style={styles.eventName} numberOfLines={1}>
              {item.assetName}
            </Text>
            <Badge value={typeConfig.label} variant={typeConfig.variant} size="sm" />
          </View>
          <View style={styles.eventRight}>
            <Text style={styles.eventTotal}>{displayVal(item.totalAmount)}</Text>
            <Text style={styles.eventPerShare}>
              {displayValShort(item.amountPerShare)} / {t('dividends.share')}
            </Text>
            <View style={styles.eventDatesRow}>
              <Text style={styles.eventDateLabel}>
                Ex: {formatEventDate(item.exDate)}
              </Text>
              <Text style={styles.eventDateLabel}>
                Pgto: {formatEventDate(item.paymentDate)}
              </Text>
            </View>
          </View>
        </View>
      );
    },
    [styles, valuesHidden, t],
  );

  const keyExtractor = useCallback((item: DividendEvent) => item.id, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <AppIcon name="back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('dividends.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.scrollContent}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonList count={3} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('dividends.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Summary Card */}
        <Card variant="glow" delay={100}>
          <Text style={styles.summaryLabel}>{t('dividends.annualIncome')}</Text>
          <Text style={styles.summaryHero}>{displayVal(totalAnnualIncome)}</Text>
          <View style={styles.summarySubRow}>
            <Text style={styles.summarySubLabel}>{t('dividends.monthlyAverage')}</Text>
            <Text style={styles.summarySubValue}>{displayVal(monthlyAverage)}</Text>
          </View>
        </Card>

        {/* Calendar Grid */}
        <Card delay={200}>
          <Text style={styles.sectionTitle}>{t('dividends.calendar')}</Text>
          <View style={styles.calendarGrid}>
            {MONTH_LABELS.map((label, idx) => {
              const monthDate = `2026-${String(idx + 1).padStart(2, '0')}`;
              const monthData = months.find((m) => m.date === monthDate);
              const income = monthData?.totalIncome ?? 0;
              const eventCount = monthData?.events.length ?? 0;
              const isSelected = selectedMonth === monthDate;
              const intensity = Math.min(income / maxMonthIncome, 1);
              const bgOpacity = Math.round(8 + intensity * 32)
                .toString(16)
                .padStart(2, '0');

              return (
                <TouchableOpacity
                  key={monthDate}
                  style={[
                    styles.calendarCell,
                    { backgroundColor: colors.accent + bgOpacity },
                    isSelected && styles.calendarCellSelected,
                  ]}
                  onPress={() => handleMonthPress(monthDate)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.calendarMonth,
                      isSelected && styles.calendarMonthSelected,
                    ]}
                  >
                    {label}
                  </Text>
                  <Text
                    style={[
                      styles.calendarIncome,
                      isSelected && styles.calendarIncomeSelected,
                    ]}
                  >
                    {displayValShort(income)}
                  </Text>
                  <Text
                    style={[
                      styles.calendarEvents,
                      isSelected && styles.calendarEventsSelected,
                    ]}
                  >
                    {eventCount} {eventCount === 1 ? t('dividends.event') : t('dividends.events')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Selected Month Events */}
        {selectedMonth && (
          <Card delay={300}>
            <Text style={styles.sectionTitle}>
              {selectedMonthData
                ? `${selectedMonthData.month} — ${displayVal(selectedMonthData.totalIncome)}`
                : selectedMonth}
            </Text>

            {selectedMonthData && selectedMonthData.events.length > 0 ? (
              <FlatList
                data={selectedMonthData.events}
                keyExtractor={keyExtractor}
                renderItem={renderEventItem}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.eventSeparator} />}
              />
            ) : (
              <Text style={styles.noEventsText}>{t('dividends.noEvents')}</Text>
            )}
          </Card>
        )}

        {/* Bottom spacing */}
        <View style={{ height: insets.bottom + 40 }} />
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

    // Header
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

    // Scroll
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 100,
    },

    // Summary Card
    summaryLabel: {
      fontSize: 14,
      color: colors.text.secondary,
      marginBottom: spacing.xs,
    },
    summaryHero: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.accent,
      fontVariant: ['tabular-nums'],
    },
    summarySubRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    summarySubLabel: {
      fontSize: 13,
      color: colors.text.secondary,
    },
    summarySubValue: {
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

    // Calendar Grid
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    calendarCell: {
      width: '31%' as any,
      flexGrow: 1,
      flexBasis: '30%' as any,
      borderRadius: radius.md,
      padding: spacing.md,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    calendarCellSelected: {
      borderColor: colors.accent,
    },
    calendarMonth: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
    calendarMonthSelected: {
      color: colors.accent,
    },
    calendarIncome: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text.secondary,
      fontVariant: ['tabular-nums'],
      marginBottom: 2,
    },
    calendarIncomeSelected: {
      color: colors.accent,
    },
    calendarEvents: {
      fontSize: 10,
      color: colors.text.muted,
    },
    calendarEventsSelected: {
      color: colors.accent,
    },

    // Event List
    eventRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
    },
    eventLeft: {
      flex: 1,
      gap: spacing.xs,
    },
    eventRight: {
      alignItems: 'flex-end',
      gap: spacing.xs,
    },
    eventTicker: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text.primary,
    },
    eventName: {
      fontSize: 12,
      color: colors.text.secondary,
      maxWidth: 160,
    },
    eventTotal: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.accent,
      fontVariant: ['tabular-nums'],
    },
    eventPerShare: {
      fontSize: 11,
      color: colors.text.secondary,
      fontVariant: ['tabular-nums'],
    },
    eventDatesRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    eventDateLabel: {
      fontSize: 10,
      color: colors.text.muted,
    },
    eventSeparator: {
      height: 1,
      backgroundColor: colors.border,
    },

    // No events
    noEventsText: {
      fontSize: 14,
      color: colors.text.muted,
      textAlign: 'center',
      paddingVertical: spacing.xxl,
    },
  });
