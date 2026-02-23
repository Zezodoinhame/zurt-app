import React, { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useRetirementStore } from '../src/stores/retirementStore';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { LineChart } from '../src/components/charts/LineChart';
import { AppIcon } from '../src/hooks/useIcon';
import { formatCurrency, maskValue } from '../src/utils/formatters';
import type { RetirementParams } from '../src/types';

type ParamKey = keyof RetirementParams;

const PARAM_CONFIG: { key: ParamKey; step: number; min: number; max: number }[] = [
  { key: 'currentAge', step: 1, min: 18, max: 80 },
  { key: 'retirementAge', step: 1, min: 30, max: 90 },
  { key: 'monthlyContribution', step: 500, min: 0, max: 100000 },
  { key: 'expectedReturn', step: 0.5, min: 0, max: 30 },
  { key: 'currentSavings', step: 10000, min: 0, max: 50000000 },
  { key: 'monthlyExpenses', step: 500, min: 0, max: 200000 },
  { key: 'inflation', step: 0.5, min: 0, max: 20 },
];

export default function RetirementScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const { valuesHidden } = useAuthStore();
  const { params, result, setParam } = useRetirementStore();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const displayVal = useCallback(
    (v: number) => (valuesHidden ? maskValue('', currency) : formatCurrency(v, currency)),
    [valuesHidden, currency],
  );

  const isCurrency = useCallback((key: ParamKey) =>
    ['monthlyContribution', 'currentSavings', 'monthlyExpenses'].includes(key), []);

  const isPct = useCallback((key: ParamKey) =>
    ['expectedReturn', 'inflation'].includes(key), []);

  const formatParamValue = useCallback((key: ParamKey, val: number) => {
    if (isCurrency(key)) return displayVal(val);
    if (isPct(key)) return `${val}%`;
    return String(val);
  }, [isCurrency, isPct, displayVal]);

  const handleIncrement = useCallback((key: ParamKey, step: number, max: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newVal = Math.min(params[key] + step, max);
    setParam(key, newVal);
  }, [params, setParam]);

  const handleDecrement = useCallback((key: ParamKey, step: number, min: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newVal = Math.max(params[key] - step, min);
    setParam(key, newVal);
  }, [params, setParam]);

  const chartData = useMemo(() =>
    result.timelineByAge.map((p) => ({
      label: String(p.age),
      value: p.balance,
    })),
  [result]);

  const hasSurplus = result.surplus >= 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('retirement.title')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Input Card */}
        <Card>
          {PARAM_CONFIG.map(({ key, step, min, max }) => (
            <View key={key} style={styles.paramRow}>
              <Text style={styles.paramLabel}>{t(`retirement.${key}`)}</Text>
              <View style={styles.paramControls}>
                <TouchableOpacity style={styles.paramBtn} onPress={() => handleDecrement(key, step, min)}>
                  <Text style={styles.paramBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.paramValue}>{formatParamValue(key, params[key])}</Text>
                <TouchableOpacity style={styles.paramBtn} onPress={() => handleIncrement(key, step, max)}>
                  <Text style={styles.paramBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </Card>

        {/* Results Card */}
        <Card variant="glow">
          <View style={styles.resultRow}>
            <View style={styles.resultCol}>
              <Text style={styles.resultLabel}>{t('retirement.projectedFund')}</Text>
              <Text style={[styles.resultValue, { color: accentColor }]}>{displayVal(result.projectedFund)}</Text>
            </View>
            <View style={styles.resultCol}>
              <Text style={styles.resultLabel}>{t('retirement.monthlyIncome')}</Text>
              <Text style={styles.resultValue}>{displayVal(result.monthlyRetirementIncome)}</Text>
            </View>
          </View>
          <View style={styles.resultRow}>
            <View style={styles.resultCol}>
              <Text style={styles.resultLabel}>{t('retirement.fireNumber')}</Text>
              <Text style={styles.resultValue}>{displayVal(result.fireNumber)}</Text>
            </View>
            <View style={styles.resultCol}>
              <Text style={styles.resultLabel}>{t('retirement.gapAnalysis')}</Text>
              <Badge
                variant={hasSurplus ? 'positive' : 'negative'}
                value={`${hasSurplus ? t('retirement.surplus') : t('retirement.deficit')}: ${displayVal(Math.abs(result.surplus))}`}
              />
            </View>
          </View>
        </Card>

        {/* Timeline Chart */}
        <Text style={styles.sectionTitle}>{t('retirement.timeline')}</Text>
        <Card style={styles.chartCard}>
          <LineChart data={chartData} height={220} color={accentColor} />
        </Card>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
    content: { paddingHorizontal: spacing.xl, paddingBottom: 100, gap: spacing.md },
    paramRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
    paramLabel: { fontSize: 13, color: colors.text.secondary, flex: 1 },
    paramControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    paramBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    paramBtnText: { fontSize: 18, fontWeight: '600', color: colors.text.primary },
    paramValue: { fontSize: 14, fontWeight: '700', color: colors.text.primary, minWidth: 90, textAlign: 'center' },
    resultsCard: { padding: spacing.lg },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
    resultCol: { flex: 1 },
    resultLabel: { color: colors.text.muted, fontSize: 12, marginBottom: 4 },
    resultValue: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text.primary },
    chartCard: { padding: spacing.sm },
  });
}
