import React, { useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useTaxStore } from '../src/stores/taxStore';
import { Card } from '../src/components/ui/Card';
import { DarfCalendar } from '../src/components/charts/DarfCalendar';
import { AppIcon } from '../src/hooks/useIcon';
import { formatCurrency, maskValue } from '../src/utils/formatters';

const YEAR_OPTIONS = [2024, 2025, 2026];

export default function TaxDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const currency = useSettingsStore((s) => s.currency);
  const { valuesHidden } = useAuthStore();
  const { summary, selectedYear, loadTaxSummary, setSelectedYear } = useTaxStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    loadTaxSummary();
  }, []);

  const displayVal = (v: number) => (valuesHidden ? maskValue('') : formatCurrency(v, currency));

  const handleYearPress = useCallback((year: number) => {
    Haptics.selectionAsync();
    setSelectedYear(year);
  }, [setSelectedYear]);

  if (!summary) return null;

  const totalBar = summary.exemptAmount + summary.taxableAmount;
  const exemptPct = totalBar > 0 ? (summary.exemptAmount / totalBar) * 100 : 0;
  const taxablePct = totalBar > 0 ? (summary.taxableAmount / totalBar) * 100 : 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('taxDashboard.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Year pills */}
        <View style={styles.yearRow}>
          {YEAR_OPTIONS.map((year) => {
            const isSelected = selectedYear === year;
            return (
              <TouchableOpacity
                key={year}
                style={[styles.yearPill, isSelected && styles.yearPillSelected]}
                onPress={() => handleYearPress(year)}
                activeOpacity={0.7}
              >
                <Text style={[styles.yearText, isSelected && styles.yearTextSelected]}>
                  {year}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Estimated IR Hero */}
        <Card variant="glow" delay={100}>
          <Text style={styles.heroLabel}>{t('taxDashboard.estimatedIR')}</Text>
          <Text style={styles.heroValue}>{displayVal(summary.estimatedIR)}</Text>
          <Text style={styles.heroSub}>{t('taxDashboard.forYear')} {selectedYear}</Text>
        </Card>

        {/* DARF Calendar */}
        <Card delay={200}>
          <Text style={styles.sectionTitle}>{t('taxDashboard.darfCalendar')}</Text>
          <DarfCalendar darfs={summary.darfs} />
        </Card>

        {/* YTD Capital Gains */}
        <Card delay={300}>
          <Text style={styles.sectionTitle}>{t('taxDashboard.capitalGains')}</Text>
          <View style={styles.gainsRow}>
            <View style={styles.gainItem}>
              <Text style={[styles.gainLabel, { color: colors.text.secondary }]}>{t('taxDashboard.gains')}</Text>
              <Text style={[styles.gainValue, { color: colors.positive }]}>{displayVal(summary.totalGains)}</Text>
            </View>
            <View style={styles.gainItem}>
              <Text style={[styles.gainLabel, { color: colors.text.secondary }]}>{t('taxDashboard.losses')}</Text>
              <Text style={[styles.gainValue, { color: colors.negative }]}>{displayVal(summary.totalLosses)}</Text>
            </View>
          </View>
          <View style={styles.netRow}>
            <Text style={styles.netLabel}>{t('taxDashboard.net')}</Text>
            <Text style={[styles.netValue, { color: summary.netGains >= 0 ? colors.positive : colors.negative }]}>
              {displayVal(summary.netGains)}
            </Text>
          </View>
        </Card>

        {/* Exempt vs Taxable */}
        <Card delay={400}>
          <Text style={styles.sectionTitle}>{t('taxDashboard.exemptVsTaxable')}</Text>
          <View style={styles.segmentBar}>
            <View style={[styles.segmentExempt, { width: `${exemptPct}%`, backgroundColor: colors.positive }]} />
            <View style={[styles.segmentTaxable, { width: `${taxablePct}%`, backgroundColor: colors.warning }]} />
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.positive }]} />
              <Text style={[styles.legendText, { color: colors.text.secondary }]}>
                {t('taxDashboard.exempt')} — {displayVal(summary.exemptAmount)}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
              <Text style={[styles.legendText, { color: colors.text.secondary }]}>
                {t('taxDashboard.taxable')} — {displayVal(summary.taxableAmount)}
              </Text>
            </View>
          </View>
        </Card>

        {/* CTA to existing taxes calculator */}
        <TouchableOpacity
          style={styles.cta}
          onPress={() => router.push('/taxes')}
          activeOpacity={0.7}
        >
          <AppIcon name="taxes" size={20} color={colors.accent} />
          <Text style={styles.ctaText}>{t('taxDashboard.goToCalculator')}</Text>
          <AppIcon name="chevron" size={16} color={colors.text.muted} />
        </TouchableOpacity>
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
    yearRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    yearPill: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
    },
    yearPillSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    yearText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    yearTextSelected: {
      color: colors.background,
    },
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
    heroSub: {
      fontSize: 12,
      color: colors.text.muted,
      marginTop: spacing.xs,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.lg,
    },
    gainsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    gainItem: { flex: 1 },
    gainLabel: { fontSize: 12, marginBottom: spacing.xs },
    gainValue: {
      fontSize: 18,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    netRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.md,
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
    segmentBar: {
      flexDirection: 'row',
      height: 12,
      borderRadius: 6,
      overflow: 'hidden',
      marginBottom: spacing.lg,
    },
    segmentExempt: { height: 12 },
    segmentTaxable: { height: 12 },
    legendRow: { gap: spacing.sm },
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
    legendText: { fontSize: 12 },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    ctaText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
    },
  });
