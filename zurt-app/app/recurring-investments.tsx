import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useRecurringInvestmentStore } from '../src/stores/recurringInvestmentStore';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { BottomSheet } from '../src/components/shared/BottomSheet';
import { AppIcon } from '../src/hooks/useIcon';
import { SkeletonList } from '../src/components/skeletons/Skeleton';
import { formatCurrency, maskValue } from '../src/utils/formatters';
import type { RecurringInvestment, RecurringFrequency } from '../src/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const FREQUENCIES: { key: RecurringFrequency; label: string }[] = [
  { key: 'weekly', label: 'recurring.weekly' },
  { key: 'biweekly', label: 'recurring.biweekly' },
  { key: 'monthly', label: 'recurring.monthly' },
];

// ===========================================================================
// RecurringInvestmentsScreen
// ===========================================================================

export default function RecurringInvestmentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const { valuesHidden } = useAuthStore();

  const {
    rules, isLoading, loadRules, addRule, editRule, removeRule, toggleStatus,
    getTotalMonthly, getActiveCount,
  } = useRecurringInvestmentStore();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formTicker, setFormTicker] = useState('');
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formFrequency, setFormFrequency] = useState<RecurringFrequency>('monthly');
  const [formDay, setFormDay] = useState('5');

  useEffect(() => {
    loadRules();
  }, []);

  const totalMonthly = useMemo(() => getTotalMonthly(), [rules]);
  const activeCount = useMemo(() => getActiveCount(), [rules]);

  const displayValue = (value: number) =>
    valuesHidden ? maskValue('') : formatCurrency(value, currency);

  const frequencyLabel = useCallback(
    (freq: RecurringFrequency) => {
      const found = FREQUENCIES.find((f) => f.key === freq);
      return found ? t(found.label) : freq;
    },
    [t],
  );

  // Form handlers
  const resetForm = useCallback(() => {
    setFormTicker('');
    setFormName('');
    setFormAmount('');
    setFormFrequency('monthly');
    setFormDay('5');
    setEditingId(null);
  }, []);

  const handleCreate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetForm();
    setSheetVisible(true);
  }, [resetForm]);

  const handleEdit = useCallback((rule: RecurringInvestment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingId(rule.id);
    setFormTicker(rule.ticker);
    setFormName(rule.name);
    setFormAmount(String(rule.amount));
    setFormFrequency(rule.frequency);
    setFormDay(String(rule.executionDay));
    setSheetVisible(true);
  }, []);

  const handleSave = useCallback(() => {
    const amount = parseFloat(formAmount.replace(/[^\d.,]/g, '').replace(',', '.'));
    const day = parseInt(formDay, 10);
    if (!formTicker.trim() || isNaN(amount) || amount <= 0 || isNaN(day) || day < 1 || day > 28) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (editingId) {
      editRule(editingId, {
        ticker: formTicker.trim().toUpperCase(),
        name: formName.trim() || formTicker.trim().toUpperCase(),
        amount,
        frequency: formFrequency,
        executionDay: day,
      });
    } else {
      addRule({
        ticker: formTicker.trim().toUpperCase(),
        name: formName.trim() || formTicker.trim().toUpperCase(),
        amount,
        frequency: formFrequency,
        executionDay: day,
      });
    }
    setSheetVisible(false);
    resetForm();
  }, [editingId, formTicker, formName, formAmount, formFrequency, formDay, editRule, addRule, resetForm]);

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert(t('recurring.delete'), t('recurring.deleteConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('recurring.delete'),
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            removeRule(id);
          },
        },
      ]);
    },
    [t, removeRule],
  );

  const renderRuleItem = useCallback(
    ({ item, index }: { item: RecurringInvestment; index: number }) => (
      <Card key={item.id} delay={index * 60}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleEdit(item)}
          onLongPress={() => handleDelete(item.id)}
          style={styles.ruleRow}
        >
          <View style={styles.ruleInfo}>
            <View style={styles.ruleHeader}>
              <Text style={styles.ruleTicker}>{item.ticker}</Text>
              <Badge
                value={t(`recurring.${item.status}`)}
                variant={item.status === 'active' ? 'positive' : 'warning'}
                size="sm"
              />
            </View>
            <Text style={styles.ruleName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.ruleMeta}>
              <Badge value={frequencyLabel(item.frequency)} variant="neutral" size="sm" />
              <Text style={styles.ruleNext}>{t('recurring.nextExecution')}: {item.nextExecution}</Text>
            </View>
          </View>
          <View style={styles.ruleRight}>
            <Text style={styles.ruleAmount}>{displayValue(item.amount)}</Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleStatus(item.id);
              }}
              style={[
                styles.toggleBtn,
                { backgroundColor: item.status === 'active' ? colors.positive + '20' : colors.border + '40' },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View
                style={[
                  styles.toggleDot,
                  {
                    backgroundColor: item.status === 'active' ? colors.positive : colors.text.muted,
                    alignSelf: item.status === 'active' ? 'flex-end' : 'flex-start',
                  },
                ]}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Card>
    ),
    [colors, styles, valuesHidden, t, frequencyLabel, handleEdit, handleDelete, toggleStatus, displayValue],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('recurring.title')}</Text>
        <TouchableOpacity onPress={handleCreate} style={styles.addButton}>
          <AppIcon name="add" size={24} color={colors.background} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <SkeletonList count={5} />
        </View>
      ) : rules.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>{'\uD83D\uDD01'}</Text>
          <Text style={styles.emptyText}>{t('recurring.empty')}</Text>
          <TouchableOpacity style={styles.emptyCta} onPress={handleCreate} activeOpacity={0.7}>
            <Text style={styles.emptyCtaText}>{t('recurring.emptyCta')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rules}
          keyExtractor={(item) => item.id}
          renderItem={renderRuleItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Card variant="glow" delay={0}>
              <Text style={styles.summaryLabel}>{t('recurring.totalMonthly')}</Text>
              <Text style={styles.summaryHero}>{displayValue(totalMonthly)}</Text>
              <Text style={styles.summaryMeta}>
                {activeCount} {t('recurring.activeRules')}
              </Text>
            </Card>
          }
        />
      )}

      {/* Add/Edit BottomSheet */}
      <BottomSheet
        visible={sheetVisible}
        onClose={() => { setSheetVisible(false); resetForm(); }}
        title={editingId ? t('recurring.editRule') : t('recurring.addRule')}
        height={SCREEN_HEIGHT * 0.8}
      >
        <View style={styles.formContainer}>
          <Input
            label={t('recurring.ticker')}
            value={formTicker}
            onChangeText={setFormTicker}
            placeholder="PETR4"
            autoCapitalize="characters"
          />
          <Input
            label={t('recurring.ticker')}
            value={formName}
            onChangeText={setFormName}
            placeholder="Petrobras PN"
          />
          <Input
            label={t('recurring.amount')}
            value={formAmount}
            onChangeText={setFormAmount}
            placeholder="500.00"
            keyboardType="numeric"
          />

          {/* Frequency selector */}
          <Text style={styles.formLabel}>{t('recurring.frequency')}</Text>
          <View style={styles.frequencyRow}>
            {FREQUENCIES.map((freq) => {
              const isActive = formFrequency === freq.key;
              return (
                <TouchableOpacity
                  key={freq.key}
                  style={[styles.frequencyPill, isActive && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setFormFrequency(freq.key);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.frequencyPillText, isActive && { color: colors.background, fontWeight: '700' }]}>
                    {t(freq.label)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input
            label={t('recurring.executionDay') + ' (1-28)'}
            value={formDay}
            onChangeText={setFormDay}
            placeholder="5"
            keyboardType="numeric"
          />

          <Button
            title={t('recurring.save')}
            onPress={handleSave}
            variant="primary"
            size="lg"
            style={{ marginTop: spacing.xl }}
          />

          {editingId && (
            <Button
              title={t('recurring.delete')}
              onPress={() => { setSheetVisible(false); handleDelete(editingId); }}
              variant="danger"
              size="md"
              style={{ marginTop: spacing.md }}
            />
          )}
        </View>
      </BottomSheet>
    </View>
  );
}

// ===========================================================================
// Styles
// ===========================================================================

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
    addButton: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent,
      alignItems: 'center', justifyContent: 'center',
    },
    loadingContainer: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
    listContent: { paddingHorizontal: spacing.xl, paddingBottom: 100 },

    // Summary
    summaryLabel: { fontSize: 13, color: colors.text.secondary, marginBottom: spacing.xs },
    summaryHero: {
      fontSize: 28, fontWeight: '700', color: colors.text.primary,
      fontVariant: ['tabular-nums'], marginBottom: spacing.sm,
    },
    summaryMeta: { fontSize: 13, color: colors.text.muted },

    // Rule row
    ruleRow: { flexDirection: 'row', alignItems: 'center' },
    ruleInfo: { flex: 1, gap: spacing.xs },
    ruleHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    ruleTicker: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
    ruleName: { fontSize: 13, color: colors.text.secondary },
    ruleMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    ruleNext: { fontSize: 11, color: colors.text.muted },
    ruleRight: { alignItems: 'flex-end', marginLeft: spacing.sm, gap: spacing.sm },
    ruleAmount: { fontSize: 16, fontWeight: '700', color: colors.text.primary, fontVariant: ['tabular-nums'] },
    toggleBtn: {
      width: 36, height: 20, borderRadius: 10, padding: 2, justifyContent: 'center',
    },
    toggleDot: { width: 16, height: 16, borderRadius: 8 },

    // Empty state
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl },
    emptyEmoji: { fontSize: 56, marginBottom: spacing.lg },
    emptyText: { fontSize: 16, color: colors.text.secondary, marginBottom: spacing.xl, textAlign: 'center' },
    emptyCta: {
      backgroundColor: colors.accent, paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.md, borderRadius: radius.md,
    },
    emptyCtaText: { fontSize: 14, fontWeight: '600', color: colors.background },

    // Form
    formContainer: { paddingBottom: spacing.xxl },
    formLabel: { fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: spacing.sm },
    frequencyRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    frequencyPill: {
      flex: 1, paddingVertical: spacing.md, borderRadius: radius.md,
      borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center',
    },
    frequencyPillText: { fontSize: 13, color: colors.text.secondary, fontWeight: '500' },
  });
