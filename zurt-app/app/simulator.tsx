import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { Card } from '../src/components/ui/Card';
import { StackedBarChart } from '../src/components/charts/StackedBarChart';
import { AppIcon } from '../src/hooks/useIcon';
import { formatCurrency } from '../src/utils/formatters';
import {
  simulateInvestment,
  RISK_RATES,
  type RiskProfile,
} from '../src/utils/simulatorCalc';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - spacing.xl * 4;

const TERM_OPTIONS = [5, 10, 15, 20, 30];

const SLIDER_MIN = 100;
const SLIDER_MAX = 50000;
const SLIDER_STEP = 100;

export default function SimulatorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const { valuesHidden } = useAuthStore();

  const styles = useMemo(() => createStyles(colors), [colors]);

  // Inputs
  const [monthly, setMonthly] = useState(1000);
  const [initialAmount, setInitialAmount] = useState(0);
  const [termYears, setTermYears] = useState(10);
  const [risk, setRisk] = useState<RiskProfile>('moderate');

  // Slider drag state
  const [sliderWidth, setSliderWidth] = useState(0);
  const [initialSliderWidth, setInitialSliderWidth] = useState(0);

  const INITIAL_MIN = 0;
  const INITIAL_MAX = 500000;
  const INITIAL_STEP = 1000;

  const result = useMemo(
    () =>
      simulateInvestment(
        monthly,
        termYears * 12,
        RISK_RATES[risk],
        initialAmount,
      ),
    [monthly, termYears, risk, initialAmount],
  );

  const chartData = useMemo(
    () =>
      result.timeline.map((p) => ({
        label: `${p.year}a`,
        invested: p.invested,
        gains: p.gains,
      })),
    [result.timeline],
  );

  const handleSlider = useCallback(
    (evt: any) => {
      if (sliderWidth <= 0) return;
      const x = evt.nativeEvent.locationX;
      const ratio = Math.max(0, Math.min(1, x / sliderWidth));
      const raw = SLIDER_MIN + ratio * (SLIDER_MAX - SLIDER_MIN);
      const stepped = Math.round(raw / SLIDER_STEP) * SLIDER_STEP;
      setMonthly(Math.max(SLIDER_MIN, Math.min(SLIDER_MAX, stepped)));
    },
    [sliderWidth],
  );

  const handleInitialSlider = useCallback(
    (evt: any) => {
      if (initialSliderWidth <= 0) return;
      const x = evt.nativeEvent.locationX;
      const ratio = Math.max(0, Math.min(1, x / initialSliderWidth));
      const raw = INITIAL_MIN + ratio * (INITIAL_MAX - INITIAL_MIN);
      const stepped = Math.round(raw / INITIAL_STEP) * INITIAL_STEP;
      setInitialAmount(Math.max(INITIAL_MIN, Math.min(INITIAL_MAX, stepped)));
    },
    [initialSliderWidth],
  );

  const sliderFillPct =
    ((monthly - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;

  const initialFillPct =
    ((initialAmount - INITIAL_MIN) / (INITIAL_MAX - INITIAL_MIN)) * 100;

  const displayVal = (v: number) =>
    valuesHidden ? 'R$ •••••' : formatCurrency(v, currency);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel={t('common.back')}
        >
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('simulator.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Monthly Contribution Slider */}
        <Card delay={100}>
          <Text style={styles.inputLabel}>
            {t('simulator.monthlyContribution')}
          </Text>
          <Text style={styles.sliderValue}>{displayVal(monthly)}</Text>

          <View
            style={styles.sliderTrack}
            onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handleSlider}
            onResponderMove={handleSlider}
          >
            <View
              style={[
                styles.sliderFill,
                { width: `${sliderFillPct}%` },
              ]}
            />
            <View
              style={[
                styles.sliderThumb,
                { left: `${sliderFillPct}%` },
              ]}
            />
          </View>
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>R$ 100</Text>
            <Text style={styles.sliderLabel}>R$ 50.000</Text>
          </View>
        </Card>

        {/* Initial Amount Slider */}
        <Card delay={150}>
          <Text style={styles.inputLabel}>
            {t('simulator.initialAmount')}
          </Text>
          <Text style={styles.sliderValue}>{displayVal(initialAmount)}</Text>

          <View
            style={styles.sliderTrack}
            onLayout={(e) => setInitialSliderWidth(e.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handleInitialSlider}
            onResponderMove={handleInitialSlider}
          >
            <View
              style={[
                styles.sliderFill,
                { width: `${initialFillPct}%` },
              ]}
            />
            <View
              style={[
                styles.sliderThumb,
                { left: `${initialFillPct}%` },
              ]}
            />
          </View>
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>R$ 0</Text>
            <Text style={styles.sliderLabel}>R$ 500.000</Text>
          </View>
        </Card>

        {/* Term Pills */}
        <Card delay={200}>
          <Text style={styles.inputLabel}>{t('simulator.term')}</Text>
          <View style={styles.pillRow}>
            {TERM_OPTIONS.map((y) => {
              const selected = termYears === y;
              return (
                <TouchableOpacity
                  key={y}
                  style={[styles.pill, selected && styles.pillSelected]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTermYears(y);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.pillText,
                      selected && styles.pillTextSelected,
                    ]}
                  >
                    {y} {t('simulator.years')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Risk Profile Toggle */}
        <Card delay={300}>
          <Text style={styles.inputLabel}>{t('simulator.riskProfile')}</Text>
          <View style={styles.toggleContainer}>
            {(['conservative', 'moderate', 'aggressive'] as RiskProfile[]).map(
              (r) => {
                const selected = risk === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.toggleButton,
                      selected && styles.toggleButtonActive,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setRisk(r);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        selected && styles.toggleTextActive,
                      ]}
                    >
                      {t(`simulator.${r}`)}
                    </Text>
                    <Text
                      style={[
                        styles.toggleRate,
                        selected && styles.toggleTextActive,
                      ]}
                    >
                      {Math.round(RISK_RATES[r] * 100)}%{t('simulator.perYear')}
                    </Text>
                  </TouchableOpacity>
                );
              },
            )}
          </View>
        </Card>

        {/* Results */}
        <Card variant="glow" delay={400}>
          <Text style={styles.resultLabel}>
            {t('simulator.estimatedAmount')}
          </Text>
          <Text style={styles.resultBig}>{displayVal(result.finalAmount)}</Text>

          <View style={styles.resultSubRow}>
            <View style={styles.resultSubItem}>
              <Text style={styles.resultSubLabel}>
                {t('simulator.totalInvested')}
              </Text>
              <Text style={[styles.resultSubValue, { color: colors.info }]}>
                {displayVal(result.totalInvested)}
              </Text>
            </View>
            <View style={styles.resultSubItem}>
              <Text style={styles.resultSubLabel}>
                {t('simulator.projectedGains')}
              </Text>
              <Text
                style={[styles.resultSubValue, { color: colors.accent }]}
              >
                {displayVal(result.gains)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Stacked Bar Chart */}
        {chartData.length > 0 && (
          <Card delay={500}>
            <StackedBarChart
              data={chartData}
              width={CHART_WIDTH}
              height={200}
            />
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: colors.info }]}
                />
                <Text style={styles.legendText}>
                  {t('simulator.totalInvested')}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: colors.accent },
                  ]}
                />
                <Text style={styles.legendText}>
                  {t('simulator.projectedGains')}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>{t('simulator.disclaimer')}</Text>
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
      fontSize: 20,
      fontWeight: '700',
      color: colors.text.primary,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 100,
    },

    // Input labels
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.secondary,
      marginBottom: spacing.md,
    },

    // Slider
    sliderValue: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.lg,
      fontVariant: ['tabular-nums'],
    },
    sliderTrack: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
      position: 'relative',
      marginBottom: spacing.sm,
    },
    sliderFill: {
      position: 'absolute',
      left: 0,
      top: 0,
      height: 6,
      backgroundColor: colors.accent,
      borderRadius: 3,
    },
    sliderThumb: {
      position: 'absolute',
      top: -9,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.accent,
      marginLeft: -12,
      borderWidth: 3,
      borderColor: colors.background,
    },
    sliderLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    sliderLabel: {
      fontSize: 11,
      color: colors.text.muted,
    },

    // Pills
    pillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    pill: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    pillText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    pillTextSelected: {
      color: colors.background,
    },

    // Toggle
    toggleContainer: {
      flexDirection: 'row',
      backgroundColor: colors.elevated,
      borderRadius: radius.md,
      padding: spacing.xs,
    },
    toggleButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
    },
    toggleButtonActive: {
      backgroundColor: colors.accent,
    },
    toggleText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    toggleTextActive: {
      color: colors.background,
    },
    toggleRate: {
      fontSize: 10,
      color: colors.text.muted,
      marginTop: 2,
    },

    // Results
    resultLabel: {
      fontSize: 14,
      color: colors.text.secondary,
      marginBottom: spacing.xs,
    },
    resultBig: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
      marginBottom: spacing.lg,
    },
    resultSubRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    resultSubItem: {
      flex: 1,
    },
    resultSubLabel: {
      fontSize: 12,
      color: colors.text.secondary,
      marginBottom: spacing.xs,
    },
    resultSubValue: {
      fontSize: 16,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },

    // Legend
    legendRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.xl,
      marginTop: spacing.md,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendText: {
      fontSize: 12,
      color: colors.text.secondary,
    },

    // Disclaimer
    disclaimer: {
      fontSize: 11,
      color: colors.text.muted,
      textAlign: 'center',
      lineHeight: 16,
      marginTop: spacing.md,
      paddingHorizontal: spacing.lg,
    },
  });
