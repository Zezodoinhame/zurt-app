import React, { useMemo, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useFireStore } from '../src/stores/fireStore';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { LineChart } from '../src/components/charts/LineChart';
import { GaugeChart } from '../src/components/charts/GaugeChart';
import { AppIcon } from '../src/hooks/useIcon';
import { formatCurrency, maskValue } from '../src/utils/formatters';
import type { FIREParams } from '../src/types';

type ParamKey = keyof FIREParams;

const PARAM_CONFIG: { key: ParamKey; step: number; min: number; max: number }[] = [
  { key: 'currentAge', step: 1, min: 18, max: 80 },
  { key: 'annualIncome', step: 10000, min: 0, max: 2000000 },
  { key: 'annualExpenses', step: 5000, min: 0, max: 2000000 },
  { key: 'currentNetWorth', step: 50000, min: 0, max: 50000000 },
  { key: 'expectedReturn', step: 0.5, min: 0, max: 30 },
  { key: 'inflation', step: 0.5, min: 0, max: 20 },
  { key: 'safeWithdrawalRate', step: 0.5, min: 1, max: 10 },
];

export default function FIREScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const { valuesHidden } = useAuthStore();
  const { params, result, setParam, loadParams } = useFireStore();

  useEffect(() => { loadParams(); }, []);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const displayVal = useCallback(
    (v: number) => (valuesHidden ? maskValue('', currency) : formatCurrency(v, currency)),
    [valuesHidden, currency],
  );

  const isCurrency = useCallback((key: ParamKey) =>
    ['annualIncome', 'annualExpenses', 'currentNetWorth'].includes(key), []);

  const isPct = useCallback((key: ParamKey) =>
    ['expectedReturn', 'inflation', 'safeWithdrawalRate'].includes(key), []);

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
    result.projectionByYear.map((p) => ({
      label: String(p.age),
      value: p.netWorth,
    })),
  [result]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('fire.title')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Savings Rate Gauge */}
        <Card variant="glow">
          <View style={styles.gaugeContainer}>
            <GaugeChart score={result.savingsRate} size={180} label={t('fire.savingsRate')} />
          </View>
        </Card>

        {/* FIRE Numbers Card */}
        <Card>
          <View style={styles.fireRow}>
            <View style={styles.fireRowLeft}>
              <Text style={styles.fireLabel}>{t('fire.leanFire')}</Text>
              <Text style={styles.fireValue}>{displayVal(result.leanFireNumber)}</Text>
            </View>
            <Badge variant="info" value={t('fire.lean')} />
          </View>
          <View style={styles.fireRow}>
            <View style={styles.fireRowLeft}>
              <Text style={styles.fireLabel}>{t('fire.fireNumber')}</Text>
              <Text style={[styles.fireValueLarge, { color: accentColor }]}>{displayVal(result.fireNumber)}</Text>
            </View>
            <Badge
              variant={result.isCoastFIReached ? 'positive' : 'warning'}
              value={result.isCoastFIReached ? t('fire.onTrack') : t('fire.behind')}
            />
          </View>
          <View style={styles.fireRow}>
            <View style={styles.fireRowLeft}>
              <Text style={styles.fireLabel}>{t('fire.fatFire')}</Text>
              <Text style={styles.fireValue}>{displayVal(result.fatFireNumber)}</Text>
            </View>
            <Badge variant="neutral" value={t('fire.fat')} />
          </View>
        </Card>

        {/* Key Metrics Row */}
        <View style={styles.metricsRow}>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t('fire.yearsToFI')}</Text>
            <Text style={[styles.metricValue, { color: accentColor }]}>{result.yearsToFI}</Text>
            <Text style={styles.metricSub}>{t('fire.fiAge')}: {result.fiAge}</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t('fire.coastFire')}</Text>
            <Text style={[styles.metricValue, { color: accentColor }]}>{result.coastFireAge}</Text>
            <Badge
              variant={result.isCoastFIReached ? 'positive' : 'warning'}
              value={result.isCoastFIReached ? t('fire.reached') : t('fire.notReached')}
            />
          </Card>
        </View>

        {/* Monthly Savings */}
        <Card>
          <Text style={styles.resultLabel}>{t('fire.monthlySavings')}</Text>
          <Text style={[styles.resultValue, { color: accentColor }]}>{displayVal(result.monthlySavings)}</Text>
        </Card>

        {/* Projection Chart */}
        <Text style={styles.sectionTitle}>{t('fire.projection')}</Text>
        <Card style={styles.chartCard}>
          <LineChart data={chartData} height={220} color={accentColor} referenceValue={result.fireNumber} />
        </Card>

        {/* Param Steppers */}
        <Card>
          {PARAM_CONFIG.map(({ key, step, min, max }) => (
            <View key={key} style={styles.paramRow}>
              <Text style={styles.paramLabel}>{t(`fire.${key}`)}</Text>
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
    gaugeContainer: { alignItems: 'center', paddingVertical: spacing.lg },
    fireRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
    fireRowLeft: { flex: 1 },
    fireLabel: { color: colors.text.muted, fontSize: 12, marginBottom: 2 },
    fireValue: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
    fireValueLarge: { fontSize: 20, fontWeight: '800' },
    metricsRow: { flexDirection: 'row', gap: spacing.md },
    metricCard: { flex: 1 },
    metricLabel: { color: colors.text.muted, fontSize: 12, marginBottom: 4 },
    metricValue: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
    metricSub: { color: colors.text.secondary, fontSize: 12 },
    resultLabel: { color: colors.text.muted, fontSize: 12, marginBottom: 4 },
    resultValue: { fontSize: 20, fontWeight: '800' },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text.primary },
    chartCard: { padding: spacing.sm },
    paramRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
    paramLabel: { fontSize: 13, color: colors.text.secondary, flex: 1 },
    paramControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    paramBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    paramBtnText: { fontSize: 18, fontWeight: '600', color: colors.text.primary },
    paramValue: { fontSize: 14, fontWeight: '700', color: colors.text.primary, minWidth: 90, textAlign: 'center' },
  });
}
