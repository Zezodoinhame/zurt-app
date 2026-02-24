import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useCurrencyConverterStore } from '../src/stores/currencyConverterStore';
import { Card } from '../src/components/ui/Card';
import { LineChart } from '../src/components/charts/LineChart';
import { AppIcon } from '../src/hooks/useIcon';
import { maskValue } from '../src/utils/formatters';
import { ALL_CURRENCIES, CURRENCY_SYMBOLS, fetchLiveRates, getLastUpdated } from '../src/utils/currencyRates';
import type { CurrencyCode } from '../src/types';

export default function CurrencyConverterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const { valuesHidden } = useAuthStore();
  const { amount, from, to, convertedAmount, rate, rateHistory, crossRates, setAmount, setFrom, setTo, swap, recalculate } = useCurrencyConverterStore();

  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(getLastUpdated());

  const styles = useMemo(() => createStyles(colors), [colors]);

  const fetchRates = useCallback(async () => {
    const ts = await fetchLiveRates();
    if (ts) {
      setLastUpdated(ts);
      recalculate();
    }
  }, [recalculate]);

  // Fetch on mount
  useEffect(() => { fetchRates(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRates();
    setRefreshing(false);
  }, [fetchRates]);

  const formatVal = useCallback((v: number, code: CurrencyCode) => {
    if (valuesHidden) return maskValue('');
    const sym = CURRENCY_SYMBOLS[code];
    return `${sym} ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [valuesHidden]);

  const chartData = useMemo(() =>
    rateHistory.map((v, i) => ({ label: `${i + 1}`, value: v })),
  [rateHistory]);

  const handleAmountChange = useCallback((text: string) => {
    const num = parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
    setAmount(num);
  }, [setAmount]);

  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdated) return null;
    try {
      const d = new Date(lastUpdated);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return null;
    }
  }, [lastUpdated]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('converter.title')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} colors={[accentColor]} />
        }
      >
        {/* Amount Input */}
        <Card>
          <Text style={styles.inputLabel}>{t('converter.amount')}</Text>
          <TextInput
            style={styles.amountInput}
            value={String(amount)}
            onChangeText={handleAmountChange}
            keyboardType="decimal-pad"
            placeholderTextColor={colors.text.muted}
          />
        </Card>

        {/* From / To Selectors */}
        <Card>
          <Text style={styles.inputLabel}>{t('converter.from')}</Text>
          <View style={styles.currencyRow}>
            {ALL_CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.currencyPill, from === c && { backgroundColor: accentColor, borderColor: accentColor }]}
                onPress={() => { Haptics.selectionAsync(); setFrom(c); }}
              >
                <Text style={[styles.currencyText, from === c && { color: '#FFF' }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Swap Button */}
          <TouchableOpacity style={styles.swapBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); swap(); }}>
            <AppIcon name="converter" size={24} color={accentColor} />
          </TouchableOpacity>

          <Text style={styles.inputLabel}>{t('converter.to')}</Text>
          <View style={styles.currencyRow}>
            {ALL_CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.currencyPill, to === c && { backgroundColor: accentColor, borderColor: accentColor }]}
                onPress={() => { Haptics.selectionAsync(); setTo(c); }}
              >
                <Text style={[styles.currencyText, to === c && { color: '#FFF' }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Result Card */}
        <Card variant="glow">
          <Text style={styles.resultLabel}>{t('converter.result')}</Text>
          <Text style={[styles.resultValue, { color: accentColor }]}>{formatVal(convertedAmount, to)}</Text>
          <Text style={styles.rateText}>{t('converter.rate')}: 1 {from} = {rate.toFixed(4)} {to}</Text>
          {formattedLastUpdated && (
            <Text style={styles.sourceText}>Fonte: BRAPI | Atualizado: {formattedLastUpdated}</Text>
          )}
        </Card>

        {/* Historical Chart */}
        <Text style={styles.sectionTitle}>{t('converter.history')}</Text>
        <Card style={styles.chartCard}>
          <LineChart data={chartData} height={180} color={accentColor} />
        </Card>

        {/* Cross Rates */}
        <Text style={styles.sectionTitle}>{t('converter.crossRates')}</Text>
        <Card>
          {crossRates.map((cr) => (
            <View key={cr.code} style={styles.crossRow}>
              <Text style={styles.crossCode}>{from} / {cr.code}</Text>
              <Text style={styles.crossRate}>{valuesHidden ? '\u{2022}\u{2022}\u{2022}\u{2022}' : cr.rate.toFixed(4)}</Text>
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
    inputLabel: { fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: spacing.xs },
    amountInput: { fontSize: 28, fontWeight: '700', color: colors.text.primary, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm },
    currencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    currencyPill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
    currencyText: { fontSize: 13, fontWeight: '700', color: colors.text.secondary },
    swapBtn: { alignSelf: 'center', width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginVertical: spacing.sm },
    resultLabel: { fontSize: 12, color: colors.text.muted, marginBottom: 4 },
    resultValue: { fontSize: 28, fontWeight: '800', marginBottom: spacing.xs },
    rateText: { fontSize: 13, color: colors.text.secondary },
    sourceText: { fontSize: 11, color: colors.text.muted, marginTop: spacing.xs },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text.primary },
    chartCard: { padding: spacing.sm },
    crossRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
    crossCode: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
    crossRate: { fontSize: 14, fontWeight: '700', color: colors.text.primary, fontVariant: ['tabular-nums'] },
  });
}
