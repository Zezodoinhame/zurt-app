import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useBudgetStore } from '../src/stores/budgetStore';
import { Header } from '../src/components/shared/Header';
import { Card } from '../src/components/ui/Card';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { BottomSheet } from '../src/components/shared/BottomSheet';
import { CircularProgress } from '../src/components/charts/CircularProgress';
import { AppIcon } from '../src/hooks/useIcon';
import { SkeletonList } from '../src/components/skeletons/Skeleton';
import { formatCurrency, maskValue } from '../src/utils/formatters';
import type { TransactionCategory } from '../src/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const categoryLabels: Record<string, string> = {
  food: 'Alimentação',
  transport: 'Transporte',
  subscriptions: 'Assinaturas',
  shopping: 'Compras',
  fuel: 'Combustível',
  health: 'Saúde',
  travel: 'Viagem',
  tech: 'Tecnologia',
};

// ===========================================================================
// BudgetScreen
// ===========================================================================

export default function BudgetScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const { valuesHidden } = useAuthStore();

  const { budget, isLoading, loadBudget, setCategoryLimit, saveBudget, resetBudget } =
    useBudgetStore();

  const styles = useMemo(() => createStyles(colors), [colors]);

  // Bottom sheet state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TransactionCategory | null>(null);
  const [editLimit, setEditLimit] = useState('');

  useEffect(() => {
    loadBudget();
  }, []);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const totalLimit = budget?.totalLimit ?? 0;
  const totalSpent = budget?.totalSpent ?? 0;
  const usedPct = totalLimit > 0 ? totalSpent / totalLimit : 0;
  const remaining = totalLimit - totalSpent;
  const isOver = remaining < 0;

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const displayVal = useCallback(
    (v: number) => (valuesHidden ? maskValue('', currency) : formatCurrency(v, currency)),
    [valuesHidden, currency],
  );

  const progressColor = useCallback(
    (spent: number, limit: number) => {
      if (limit <= 0) return colors.text.muted;
      const ratio = spent / limit;
      if (ratio > 1) return colors.negative;
      if (ratio >= 0.8) return colors.warning;
      return colors.positive;
    },
    [colors],
  );

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleCategoryPress = useCallback(
    (category: TransactionCategory, currentLimit: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setEditingCategory(category);
      setEditLimit(String(currentLimit));
      setSheetVisible(true);
    },
    [],
  );

  const handleSheetSave = useCallback(() => {
    if (!editingCategory) return;
    const parsed = parseFloat(editLimit.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (isNaN(parsed) || parsed < 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCategoryLimit(editingCategory, parsed);
    setSheetVisible(false);
    setEditingCategory(null);
  }, [editingCategory, editLimit, setCategoryLimit]);

  const handleSaveAll = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await saveBudget();
    Alert.alert(t('budget.title'), t('budget.saved'));
  }, [saveBudget, t]);

  const handleReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetBudget();
  }, [resetBudget]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <AppIcon name="back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('budget.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.scrollContent}>
          <SkeletonList count={6} />
        </View>
      </View>
    );
  }

  if (!budget) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <AppIcon name="back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('budget.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 60 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>{'\uD83D\uDCCA'}</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, textAlign: 'center', marginBottom: 8 }}>{t('budget.title')}</Text>
          <Text style={{ fontSize: 14, color: colors.text.secondary, textAlign: 'center', lineHeight: 20 }}>
            Nenhum orçamento configurado. Adicione categorias para começar.
          </Text>
        </View>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>{t('budget.title')}</Text>
        <TouchableOpacity
          onPress={handleReset}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel={t('budget.reset')}
        >
          <AppIcon name="refresh" size={22} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Summary Card */}
        <Card delay={100}>
          <View style={styles.summaryRow}>
            <CircularProgress
              progress={Math.min(usedPct, 1)}
              size={80}
              strokeWidth={8}
              color={isOver ? colors.negative : colors.positive}
            >
              <Text
                style={[
                  styles.summaryPct,
                  { color: isOver ? colors.negative : colors.positive },
                ]}
              >
                {Math.round(usedPct * 100)}%
              </Text>
            </CircularProgress>

            <View style={styles.summaryInfo}>
              <Text style={styles.sectionTitle}>{t('budget.summary')}</Text>
              <Text style={styles.summaryAmount}>
                {displayVal(totalSpent)}{' '}
                <Text style={styles.summaryAmountMuted}>
                  / {displayVal(totalLimit)}
                </Text>
              </Text>

              {isOver ? (
                <Text style={[styles.summaryRemaining, { color: colors.negative }]}>
                  {t('budget.overBudget')} {displayVal(Math.abs(remaining))}
                </Text>
              ) : (
                <Text style={[styles.summaryRemaining, { color: colors.positive }]}>
                  {t('budget.leftToSpend')} {displayVal(remaining)}
                </Text>
              )}
            </View>
          </View>
        </Card>

        {/* Category List */}
        <Card delay={200}>
          <Text style={styles.sectionTitle}>{t('budget.categories')}</Text>

          {budget.categories.map((cat, idx) => {
            const pct = cat.limit > 0 ? cat.spent / cat.limit : 0;
            const barPct = Math.min(pct, 1);
            const barColor = progressColor(cat.spent, cat.limit);
            const overLimit = cat.limit > 0 && cat.spent > cat.limit;

            return (
              <TouchableOpacity
                key={cat.category}
                style={styles.catRow}
                activeOpacity={0.7}
                onPress={() => handleCategoryPress(cat.category, cat.limit)}
              >
                {/* Left: icon + label */}
                <View style={styles.catLeft}>
                  <Text style={styles.catEmoji}>{cat.icon}</Text>
                  <Text style={styles.catLabel} numberOfLines={1}>
                    {categoryLabels[cat.category] ?? cat.category}
                  </Text>
                </View>

                {/* Center: progress bar */}
                <View style={styles.catBarContainer}>
                  <View style={styles.catBarBg}>
                    <View
                      style={[
                        styles.catBarFill,
                        {
                          width: `${Math.round(barPct * 100)}%`,
                          backgroundColor: barColor,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Right: amount text + over badge */}
                <View style={styles.catRight}>
                  <Text style={styles.catAmount}>
                    {displayVal(cat.spent)}{' '}
                    <Text style={styles.catAmountMuted}>/ {displayVal(cat.limit)}</Text>
                  </Text>
                  {overLimit && (
                    <View style={[styles.overBadge, { backgroundColor: colors.negative }]}>
                      <Text style={styles.overBadgeText}>!</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </Card>

        {/* Save Button */}
        <View style={styles.saveContainer}>
          <Button title={t('budget.save')} onPress={handleSaveAll} />
        </View>
      </ScrollView>

      {/* ---- Edit Category Limit Bottom Sheet ---- */}
      <BottomSheet
        visible={sheetVisible}
        onClose={() => {
          setSheetVisible(false);
          setEditingCategory(null);
        }}
        title={t('budget.editLimit')}
      >
        <View style={styles.sheetContent}>
          {editingCategory && (
            <>
              <Text style={styles.sheetCategory}>
                {categoryLabels[editingCategory] ?? editingCategory}
              </Text>

              <Text style={styles.sheetLabel}>{t('budget.currentLimit')}</Text>
              <Text style={styles.sheetCurrentValue}>
                {displayVal(
                  budget.categories.find((c) => c.category === editingCategory)?.limit ?? 0,
                )}
              </Text>

              <Input
                label={t('budget.newLimit')}
                value={editLimit}
                onChangeText={setEditLimit}
                keyboardType="numeric"
                placeholder="0"
              />

              <Button title={t('budget.saveLimit')} onPress={handleSheetSave} />
            </>
          )}
        </View>
      </BottomSheet>
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
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 100,
    },

    // Summary
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    summaryInfo: {
      flex: 1,
      marginLeft: spacing.lg,
    },
    summaryPct: {
      fontSize: 16,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    summaryAmount: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
      marginBottom: spacing.xs,
    },
    summaryAmountMuted: {
      fontWeight: '400',
      color: colors.text.muted,
    },
    summaryRemaining: {
      fontSize: 13,
      fontWeight: '600',
    },

    // Section
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.lg,
    },

    // Category row
    catRow: {
      marginBottom: spacing.lg,
    },
    catLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    catEmoji: {
      fontSize: 18,
      marginRight: spacing.sm,
    },
    catLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
      flex: 1,
    },

    // Progress bar
    catBarContainer: {
      marginBottom: spacing.xs,
    },
    catBarBg: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
      overflow: 'hidden',
    },
    catBarFill: {
      height: 6,
      borderRadius: 3,
    },

    // Amount + over badge
    catRight: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    catAmount: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    catAmountMuted: {
      fontWeight: '400',
      color: colors.text.muted,
    },
    overBadge: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    overBadgeText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: '800',
    },

    // Save
    saveContainer: {
      marginTop: spacing.lg,
    },

    // Bottom sheet
    sheetContent: {
      paddingBottom: spacing.xxl,
    },
    sheetCategory: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.lg,
    },
    sheetLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.secondary,
      marginBottom: spacing.sm,
    },
    sheetCurrentValue: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
      marginBottom: spacing.xl,
    },
  });
