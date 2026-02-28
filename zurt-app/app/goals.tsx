import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useGoalsStore } from '../src/stores/goalsStore';
import { useAuthStore } from '../src/stores/authStore';
import { Card } from '../src/components/ui/Card';
import { CircularProgress } from '../src/components/charts/CircularProgress';
import { BottomSheet } from '../src/components/shared/BottomSheet';
import { AppIcon } from '../src/hooks/useIcon';
import { formatCurrency } from '../src/utils/formatters';
import { projectGoalWithRate } from '../src/utils/simulatorCalc';
import type { GoalCategory } from '../src/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GOAL_ICONS = [
  '\u{1F3E0}', '\u{1F697}', '\u{2708}\u{FE0F}', '\u{1F393}',
  '\u{1F4B0}', '\u{1F3D6}\u{FE0F}', '\u{1F476}', '\u{1F4BB}',
  '\u{1F3E5}', '\u{1F3AF}',
];

const GOAL_COLORS = [
  '#FF6B6B', '#4ECDC4', '#3A86FF', '#A855F7',
  '#F472B6', '#FFD93D', '#60A5FA', '#FB923C',
  '#00D4AA', '#818CF8',
];

const ICON_TO_CATEGORY: Record<string, GoalCategory> = {
  '\u{1F3E0}': 'house',
  '\u{1F697}': 'car',
  '\u{2708}\u{FE0F}': 'trip',
  '\u{1F393}': 'education',
  '\u{1F4B0}': 'retirement',
  '\u{1F3D6}\u{FE0F}': 'trip',
  '\u{1F476}': 'custom',
  '\u{1F4BB}': 'custom',
  '\u{1F3E5}': 'emergency',
  '\u{1F3AF}': 'custom',
};

// Approx 1% monthly rate for projection (conservative)
const DEFAULT_MONTHLY_RATE = 0.01;

// ===========================================================================
// GoalsScreen
// ===========================================================================

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const { valuesHidden } = useAuthStore();

  const { goals, loadGoals, addGoal, editGoal, removeGoal } = useGoalsStore();

  const styles = useMemo(() => createStyles(colors), [colors]);

  // Bottom sheet state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formMonthly, setFormMonthly] = useState('');
  const [formIcon, setFormIcon] = useState(GOAL_ICONS[0]);
  const [formColor, setFormColor] = useState(GOAL_COLORS[0]);

  useEffect(() => {
    loadGoals();
  }, []);

  const resetForm = useCallback(() => {
    setFormName('');
    setFormTarget('');
    setFormMonthly('');
    setFormIcon(GOAL_ICONS[0]);
    setFormColor(GOAL_COLORS[0]);
    setEditingId(null);
  }, []);

  const handleCreate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetForm();
    setSheetVisible(true);
  }, [resetForm]);

  const handleEdit = useCallback(
    (id: string) => {
      const goal = goals.find((g) => g.id === id);
      if (!goal) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setEditingId(id);
      setFormName(goal.name);
      setFormTarget(String(goal.target_amount));
      setFormMonthly(String(goal.monthly_contribution || ''));
      setFormIcon(goal.icon || GOAL_ICONS[0]);
      setFormColor(goal.color || GOAL_COLORS[0]);
      setSheetVisible(true);
    },
    [goals],
  );

  const handleSave = useCallback(() => {
    const target = parseFloat(formTarget.replace(/[^\d.,]/g, '').replace(',', '.'));
    const monthly = parseFloat(formMonthly.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (!formName.trim() || isNaN(target) || target <= 0) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const category = ICON_TO_CATEGORY[formIcon] ?? 'custom';
    const deadline = new Date();
    deadline.setFullYear(deadline.getFullYear() + 2);

    if (editingId) {
      editGoal(editingId, {
        name: formName.trim(),
        target_amount: target,
        monthly_contribution: isNaN(monthly) ? 0 : monthly,
        icon: formIcon,
        color: formColor,
        category,
      });
    } else {
      addGoal({
        name: formName.trim(),
        target_amount: target,
        deadline: deadline.toISOString().split('T')[0],
        category,
        icon: formIcon,
        color: formColor,
        monthly_contribution: isNaN(monthly) ? 0 : monthly,
      });
    }
    setSheetVisible(false);
    resetForm();
  }, [editingId, formName, formTarget, formMonthly, formIcon, formColor, editGoal, addGoal, resetForm]);

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert(t('goals.delete'), t('goals.deleteConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('goals.delete'),
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            removeGoal(id);
          },
        },
      ]);
    },
    [t, removeGoal],
  );

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel={t('common.back')}
        >
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('goals.title')}</Text>
        <TouchableOpacity
          onPress={handleCreate}
          style={styles.addButton}
          accessibilityLabel={t('goals.addGoal')}
        >
          <AppIcon name="add" size={24} color={colors.background} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {goals.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>{'\u{1F3AF}'}</Text>
          <Text style={styles.emptyText}>{t('goals.empty')}</Text>
          <TouchableOpacity
            style={styles.emptyCta}
            onPress={handleCreate}
            activeOpacity={0.7}
          >
            <Text style={styles.emptyCtaText}>{t('goals.emptyCta')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {goals.map((goal, idx) => {
            const progress =
              goal.target_amount > 0
                ? Math.min(goal.current_amount / goal.target_amount, 1)
                : 0;
            const pct = Math.round(progress * 100);
            const goalColor = goal.color || GOAL_COLORS[0];
            const monthsLeft = projectGoalWithRate(
              goal.current_amount,
              goal.monthly_contribution || 0,
              DEFAULT_MONTHLY_RATE,
              goal.target_amount,
            );

            return (
              <Card key={goal.id} delay={idx * 80}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleEdit(goal.id)}
                  onLongPress={() => handleDelete(goal.id)}
                >
                  <View style={styles.goalRow}>
                    <CircularProgress
                      progress={progress}
                      size={68}
                      strokeWidth={6}
                      color={goalColor}
                    >
                      <Text style={[styles.progressPct, { color: goalColor }]}>
                        {pct}%
                      </Text>
                    </CircularProgress>

                    <View style={styles.goalInfo}>
                      <View style={styles.goalTitleRow}>
                        <Text style={styles.goalEmoji}>{goal.icon || '\u{1F3AF}'}</Text>
                        <Text style={styles.goalName} numberOfLines={1}>
                          {goal.name}
                        </Text>
                      </View>

                      <Text style={styles.goalAmounts}>
                        {valuesHidden
                          ? 'R$ \u{2022}\u{2022}\u{2022}\u{2022}\u{2022}'
                          : formatCurrency(goal.current_amount, currency)}
                        {' '}
                        <Text style={styles.goalAmountsMuted}>
                          {t('goals.of')}{' '}
                          {valuesHidden
                            ? 'R$ \u{2022}\u{2022}\u{2022}\u{2022}\u{2022}'
                            : formatCurrency(goal.target_amount, currency)}
                        </Text>
                      </Text>

                      {monthsLeft > 0 ? (
                        <Text style={styles.goalProjection}>
                          {t('goals.atCurrentRate').replace('{n}', String(monthsLeft))}
                        </Text>
                      ) : goal.current_amount >= goal.target_amount ? (
                        <Text style={[styles.goalProjection, { color: colors.positive }]}>
                          {t('goals.reached')}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: goalColor,
                        },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              </Card>
            );
          })}
        </ScrollView>
      )}

      {/* ---- Create / Edit Bottom Sheet ---- */}
      <BottomSheet
        visible={sheetVisible}
        onClose={() => { setSheetVisible(false); resetForm(); }}
        title={editingId ? t('goals.editTitle') : t('goals.createTitle')}
        height={SCREEN_HEIGHT * 0.8}
      >
        <View style={styles.formContainer}>
          {/* Name */}
          <Text style={styles.formLabel}>{t('goals.name')}</Text>
          <TextInput
            style={styles.formInput}
            value={formName}
            onChangeText={setFormName}
            placeholder={t('goals.name')}
            placeholderTextColor={colors.text.muted}
          />

          {/* Target amount */}
          <Text style={styles.formLabel}>{t('goals.targetAmount')}</Text>
          <TextInput
            style={styles.formInput}
            value={formTarget}
            onChangeText={setFormTarget}
            placeholder="100000"
            placeholderTextColor={colors.text.muted}
            keyboardType="numeric"
          />

          {/* Monthly contribution */}
          <Text style={styles.formLabel}>{t('goals.monthlyContribution')}</Text>
          <TextInput
            style={styles.formInput}
            value={formMonthly}
            onChangeText={setFormMonthly}
            placeholder="2000"
            placeholderTextColor={colors.text.muted}
            keyboardType="numeric"
          />

          {/* Icon picker */}
          <Text style={styles.formLabel}>{t('goals.selectIcon')}</Text>
          <View style={styles.iconGrid}>
            {GOAL_ICONS.map((icon) => (
              <TouchableOpacity
                key={icon}
                style={[
                  styles.iconOption,
                  formIcon === icon && {
                    borderColor: colors.accent,
                    borderWidth: 2,
                    backgroundColor: colors.accent + '15',
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setFormIcon(icon);
                }}
              >
                <Text style={styles.iconOptionText}>{icon}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Color picker */}
          <Text style={[styles.formLabel, { marginTop: spacing.lg }]}>{t('goals.selectColor')}</Text>
          <View style={styles.colorGrid}>
            {GOAL_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  formColor === color && styles.colorSelected,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setFormColor(color);
                }}
              />
            ))}
          </View>

          {/* Save */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            activeOpacity={0.7}
          >
            <Text style={styles.saveButtonText}>{t('goals.save')}</Text>
          </TouchableOpacity>

          {/* Delete (edit only) */}
          {editingId && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                setSheetVisible(false);
                handleDelete(editingId);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteButtonText}>{t('goals.delete')}</Text>
            </TouchableOpacity>
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
      fontSize: 20,
      fontWeight: '700',
      color: colors.text.primary,
    },
    addButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 100,
    },

    // Goal card
    goalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    goalInfo: {
      flex: 1,
      marginLeft: spacing.lg,
    },
    goalTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    goalEmoji: {
      fontSize: 18,
      marginRight: spacing.sm,
    },
    goalName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
      flex: 1,
    },
    goalAmounts: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
      marginBottom: 2,
    },
    goalAmountsMuted: {
      color: colors.text.muted,
      fontWeight: '400',
    },
    goalProjection: {
      fontSize: 12,
      color: colors.text.muted,
    },
    progressPct: {
      fontSize: 14,
      fontWeight: '700',
    },

    // Progress bar
    progressBarBg: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: 4,
      borderRadius: 2,
    },

    // Empty state
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxl,
    },
    emptyEmoji: {
      fontSize: 56,
      marginBottom: spacing.lg,
    },
    emptyText: {
      fontSize: 16,
      color: colors.text.secondary,
      marginBottom: spacing.xl,
      textAlign: 'center',
    },
    emptyCta: {
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
    },
    emptyCtaText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.background,
    },

    // Form
    formContainer: {
      paddingBottom: spacing.xxl,
    },
    formLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.secondary,
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },
    formInput: {
      backgroundColor: colors.input,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: 15,
      color: colors.text.primary,
    },

    // Icon grid
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    iconOption: {
      width: 46,
      height: 46,
      borderRadius: radius.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconOptionText: {
      fontSize: 22,
    },

    // Color grid
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    colorOption: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    colorSelected: {
      borderWidth: 3,
      borderColor: '#FFFFFF',
    },

    // Buttons
    saveButton: {
      backgroundColor: colors.accent,
      paddingVertical: spacing.lg,
      borderRadius: radius.md,
      alignItems: 'center',
      marginTop: spacing.xl,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.background,
    },
    deleteButton: {
      alignItems: 'center',
      paddingVertical: spacing.md,
      marginTop: spacing.sm,
    },
    deleteButtonText: {
      color: colors.negative,
      fontSize: 14,
      fontWeight: '600',
    },
  });
