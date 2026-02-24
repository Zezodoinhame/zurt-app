import React, { useMemo, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useCompoundStore } from '../src/stores/compoundStore';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { LineChart } from '../src/components/charts/LineChart';
import { AppIcon } from '../src/hooks/useIcon';
import { formatCurrency, maskValue } from '../src/utils/formatters';
import type { CompoundParams } from '../src/types';

type ParamKey = 'initialAmount' | 'monthlyContribution' | 'annualRate' | 'years' | 'inflationRate';

const PARAM_CONFIG: { key: ParamKey; step: number; min: number; max: number }[] = [
  { key: 'initialAmount', step: 5000, min: 0, max: 10000000 },
  { key: 'monthlyContribution', step: 500, min: 0, max: 100000 },
  { key: 'annualRate', step: 0.5, min: 0, max: 30 },
  { key: 'years', step: 1, min: 1, max: 50 },
  { key: 'inflationRate', step: 0.5, min: 0, max: 20 },
];

export default function CompoundScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const { valuesHidden } = useAuthStore();
  const { params, result, setParam, loadParams } = useCompoundStore();

  useEffect(() => { loadParams(); }, []);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const displayVal = useCallback(
    (v: number) => (valuesHidden ? maskValue('', currency) : formatCurrency(v, currency)),
    [valuesHidden, currency],
  );

  const isCurrency = useCallback((key: ParamKey) =>
    ['initialAmount', 'monthlyContribution'].includes(key), []);

  const isPct = useCallback((key: ParamKey) =>
    ['annualRate', 'inflationRate'].includes(key), []);

  const formatParamValue = useCallback((key: ParamKey, val: number) => {
    if (isCurrency(key)) return displayVal(val);
    if (isPct(key)) return `${val}%`;
    if (key === 'years') return `${val}`;
    return String(val);
  }, [isCurrency, isPct, displayVal]);

  const handleIncrement = useCallback((key: ParamKey, step: number, max: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newVal = Math.min((params as any)[key] + step, max);
    setParam(key, newVal);
  }, [params, setParam]);

  const handleDecrement = useCallback((key: ParamKey, step: number, min: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newVal = Math.max((params as any)[key] - step, min);
    setParam(key, newVal);
  }, [params, setParam]);

  const chartData = useMemo(() =>
    result.projectionByMonth.map((p) => ({
      label: `${Math.floor(p.month / 12)}a`,
      value: params.inflationAdjust ? p.balanceAdj : p.balance,
    })),
  [result, params.inflationAdjust]);

  const finalValue = params.inflationAdjust ? result.finalValueInflationAdj : result.finalValue;
  const totalInterest = params.inflationAdjust ? result.totalInterestInflationAdj : result.totalInterest;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('compound.title')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Results Card */}
        <Card variant="glow">
          <Text style={styles.resultLabel}>{t('compound.finalValue')}</Text>
          <Text style={[styles.resultValueLarge, { color: accentColor }]}>{displayVal(finalValue)}</Text>
          <View style={styles.resultRow}>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>{t('compound.totalInvested')}</Text>
              <Text style={styles.resultValue}>{displayVal(result.totalInvested)}</Text>
            </View>
            <View style={styles.resultSep} />
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>{t('compound.totalInterest')}</Text>
              <Text style={[styles.resultValue, { color: colors.positive }]}>{displayVal(totalInterest)}</Text>
            </View>
          </View>
          {params.inflationAdjust && (
            <Badge variant="info" value={t('compound.adjusted')} size="sm" style={{ alignSelf: 'flex-start', marginTop: spacing.sm }} />
          )}
        </Card>

        {/* Projection Chart */}
        <Text style={styles.sectionTitle}>{t('compound.projection')}</Text>
        <Card style={styles.chartCard}>
          <LineChart data={chartData} height={220} color={accentColor} referenceValue={result.totalInvested} />
        </Card>

        {/* Inflation toggle */}
        <Card>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('compound.inflationAdjust')}</Text>
            <Switch
              value={params.inflationAdjust}
              onValueChange={(v) => setParam('inflationAdjust', v)}
              trackColor={{ false: colors.border, true: accentColor }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        {/* Param Steppers */}
        <Card>
          {PARAM_CONFIG.filter((p) => p.key !== 'inflationRate' || params.inflationAdjust).map(({ key, step, min, max }) => (
            <View key={key} style={styles.paramRow}>
              <Text style={styles.paramLabel}>{t(`compound.${key}`)}</Text>
              <View style={styles.paramControls}>
                <TouchableOpacity style={styles.paramBtn} onPress={() => handleDecrement(key, step, min)}>
                  <Text style={styles.paramBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.paramValue}>{formatParamValue(key, (params as any)[key])}</Text>
                <TouchableOpacity style={styles.paramBtn} onPress={() => handleIncrement(key, step, max)}>
                  <Text style={styles.paramBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </Card>

        {/* Comparison */}
        {params.inflationAdjust && (
          <Card>
            <View style={styles.compRow}>
              <View style={styles.compItem}>
                <Text style={styles.compLabel}>{t('compound.nominal')}</Text>
                <Text style={[styles.compValue, { color: accentColor }]}>{displayVal(result.finalValue)}</Text>
              </View>
              <View style={styles.compItem}>
                <Text style={styles.compLabel}>{t('compound.adjusted')}</Text>
                <Text style={[styles.compValue, { color: colors.positive }]}>{displayVal(result.finalValueInflationAdj)}</Text>
              </View>
            </View>
          </Card>
        )}

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
    resultLabel: { color: colors.text.muted, fontSize: 12, marginBottom: 4 },
    resultValueLarge: { fontSize: 28, fontWeight: '800', marginBottom: spacing.md },
    resultRow: { flexDirection: 'row', alignItems: 'flex-start' },
    resultItem: { flex: 1 },
    resultSep: { width: 1, height: 36, backgroundColor: colors.border, marginHorizontal: spacing.lg },
    resultValue: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text.primary },
    chartCard: { padding: spacing.sm },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    switchLabel: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
    paramRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
    paramLabel: { fontSize: 13, color: colors.text.secondary, flex: 1 },
    paramControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    paramBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    paramBtnText: { fontSize: 18, fontWeight: '600', color: colors.text.primary },
    paramValue: { fontSize: 14, fontWeight: '700', color: colors.text.primary, minWidth: 100, textAlign: 'center' },
    compRow: { flexDirection: 'row', gap: spacing.lg },
    compItem: { flex: 1 },
    compLabel: { fontSize: 12, color: colors.text.muted, marginBottom: 4 },
    compValue: { fontSize: 18, fontWeight: '700' },
  });
}
