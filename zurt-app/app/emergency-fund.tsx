import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useEmergencyFundStore } from '../src/stores/emergencyFundStore';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { CircularProgress } from '../src/components/charts/CircularProgress';
import { AppIcon } from '../src/hooks/useIcon';
import { formatCurrency, maskValue, formatCurrencyInput } from '../src/utils/formatters';

export default function EmergencyFundScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const { valuesHidden } = useAuthStore();
  const { data, loadFund, addSavings, setTargetMonths, getMonthsCovered, getProgress, isProtected, getMonthsToTarget } = useEmergencyFundStore();
  const [showSheet, setShowSheet] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addAmountRaw, setAddAmountRaw] = useState(0);

  useEffect(() => { loadFund(); }, []);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const displayVal = useCallback(
    (v: number) => (valuesHidden ? maskValue('', currency) : formatCurrency(v, currency)),
    [valuesHidden, currency],
  );

  const monthsCovered = getMonthsCovered();
  const progress = getProgress();
  const protected_ = isProtected();
  const monthsToTarget = getMonthsToTarget();
  const pct = Math.round(progress * 100);
  const targetAmount = data.monthlyExpenses * data.targetMonths;

  const handleAmountChange = useCallback((text: string) => {
    const { display, raw } = formatCurrencyInput(text, currency);
    setAddAmount(display);
    setAddAmountRaw(raw);
  }, [currency]);

  const handleAdd = useCallback(() => {
    if (!addAmountRaw || addAmountRaw <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addSavings(addAmountRaw);
    setAddAmount('');
    setAddAmountRaw(0);
    setShowSheet(false);
  }, [addAmountRaw, addSavings]);

  const handleTargetUp = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTargetMonths(Math.min(data.targetMonths + 1, 24));
  }, [data.targetMonths, setTargetMonths]);

  const handleTargetDown = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTargetMonths(Math.max(data.targetMonths - 1, 1));
  }, [data.targetMonths, setTargetMonths]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('emergency.title')}</Text>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowSheet(true); }}>
          <AppIcon name="add" size={24} color={accentColor} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <Card variant="glow">
          <View style={styles.heroCenter}>
            <CircularProgress progress={progress} size={160} strokeWidth={12} color={protected_ ? colors.positive : accentColor}>
              <Text style={[styles.heroPct, { color: protected_ ? colors.positive : accentColor }]}>{pct}%</Text>
              <Text style={styles.heroSub}>{monthsCovered} / {data.targetMonths}</Text>
            </CircularProgress>
          </View>
          <View style={styles.statusRow}>
            <Badge variant={protected_ ? 'positive' : 'warning'} value={protected_ ? t('emergency.protected') : t('emergency.building')} />
          </View>
        </Card>

        {/* KPI Row */}
        <View style={styles.kpiRow}>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>{t('emergency.currentFund')}</Text>
            <Text style={[styles.kpiValue, { color: accentColor }]}>{displayVal(data.currentAmount)}</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>{t('emergency.monthlyExpenses')}</Text>
            <Text style={styles.kpiValue}>{displayVal(data.monthlyExpenses)}</Text>
          </Card>
        </View>

        <View style={styles.kpiRow}>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>{t('emergency.monthsCovered')}</Text>
            <Text style={[styles.kpiValue, { color: accentColor }]}>{valuesHidden ? '\u{2022}\u{2022}\u{2022}\u{2022}' : monthsCovered.toFixed(1)}</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>{t('emergency.targetMonths')}</Text>
            <View style={styles.targetRow}>
              <TouchableOpacity style={styles.targetBtn} onPress={handleTargetDown}>
                <Text style={styles.targetBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.kpiValue}>{data.targetMonths}</Text>
              <TouchableOpacity style={styles.targetBtn} onPress={handleTargetUp}>
                <Text style={styles.targetBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* Projection */}
        {!protected_ && (
          <Card>
            <Text style={styles.projText}>
              ~{monthsToTarget} {t('emergency.projection')}
            </Text>
            <Text style={styles.projSub}>{t('emergency.status')}: {displayVal(data.currentAmount)} / {displayVal(targetAmount)}</Text>
          </Card>
        )}

        {/* Recent Contributions */}
        {data.contributions.length > 0 && (
          <Card>
            {data.contributions.slice(-5).reverse().map((c, i) => (
              <View key={i} style={styles.contribRow}>
                <Text style={styles.contribDate}>{c.date}</Text>
                <Text style={[styles.contribAmount, { color: colors.positive }]}>+ {displayVal(c.amount)}</Text>
              </View>
            ))}
          </Card>
        )}

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>

      {/* Add Savings Sheet */}
      {showSheet && (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBg} activeOpacity={1} onPress={() => setShowSheet(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>{t('emergency.addSavings')}</Text>
              <Text style={styles.inputLabel}>{t('emergency.amount')}</Text>
              <TextInput
                style={styles.input}
                value={addAmount}
                onChangeText={handleAmountChange}
                keyboardType="numeric"
                placeholder={formatCurrency(0, currency)}
                placeholderTextColor={colors.text.muted}
                autoFocus
              />
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accentColor }]} onPress={handleAdd}>
                <Text style={styles.saveBtnText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
    content: { paddingHorizontal: spacing.xl, paddingBottom: 100, gap: spacing.md },
    heroCenter: { alignItems: 'center', paddingVertical: spacing.lg },
    heroPct: { fontSize: 28, fontWeight: '800' },
    heroSub: { fontSize: 12, color: colors.text.muted, marginTop: 2 },
    statusRow: { alignItems: 'center', marginTop: spacing.sm },
    kpiRow: { flexDirection: 'row', gap: spacing.md },
    kpiCard: { flex: 1 },
    kpiLabel: { fontSize: 12, color: colors.text.muted, marginBottom: 4 },
    kpiValue: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
    targetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    targetBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    targetBtnText: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
    projText: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 4 },
    projSub: { fontSize: 13, color: colors.text.secondary },
    contribRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
    contribDate: { fontSize: 13, color: colors.text.secondary },
    contribAmount: { fontSize: 14, fontWeight: '700' },
    // Sheet
    sheetOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
    sheetBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
    sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.lg },
    inputLabel: { fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: spacing.xs },
    input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 20, fontWeight: '700', color: colors.text.primary },
    saveBtn: { marginTop: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' },
    saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  });
}
