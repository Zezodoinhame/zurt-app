import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useDebtStore } from '../src/stores/debtStore';
import { Card } from '../src/components/ui/Card';
import { BottomSheet } from '../src/components/shared/BottomSheet';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { AppIcon } from '../src/hooks/useIcon';
import { SkeletonList } from '../src/components/skeletons/Skeleton';
import { formatCurrency, maskValue, formatCurrencyInput } from '../src/utils/formatters';
import type { DebtType, PayoffStrategy } from '../src/types';

const DEBT_TYPES: { key: DebtType; icon: string }[] = [
  { key: 'loan', icon: '\uD83D\uDCB5' },
  { key: 'mortgage', icon: '\uD83C\uDFE0' },
  { key: 'credit_card', icon: '\uD83D\uDCB3' },
  { key: 'student_loan', icon: '\uD83C\uDF93' },
  { key: 'other', icon: '\uD83D\uDCCB' },
];

export default function DebtManagerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const { valuesHidden } = useAuthStore();

  const {
    debts, comparison, strategy, isLoading, loadDebts,
    addDebt, editDebt, removeDebt, setStrategy,
    getTotalDebt, getMonthlyPayments, getDebtFreeDate,
  } = useDebtStore();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<DebtType>('loan');
  const [formTotal, setFormTotal] = useState('');
  const [formTotalRaw, setFormTotalRaw] = useState(0);
  const [formRemaining, setFormRemaining] = useState('');
  const [formRemainingRaw, setFormRemainingRaw] = useState(0);
  const [formRate, setFormRate] = useState('');
  const [formPayment, setFormPayment] = useState('');
  const [formPaymentRaw, setFormPaymentRaw] = useState(0);

  useEffect(() => { loadDebts(); }, []);

  const totalDebt = useMemo(() => getTotalDebt(), [debts]);
  const monthlyPayments = useMemo(() => getMonthlyPayments(), [debts]);
  const debtFreeDate = useMemo(() => getDebtFreeDate(), [debts]);

  const displayVal = useCallback(
    (v: number) => (valuesHidden ? maskValue('', currency) : formatCurrency(v, currency)),
    [valuesHidden, currency],
  );

  const handleTotalChange = useCallback((text: string) => {
    const { display, raw } = formatCurrencyInput(text, currency);
    setFormTotal(display);
    setFormTotalRaw(raw);
  }, [currency]);

  const handleRemainingChange = useCallback((text: string) => {
    const { display, raw } = formatCurrencyInput(text, currency);
    setFormRemaining(display);
    setFormRemainingRaw(raw);
  }, [currency]);

  const handlePaymentChange = useCallback((text: string) => {
    const { display, raw } = formatCurrencyInput(text, currency);
    setFormPayment(display);
    setFormPaymentRaw(raw);
  }, [currency]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setFormName('');
    setFormType('loan');
    setFormTotal('');
    setFormTotalRaw(0);
    setFormRemaining('');
    setFormRemainingRaw(0);
    setFormRate('');
    setFormPayment('');
    setFormPaymentRaw(0);
  }, []);

  const handleOpenAdd = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetForm();
    setSheetVisible(true);
  }, [resetForm]);

  const handleOpenEdit = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const debt = debts.find((d) => d.id === id);
    if (!debt) return;
    setEditingId(id);
    setFormName(debt.name);
    setFormType(debt.type);
    setFormTotal(formatCurrency(debt.totalAmount, currency));
    setFormTotalRaw(debt.totalAmount);
    setFormRemaining(formatCurrency(debt.remainingAmount, currency));
    setFormRemainingRaw(debt.remainingAmount);
    setFormRate(String(debt.interestRate));
    setFormPayment(formatCurrency(debt.minimumPayment, currency));
    setFormPaymentRaw(debt.minimumPayment);
    setSheetVisible(true);
  }, [debts, currency]);

  const handleSave = useCallback(() => {
    if (!formName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const data = {
      name: formName.trim(),
      type: formType,
      totalAmount: formTotalRaw || 0,
      remainingAmount: formRemainingRaw || 0,
      interestRate: parseFloat(formRate) || 0,
      minimumPayment: formPaymentRaw || 0,
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    };
    if (editingId) {
      editDebt(editingId, data);
    } else {
      addDebt(data);
    }
    setSheetVisible(false);
    resetForm();
  }, [editingId, formName, formType, formTotalRaw, formRemainingRaw, formRate, formPaymentRaw, addDebt, editDebt, resetForm]);

  const handleDelete = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t('debt.delete'), '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', style: 'destructive', onPress: () => removeDebt(id) },
    ]);
  }, [removeDebt, t]);

  const debtTypeIcon = useCallback((type: DebtType) => {
    return DEBT_TYPES.find((dt) => dt.key === type)?.icon || '\uD83D\uDCCB';
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <AppIcon name="back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('debt.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <SkeletonList />
      </View>
    );
  }

  if (debts.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <AppIcon name="back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('debt.title')}</Text>
          <TouchableOpacity onPress={handleOpenAdd} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <AppIcon name="add" size={24} color={accentColor} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 60 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>{'\uD83D\uDCB3'}</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, textAlign: 'center', marginBottom: 8 }}>{t('debt.title')}</Text>
          <Text style={{ fontSize: 14, color: colors.text.secondary, textAlign: 'center', lineHeight: 20 }}>
            {t('debt.emptyDesc')}
          </Text>
        </View>

        {/* Keep the BottomSheet accessible so user can add debts from empty state */}
        <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} title={editingId ? t('debt.editDebt') : t('debt.addDebt')}>
          <View style={styles.sheetContent}>
            <Input label={t('debt.name')} value={formName} onChangeText={setFormName} placeholder="Ex: Financiamento" />
            <Text style={styles.formLabel}>{t('debt.type')}</Text>
            <View style={styles.typeRow}>
              {DEBT_TYPES.map((dt) => (
                <TouchableOpacity
                  key={dt.key}
                  style={[styles.typePill, formType === dt.key && { backgroundColor: accentColor }]}
                  onPress={() => setFormType(dt.key)}
                >
                  <Text style={styles.typeIcon}>{dt.icon}</Text>
                  <Text style={[styles.typeLabel, formType === dt.key && { color: colors.background }]}>{t(`debt.${dt.key}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input label={t('debt.totalAmount')} value={formTotal} onChangeText={handleTotalChange} keyboardType="numeric" />
            <Input label={t('debt.remainingAmount')} value={formRemaining} onChangeText={handleRemainingChange} keyboardType="numeric" />
            <Input label={t('debt.interestRate')} value={formRate} onChangeText={setFormRate} keyboardType="numeric" />
            <Input label={t('debt.minimumPayment')} value={formPayment} onChangeText={handlePaymentChange} keyboardType="numeric" />
            <Button title={editingId ? t('debt.editDebt') : t('debt.addDebt')} onPress={handleSave} style={{ marginTop: spacing.md }} />
          </View>
        </BottomSheet>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('debt.title')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <Card variant="glow">
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('debt.totalDebt')}</Text>
              <Text style={[styles.summaryValue, { color: colors.negative }]}>{displayVal(totalDebt)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('debt.monthlyPayments')}</Text>
              <Text style={styles.summaryValue}>{displayVal(monthlyPayments)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('debt.interestCost')}</Text>
              <Text style={[styles.summaryValue, { color: colors.warning }]}>{displayVal(comparison.avalanche.totalInterest)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('debt.debtFreeDate')}</Text>
              <Text style={styles.summaryValue}>{debtFreeDate || '—'}</Text>
            </View>
          </View>
        </Card>

        {/* Strategy Toggle */}
        <Text style={styles.sectionTitle}>{t('debt.strategy')}</Text>
        <View style={styles.pillRow}>
          {(['snowball', 'avalanche'] as PayoffStrategy[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.pill, strategy === s && { backgroundColor: accentColor }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStrategy(s); }}
            >
              <Text style={[styles.pillText, strategy === s && { color: colors.background }]}>{t(`debt.${s}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Comparison Card */}
        <Card style={styles.comparisonCard}>
          <View style={styles.compRow}>
            <View style={styles.compCol}>
              <Text style={styles.compLabel}>{t('debt.interestSaved')}</Text>
              <Text style={[styles.compValue, { color: colors.positive }]}>{displayVal(comparison.interestSaved)}</Text>
            </View>
            <View style={styles.compCol}>
              <Text style={styles.compLabel}>{t('debt.monthsSaved')}</Text>
              <Text style={[styles.compValue, { color: colors.positive }]}>{comparison.monthsSaved} {t('debt.monthsUnit')}</Text>
            </View>
          </View>
        </Card>

        {/* Debt List */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('debt.title')}</Text>
          <TouchableOpacity onPress={handleOpenAdd}>
            <Text style={[styles.addButton, { color: accentColor }]}>+ {t('debt.addDebt')}</Text>
          </TouchableOpacity>
        </View>

        {debts.map((debt) => {
          const progress = debt.totalAmount > 0 ? (debt.totalAmount - debt.remainingAmount) / debt.totalAmount : 0;
          return (
            <TouchableOpacity key={debt.id} onPress={() => handleOpenEdit(debt.id)} onLongPress={() => handleDelete(debt.id)}>
              <Card style={styles.debtCard}>
                <View style={styles.debtRow}>
                  <Text style={styles.debtIcon}>{debtTypeIcon(debt.type)}</Text>
                  <View style={styles.debtInfo}>
                    <Text style={styles.debtName}>{debt.name}</Text>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: accentColor }]} />
                    </View>
                    <Text style={styles.debtMetaText}>{displayVal(debt.remainingAmount)} / {displayVal(debt.totalAmount)}</Text>
                    <Text style={styles.debtRateText}>{debt.interestRate}{t('debt.annualRateSuffix')}</Text>
                  </View>
                  <Text style={styles.debtPayment}>{displayVal(debt.minimumPayment)}/m</Text>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>

      {/* Add/Edit Sheet */}
      <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} title={editingId ? t('debt.editDebt') : t('debt.addDebt')}>
        <View style={styles.sheetContent}>
          <Input label={t('debt.name')} value={formName} onChangeText={setFormName} placeholder="Ex: Financiamento" />
          <Text style={styles.formLabel}>{t('debt.type')}</Text>
          <View style={styles.typeRow}>
            {DEBT_TYPES.map((dt) => (
              <TouchableOpacity
                key={dt.key}
                style={[styles.typePill, formType === dt.key && { backgroundColor: accentColor }]}
                onPress={() => setFormType(dt.key)}
              >
                <Text style={styles.typeIcon}>{dt.icon}</Text>
                <Text style={[styles.typeLabel, formType === dt.key && { color: colors.background }]}>{t(`debt.${dt.key}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Input label={t('debt.totalAmount')} value={formTotal} onChangeText={handleTotalChange} keyboardType="numeric" />
          <Input label={t('debt.remainingAmount')} value={formRemaining} onChangeText={handleRemainingChange} keyboardType="numeric" />
          <Input label={t('debt.interestRate')} value={formRate} onChangeText={setFormRate} keyboardType="numeric" />
          <Input label={t('debt.minimumPayment')} value={formPayment} onChangeText={handlePaymentChange} keyboardType="numeric" />
          <Button title={editingId ? t('debt.editDebt') : t('debt.addDebt')} onPress={handleSave} style={{ marginTop: spacing.md }} />
          {editingId && (
            <Button title={t('debt.delete')} onPress={() => { handleDelete(editingId); setSheetVisible(false); }} variant="danger" style={{ marginTop: spacing.sm }} />
          )}
        </View>
      </BottomSheet>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
    content: { paddingHorizontal: spacing.xl, paddingBottom: 100, gap: spacing.md },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    summaryItem: { width: '46%' },
    summaryLabel: { color: colors.text.muted, fontSize: 12, marginBottom: 2 },
    summaryValue: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text.primary },
    pillRow: { flexDirection: 'row', gap: spacing.sm },
    pill: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    pillText: { fontSize: 14, fontWeight: '600', color: colors.text.secondary },
    comparisonCard: { padding: spacing.md },
    compRow: { flexDirection: 'row', justifyContent: 'space-around' },
    compCol: { alignItems: 'center' },
    compLabel: { color: colors.text.muted, fontSize: 12, marginBottom: 4 },
    compValue: { fontSize: 16, fontWeight: '700' },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    addButton: { fontSize: 14, fontWeight: '600' },
    debtCard: { padding: spacing.md },
    debtRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    debtIcon: { fontSize: 28 },
    debtInfo: { flex: 1 },
    debtName: { fontSize: 15, fontWeight: '600', color: colors.text.primary, marginBottom: 4 },
    progressBarBg: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden', marginBottom: 4 },
    progressBarFill: { height: 6, borderRadius: 3 },
    debtMetaText: { fontSize: 12, color: colors.text.muted, marginBottom: 2 },
    debtRateText: { fontSize: 11, color: colors.text.muted },
    debtPayment: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
    sheetContent: { padding: spacing.md, gap: spacing.md },
    formLabel: { fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 4 },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    typePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    typeIcon: { fontSize: 14 },
    typeLabel: { fontSize: 12, color: colors.text.secondary },
  });
}
