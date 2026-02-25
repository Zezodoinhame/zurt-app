import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useSavingsChallengeStore } from '../src/stores/savingsChallengeStore';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { CircularProgress } from '../src/components/charts/CircularProgress';
import { BottomSheet } from '../src/components/shared/BottomSheet';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { AppIcon } from '../src/hooks/useIcon';
import { SkeletonList } from '../src/components/skeletons/Skeleton';
import { formatCurrency, maskValue } from '../src/utils/formatters';
import type { ChallengeType } from '../src/types';

// =============================================================================
// Constants
// =============================================================================

const CHALLENGE_TYPES: { key: ChallengeType; emoji: string; labelKey: string }[] = [
  { key: '52week', emoji: '\uD83D\uDCB0', labelKey: 'challenges.52week' },
  { key: 'roundUp', emoji: '\uD83D\uDD1D', labelKey: 'challenges.roundUp' },
  { key: 'noSpend', emoji: '\uD83D\uDEAB', labelKey: 'challenges.noSpend' },
  { key: 'custom', emoji: '\u2728', labelKey: 'challenges.custom' },
];

const STATUS_VARIANT: Record<string, 'positive' | 'info' | 'negative'> = {
  active: 'positive',
  completed: 'info',
  abandoned: 'negative',
};

function getDefaultsForType(type: ChallengeType) {
  const now = new Date();
  switch (type) {
    case '52week':
      return {
        targetAmount: 1378,
        totalItems: 52,
        startDate: now.toISOString().slice(0, 10),
        endDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
          .toISOString()
          .slice(0, 10),
      };
    case 'noSpend':
      return {
        targetAmount: 3000,
        totalItems: 28,
        startDate: now.toISOString().slice(0, 10),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .slice(0, 10),
      };
    case 'roundUp':
      return {
        targetAmount: 500,
        totalItems: 26,
        startDate: now.toISOString().slice(0, 10),
        endDate: new Date(now.getFullYear(), now.getMonth() + 6, now.getDate())
          .toISOString()
          .slice(0, 10),
      };
    case 'custom':
    default:
      return {
        targetAmount: 1000,
        totalItems: 30,
        startDate: now.toISOString().slice(0, 10),
        endDate: new Date(now.getFullYear(), now.getMonth() + 3, now.getDate())
          .toISOString()
          .slice(0, 10),
      };
  }
}

// =============================================================================
// SavingsChallengesScreen
// =============================================================================

export default function SavingsChallengesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const { valuesHidden } = useAuthStore();

  const {
    challenges,
    isLoading,
    loadChallenges,
    addChallenge,
    removeChallenge,
    checkInItem,
    uncheckItem,
    getTotalSaved,
    getActiveCount,
    getCompletedCount,
  } = useSavingsChallengeStore();

  const styles = useMemo(() => createStyles(colors), [colors]);

  // ---- Bottom sheet state ----
  const [sheetVisible, setSheetVisible] = useState(false);
  const [formType, setFormType] = useState<ChallengeType>('52week');
  const [formName, setFormName] = useState('');
  const [formTarget, setFormTarget] = useState('');

  useEffect(() => {
    loadChallenges();
  }, []);

  // Reset form defaults when type changes
  useEffect(() => {
    const defaults = getDefaultsForType(formType);
    const typeInfo = CHALLENGE_TYPES.find((ct) => ct.key === formType);
    setFormName(t(typeInfo?.labelKey ?? 'challenges.custom'));
    setFormTarget(String(defaults.targetAmount));
  }, [formType, t]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const displayVal = useCallback(
    (v: number) => (valuesHidden ? maskValue('', currency) : formatCurrency(v, currency)),
    [valuesHidden, currency],
  );

  // Compute a simple streak: count of consecutive days with at least one check-in across active challenges
  const streak = useMemo(() => {
    const activeChallenges = challenges.filter((c) => c.status === 'active');
    if (activeChallenges.length === 0) return 0;
    // Simple heuristic: sum of checked items across all active challenges, capped for display
    const totalChecked = activeChallenges.reduce((s, c) => s + c.checkedItems.length, 0);
    return Math.min(totalChecked, 99);
  }, [challenges]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleOpenSheet = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormType('52week');
    setSheetVisible(true);
  }, []);

  const handleSaveChallenge = useCallback(() => {
    const parsed = parseFloat(formTarget.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) return;

    const defaults = getDefaultsForType(formType);
    const typeInfo = CHALLENGE_TYPES.find((ct) => ct.key === formType);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    addChallenge({
      name: formName || t(typeInfo?.labelKey ?? 'challenges.custom'),
      type: formType,
      status: 'active',
      targetAmount: parsed,
      startDate: defaults.startDate,
      endDate: defaults.endDate,
      emoji: typeInfo?.emoji ?? '\u2728',
      color: colors.accent,
      totalItems: defaults.totalItems,
    });

    setSheetVisible(false);
  }, [formType, formName, formTarget, addChallenge, t]);

  const handleDeleteChallenge = useCallback(
    (id: string, name: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        t('challenges.deleteTitle'),
        t('challenges.deleteMessage').replace('{name}', name),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => removeChallenge(id),
          },
        ],
      );
    },
    [removeChallenge, t],
  );

  const handleCheckIn = useCallback(
    (challengeId: string, itemIndex: number, isChecked: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (isChecked) {
        uncheckItem(challengeId, itemIndex);
      } else {
        checkInItem(challengeId, itemIndex);
      }
    },
    [checkInItem, uncheckItem],
  );

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
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
          <Text style={styles.headerTitle}>{t('challenges.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.scrollContent}>
          <SkeletonList count={4} />
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const totalSaved = getTotalSaved();
  const activeCount = getActiveCount();

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
        <Text style={styles.headerTitle}>{t('challenges.title')}</Text>
        <TouchableOpacity
          onPress={handleOpenSheet}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.addButtonText, { color: colors.accent }]}>
            + {t('challenges.addChallenge')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ---- Hero Card ---- */}
        <Card variant="glow" delay={100}>
          <Text style={styles.heroAmount}>{displayVal(totalSaved)}</Text>
          <Text style={styles.heroLabel}>{t('challenges.totalSaved')}</Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{activeCount}</Text>
              <Text style={styles.heroStatLabel}>{t('challenges.active')}</Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{getCompletedCount()}</Text>
              <Text style={styles.heroStatLabel}>{t('challenges.completed')}</Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>
                {streak} {'\uD83D\uDD25'}
              </Text>
              <Text style={styles.heroStatLabel}>{t('challenges.streak')}</Text>
            </View>
          </View>
        </Card>

        {/* ---- Challenge Cards ---- */}
        {challenges.map((challenge, index) => {
          const progress =
            challenge.targetAmount > 0
              ? challenge.currentAmount / challenge.targetAmount
              : 0;
          const statusVariant = STATUS_VARIANT[challenge.status] ?? 'neutral';
          const gridCount = challenge.totalItems;

          return (
            <Card
              key={challenge.id}
              delay={200 + index * 80}
              style={styles.challengeCard}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onLongPress={() => handleDeleteChallenge(challenge.id, challenge.name)}
                delayLongPress={600}
              >
                {/* Top row: emoji + name + badge */}
                <View style={styles.challengeTopRow}>
                  <View style={styles.challengeNameRow}>
                    <Text style={styles.challengeEmoji}>{challenge.emoji}</Text>
                    <Text style={styles.challengeName} numberOfLines={1}>
                      {challenge.name}
                    </Text>
                  </View>
                  <Badge
                    value={t(`challenges.status.${challenge.status}`)}
                    variant={statusVariant}
                    size="sm"
                  />
                </View>

                {/* Progress ring + text */}
                <View style={styles.progressRow}>
                  <CircularProgress
                    progress={Math.min(progress, 1)}
                    size={72}
                    strokeWidth={7}
                    color={challenge.color || colors.accent}
                  >
                    <Text
                      style={[
                        styles.progressPct,
                        { color: challenge.color || colors.accent },
                      ]}
                    >
                      {Math.round(Math.min(progress, 1) * 100)}%
                    </Text>
                  </CircularProgress>

                  <View style={styles.progressInfo}>
                    <Text style={styles.progressAmountMain}>
                      {displayVal(challenge.currentAmount)}
                    </Text>
                    <Text style={styles.progressAmountMuted}>
                      / {displayVal(challenge.targetAmount)}
                    </Text>
                    <Text style={styles.progressItems}>
                      {challenge.checkedItems.length} / {challenge.totalItems}{' '}
                      {t('challenges.items')}
                    </Text>
                  </View>
                </View>

                {/* Check-in grid */}
                <View style={styles.gridContainer}>
                  {Array.from({ length: gridCount }, (_, i) => {
                    const itemIndex = i + 1;
                    const isChecked = challenge.checkedItems.includes(itemIndex);
                    return (
                      <TouchableOpacity
                        key={itemIndex}
                        style={[
                          styles.gridCircle,
                          isChecked
                            ? { backgroundColor: challenge.color || colors.accent }
                            : {
                                borderWidth: 1.5,
                                borderColor: colors.border,
                                backgroundColor: 'transparent',
                              },
                        ]}
                        activeOpacity={0.6}
                        onPress={() =>
                          handleCheckIn(challenge.id, itemIndex, isChecked)
                        }
                      />
                    );
                  })}
                </View>

                {/* Type label */}
                <Text style={styles.typeLabel}>
                  {CHALLENGE_TYPES.find((ct) => ct.key === challenge.type)?.emoji}{' '}
                  {t(
                    CHALLENGE_TYPES.find((ct) => ct.key === challenge.type)?.labelKey ??
                      'challenges.custom',
                  )}
                </Text>
              </TouchableOpacity>
            </Card>
          );
        })}

        {/* Empty state */}
        {challenges.length === 0 && (
          <Card delay={200}>
            <Text style={styles.emptyText}>{t('challenges.empty')}</Text>
            <Button
              title={t('challenges.addChallenge')}
              onPress={handleOpenSheet}
              variant="secondary"
              style={{ marginTop: spacing.lg }}
            />
          </Card>
        )}
      </ScrollView>

      {/* ---- Add Challenge BottomSheet ---- */}
      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title={t('challenges.addChallenge')}
      >
        <View style={styles.sheetContent}>
          {/* Type selector pills */}
          <Text style={styles.sheetLabel}>{t('challenges.type')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typePillsRow}
          >
            {CHALLENGE_TYPES.map((ct) => {
              const isSelected = formType === ct.key;
              return (
                <TouchableOpacity
                  key={ct.key}
                  style={[
                    styles.typePill,
                    isSelected && {
                      backgroundColor: colors.accent,
                      borderColor: colors.accent,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setFormType(ct.key);
                  }}
                >
                  <Text
                    style={[
                      styles.typePillText,
                      isSelected && { color: colors.background },
                    ]}
                  >
                    {ct.emoji} {t(ct.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Name input */}
          <Input
            label={t('challenges.name')}
            value={formName}
            onChangeText={setFormName}
            placeholder={t('challenges.namePlaceholder')}
          />

          {/* Target amount input */}
          <Input
            label={t('challenges.targetAmount')}
            value={formTarget}
            onChangeText={setFormTarget}
            keyboardType="numeric"
            placeholder="0"
          />

          {/* Save button */}
          <Button
            title={t('challenges.save')}
            onPress={handleSaveChallenge}
          />
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
    addButtonText: {
      fontSize: 14,
      fontWeight: '700',
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 100,
    },

    // Hero
    heroAmount: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.text.primary,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },
    heroLabel: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    heroStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroStat: {
      flex: 1,
      alignItems: 'center',
    },
    heroStatValue: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    heroStatLabel: {
      fontSize: 12,
      color: colors.text.muted,
      marginTop: 2,
    },
    heroStatDivider: {
      width: 1,
      height: 28,
      marginHorizontal: spacing.sm,
    },

    // Challenge card
    challengeCard: {
      // Card base already provides padding/margin
    },
    challengeTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    challengeNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: spacing.sm,
    },
    challengeEmoji: {
      fontSize: 22,
      marginRight: spacing.sm,
    },
    challengeName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
      flex: 1,
    },

    // Progress
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    progressPct: {
      fontSize: 14,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    progressInfo: {
      flex: 1,
      marginLeft: spacing.lg,
    },
    progressAmountMain: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    progressAmountMuted: {
      fontSize: 14,
      fontWeight: '400',
      color: colors.text.muted,
      fontVariant: ['tabular-nums'],
      marginBottom: spacing.xs,
    },
    progressItems: {
      fontSize: 12,
      color: colors.text.secondary,
      fontVariant: ['tabular-nums'],
    },

    // Grid
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      marginBottom: spacing.md,
    },
    gridCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
    },

    // Type label
    typeLabel: {
      fontSize: 12,
      color: colors.text.muted,
      fontWeight: '600',
    },

    // Empty state
    emptyText: {
      fontSize: 15,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
    },

    // Bottom sheet
    sheetContent: {
      paddingBottom: spacing.xxl,
    },
    sheetLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.secondary,
      marginBottom: spacing.sm,
    },
    typePillsRow: {
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    typePill: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typePillText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.secondary,
    },
  });
