import React, { useMemo, useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useMonteCarloStore } from '../src/stores/monteCarloStore';
import { Card } from '../src/components/ui/Card';
import { CircularProgress } from '../src/components/charts/CircularProgress';
import { FanChart } from '../src/components/charts/FanChart';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { AppIcon } from '../src/hooks/useIcon';
import { formatCurrency, maskValue } from '../src/utils/formatters';
import type { MonteCarloHorizon } from '../src/types';

const HORIZONS: MonteCarloHorizon[] = [5, 10, 20, 30];
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function MonteCarloScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const { valuesHidden } = useAuthStore();

  const { result, isRunning, horizon, targetValue, setHorizon, setTargetValue, runSimulation } = useMonteCarloStore();
  const [targetInput, setTargetInput] = useState(String(targetValue));

  const styles = useMemo(() => createStyles(colors), [colors]);

  const displayVal = useCallback(
    (v: number) => (valuesHidden ? maskValue('', currency) : formatCurrency(v, currency)),
    [valuesHidden, currency],
  );

  const handleHorizonChange = useCallback((h: MonteCarloHorizon) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHorizon(h);
  }, [setHorizon]);

  const handleRun = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const parsed = parseFloat(targetInput);
    if (parsed > 0) setTargetValue(parsed);
    await runSimulation();
  }, [targetInput, setTargetValue, runSimulation]);

  const successColor = result.successProbability >= 70 ? colors.positive : result.successProbability >= 40 ? colors.warning : colors.negative;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('monteCarlo.title')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Horizon Selector */}
        <Text style={styles.sectionTitle}>{t('monteCarlo.horizon')}</Text>
        <View style={styles.pillRow}>
          {HORIZONS.map((h) => (
            <TouchableOpacity
              key={h}
              style={[styles.pill, horizon === h && { backgroundColor: accentColor }]}
              onPress={() => handleHorizonChange(h)}
            >
              <Text style={[styles.pillText, horizon === h && { color: '#FFF' }]}>{h} {t('monteCarlo.years')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Target Input */}
        <Input
          label={t('monteCarlo.target')}
          value={targetInput}
          onChangeText={setTargetInput}
          keyboardType="numeric"
          placeholder="3000000"
        />

        {/* Run Button */}
        <Button
          title={isRunning ? t('monteCarlo.running') : t('monteCarlo.run')}
          onPress={handleRun}
          disabled={isRunning}
          style={{ marginTop: spacing.sm }}
        />

        {/* Fan Chart */}
        <Card style={styles.chartCard}>
          {isRunning ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={accentColor} />
              <Text style={styles.loadingText}>{t('monteCarlo.running')}</Text>
            </View>
          ) : (
            <FanChart
              percentiles={result.percentiles}
              years={result.years}
              width={SCREEN_WIDTH - spacing.md * 4}
              height={240}
              accentColor={accentColor}
            />
          )}
        </Card>

        {/* KPI Row */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiItem}>
            <CircularProgress
              progress={result.successProbability / 100}
              size={64}
              strokeWidth={6}
              color={successColor}
            >
              <Text style={[styles.kpiPct, { color: successColor }]}>{result.successProbability}%</Text>
            </CircularProgress>
            <Text style={styles.kpiLabel}>{t('monteCarlo.successProb')}</Text>
          </View>
          <View style={styles.kpiItem}>
            <Text style={[styles.kpiValue, { color: accentColor }]}>{displayVal(result.medianOutcome)}</Text>
            <Text style={styles.kpiLabel}>{t('monteCarlo.medianOutcome')}</Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpiItem}>
            <Text style={[styles.kpiValue, { color: colors.positive }]}>{displayVal(result.bestCase)}</Text>
            <Text style={styles.kpiLabel}>{t('monteCarlo.bestCase')}</Text>
          </View>
          <View style={styles.kpiItem}>
            <Text style={[styles.kpiValue, { color: colors.negative }]}>{displayVal(result.worstCase)}</Text>
            <Text style={styles.kpiLabel}>{t('monteCarlo.worstCase')}</Text>
          </View>
        </View>

        {/* Explanation */}
        <Card style={styles.explCard}>
          <Text style={styles.explText}>{t('monteCarlo.explanation')}</Text>
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
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text.primary },
    pillRow: { flexDirection: 'row', gap: spacing.sm },
    pill: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    pillText: { fontSize: 14, fontWeight: '600', color: colors.text.secondary },
    chartCard: { padding: spacing.sm, minHeight: 260 },
    loadingContainer: { height: 240, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
    loadingText: { color: colors.text.muted, fontSize: 14 },
    kpiRow: { flexDirection: 'row', gap: spacing.md },
    kpiItem: { flex: 1, alignItems: 'center', gap: 4 },
    kpiPct: { fontSize: 16, fontWeight: '700' },
    kpiValue: { fontSize: 18, fontWeight: '700' },
    kpiLabel: { fontSize: 12, color: colors.text.muted, textAlign: 'center' },
    explCard: { padding: spacing.md },
    explText: { color: colors.text.secondary, fontSize: 13, lineHeight: 20 },
  });
}
