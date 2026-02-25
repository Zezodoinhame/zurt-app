import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useNetWorthStore } from '../src/stores/netWorthStore';
import { Header } from '../src/components/shared/Header';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { LineChart } from '../src/components/charts/LineChart';
import { BottomSheet } from '../src/components/shared/BottomSheet';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { AppIcon } from '../src/hooks/useIcon';
import { SkeletonList } from '../src/components/skeletons/Skeleton';
import { formatCurrency, formatPct, maskValue } from '../src/utils/formatters';

// ===========================================================================
// NetWorthScreen
// ===========================================================================

export default function NetWorthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const { valuesHidden } = useAuthStore();
  const { summary, isLoading, loadNetWorth, addMilestone, removeMilestone } = useNetWorthStore();

  const styles = useMemo(() => createStyles(colors), [colors]);

  // Bottom sheet state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formValue, setFormValue] = useState('');

  useEffect(() => {
    loadNetWorth();
  }, []);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const displayVal = useCallback(
    (v: number) => (valuesHidden ? maskValue('', currency) : formatCurrency(v, currency)),
    [valuesHidden, currency],
  );

  const chartData = useMemo(() => {
    if (!summary) return [];
    return summary.timeline.map((p) => ({
      label: p.date.slice(5),
      value: p.netWorth,
    }));
  }, [summary]);

  const growthVariant = useCallback(
    (value: number): 'positive' | 'negative' | 'neutral' => {
      if (value > 0) return 'positive';
      if (value < 0) return 'negative';
      return 'neutral';
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Form handlers
  // ---------------------------------------------------------------------------

  const resetForm = useCallback(() => {
    setFormName('');
    setFormDate('');
    setFormValue('');
  }, []);

  const handleOpenSheet = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetForm();
    setSheetVisible(true);
  }, [resetForm]);

  const handleAddMilestone = useCallback(() => {
    if (!formName.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addMilestone({
      label: formName.trim(),
      emoji: '\uD83C\uDFAF',
      date: formDate || new Date().toISOString().slice(0, 7),
      value: parseFloat(formValue) || 0,
    });
    resetForm();
    setSheetVisible(false);
  }, [formName, formDate, formValue, addMilestone, resetForm]);

  const handleRemoveMilestone = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      removeMilestone(id);
    },
    [removeMilestone],
  );

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel={t('common.back')}
          >
            <AppIcon name="back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('netWorth.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.scrollContent}>
          <SkeletonList count={6} />
        </View>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel={t('common.back')}
          >
            <AppIcon name="back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('netWorth.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 60 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>{'\uD83C\uDFE6'}</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, textAlign: 'center', marginBottom: 8 }}>{t('netWorth.title')}</Text>
          <Text style={{ fontSize: 14, color: colors.text.secondary, textAlign: 'center', lineHeight: 20 }}>
            {t('netWorth.emptyDesc')}
          </Text>
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

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
          accessibilityLabel={t('common.back')}
        >
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('netWorth.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Summary Card */}
        <Card variant="glow" delay={0}>
          <Text style={styles.summaryLabel}>{t('netWorth.currentNetWorth')}</Text>
          <Text style={[styles.summaryHero, { color: accentColor }]}>
            {displayVal(summary.currentNetWorth)}
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text style={styles.subLabel}>{t('netWorth.totalAssets')}</Text>
              <Text style={[styles.subValue, { color: colors.positive }]}>
                {displayVal(summary.totalAssets)}
              </Text>
            </View>
            <View style={styles.summaryCol}>
              <Text style={styles.subLabel}>{t('netWorth.totalLiabilities')}</Text>
              <Text style={[styles.subValue, { color: colors.negative }]}>
                {displayVal(summary.totalLiabilities)}
              </Text>
            </View>
          </View>
        </Card>

        {/* KPI Row */}
        <View style={styles.kpiRow}>
          <Badge
            value={`${t('netWorth.momGrowth')} ${formatPct(summary.momGrowth)}`}
            variant={growthVariant(summary.momGrowth)}
            size="sm"
          />
          <Badge
            value={`${t('netWorth.yoyGrowth')} ${formatPct(summary.yoyGrowth)}`}
            variant={growthVariant(summary.yoyGrowth)}
            size="sm"
          />
          <Badge
            value={`${t('netWorth.allTimeGrowth')} ${formatPct(summary.allTimeGrowth)}`}
            variant={growthVariant(summary.allTimeGrowth)}
            size="sm"
          />
        </View>

        {/* Timeline Chart */}
        <Text style={styles.sectionTitle}>{t('netWorth.timeline')}</Text>
        <Card delay={100}>
          <LineChart data={chartData} height={200} color={accentColor} />
        </Card>

        {/* Milestones */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('netWorth.milestones')}</Text>
          <TouchableOpacity onPress={handleOpenSheet} activeOpacity={0.7}>
            <Text style={[styles.addButtonText, { color: accentColor }]}>
              + {t('netWorth.addMilestone')}
            </Text>
          </TouchableOpacity>
        </View>

        {summary.milestones.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{'\uD83C\uDFAF'}</Text>
            <Text style={styles.emptyText}>{t('netWorth.noMilestones')}</Text>
          </View>
        ) : (
          summary.milestones.map((m, idx) => (
            <Card key={m.id} delay={200 + idx * 60}>
              <TouchableOpacity
                style={styles.milestoneRow}
                activeOpacity={0.7}
                onLongPress={() => handleRemoveMilestone(m.id)}
              >
                <Text style={styles.milestoneEmoji}>{m.emoji}</Text>
                <View style={styles.milestoneInfo}>
                  <Text style={styles.milestoneName} numberOfLines={1}>
                    {m.label}
                  </Text>
                  <Text style={styles.milestoneDate}>{m.date}</Text>
                </View>
                <Text style={styles.milestoneValue}>{displayVal(m.value)}</Text>
              </TouchableOpacity>
            </Card>
          ))
        )}

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>

      {/* ---- Add Milestone Bottom Sheet ---- */}
      <BottomSheet
        visible={sheetVisible}
        onClose={() => {
          setSheetVisible(false);
          resetForm();
        }}
        title={t('netWorth.addMilestone')}
      >
        <View style={styles.sheetContent}>
          <Input
            label={t('netWorth.milestoneName')}
            value={formName}
            onChangeText={setFormName}
            placeholder="Ex: R$ 1M"
          />

          <Input
            label={t('netWorth.milestoneDate')}
            value={formDate}
            onChangeText={setFormDate}
            placeholder="2026-03"
          />

          <Input
            label={t('netWorth.milestoneValue')}
            value={formValue}
            onChangeText={setFormValue}
            placeholder="1000000"
            keyboardType="numeric"
          />

          <Button
            title={t('netWorth.addMilestone')}
            onPress={handleAddMilestone}
            variant="primary"
            size="lg"
            style={{ marginTop: spacing.xl }}
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

    // Header
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

    // Scroll content
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 100,
    },

    // Summary card
    summaryLabel: {
      fontSize: 13,
      color: colors.text.secondary,
      marginBottom: spacing.xs,
    },
    summaryHero: {
      fontSize: 32,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      marginBottom: spacing.md,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    summaryCol: {
      flex: 1,
    },
    subLabel: {
      fontSize: 12,
      color: colors.text.muted,
      marginBottom: 2,
    },
    subValue: {
      fontSize: 16,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },

    // KPI row
    kpiRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      flexWrap: 'wrap',
      marginTop: spacing.lg,
      marginBottom: spacing.lg,
    },

    // Section
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.md,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.lg,
      marginBottom: spacing.md,
    },

    // Add button text
    addButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },

    // Milestones
    milestoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    milestoneEmoji: {
      fontSize: 24,
      marginRight: spacing.md,
    },
    milestoneInfo: {
      flex: 1,
      marginRight: spacing.sm,
    },
    milestoneName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
    },
    milestoneDate: {
      fontSize: 12,
      color: colors.text.muted,
      marginTop: 2,
    },
    milestoneValue: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },

    // Empty state
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.xxxl,
    },
    emptyEmoji: {
      fontSize: 48,
      marginBottom: spacing.md,
    },
    emptyText: {
      fontSize: 14,
      color: colors.text.muted,
      textAlign: 'center',
    },

    // Bottom sheet
    sheetContent: {
      paddingBottom: spacing.xxl,
    },
  });
