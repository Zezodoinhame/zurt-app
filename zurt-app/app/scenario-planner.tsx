import React, { useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useScenarioStore } from '../src/stores/scenarioStore';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { AppIcon } from '../src/hooks/useIcon';
import { formatCurrency, maskValue } from '../src/utils/formatters';
import type { AssetClass, ScenarioType } from '../src/types';

const CLASS_KEYS: { key: AssetClass; translationKey: string }[] = [
  { key: 'stocks', translationKey: 'scenario.stocks' },
  { key: 'fiis', translationKey: 'scenario.fiis' },
  { key: 'fixedIncome', translationKey: 'scenario.fixedIncome' },
  { key: 'crypto', translationKey: 'scenario.crypto' },
  { key: 'international', translationKey: 'scenario.international' },
  { key: 'pension', translationKey: 'scenario.pension' },
];

// ===========================================================================
// ScenarioPlannerScreen
// ===========================================================================

export default function ScenarioPlannerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const { valuesHidden, isDemoMode } = useAuthStore();

  const {
    presets, selectedType, customChanges, result,
    loadPresets, selectPreset, setCustomChange, applyScenario,
  } = useScenarioStore();

  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    loadPresets();
  }, []);

  useEffect(() => {
    if (selectedType) applyScenario();
  }, [selectedType, customChanges]);

  const displayValue = (value: number) =>
    valuesHidden ? maskValue('') : formatCurrency(value, currency);

  const handleSelectPreset = useCallback(
    (type: ScenarioType) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      selectPreset(type);
    },
    [selectPreset],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24 }]}>
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
        <Text style={styles.headerTitle}>{t('scenario.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {!isDemoMode && (
        <View style={{ backgroundColor: colors.elevated, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, marginHorizontal: spacing.xl, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ fontSize: 13, color: colors.text.secondary }}>{'\uD83D\uDD1C'} {t('common.featureInDevelopment')}</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Preset cards (horizontal scroll) */}
        <Text style={styles.sectionTitle}>{t('scenario.presets')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsRow}
        >
          {presets.map((preset) => {
            const isActive = selectedType === preset.type;
            return (
              <TouchableOpacity
                key={preset.type}
                style={[
                  styles.presetCard,
                  isActive && { borderColor: colors.accent, backgroundColor: colors.accent + '15' },
                ]}
                onPress={() => handleSelectPreset(preset.type)}
                activeOpacity={0.7}
              >
                <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                <Text style={[styles.presetLabel, isActive && { color: colors.accent }]}>
                  {preset.label}
                </Text>
                <Text style={styles.presetDesc} numberOfLines={2}>
                  {preset.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Custom sliders (when custom is selected) */}
        {selectedType === 'custom' && (
          <Card delay={100}>
            <Text style={styles.sectionTitle}>{t('scenario.customSliders')}</Text>
            {CLASS_KEYS.map((cls) => (
              <View key={cls.key} style={styles.sliderRow}>
                <Text style={styles.sliderLabel}>{t(cls.translationKey)}</Text>
                <View style={styles.sliderBar}>
                  <View
                    style={[
                      styles.sliderFill,
                      {
                        width: `${Math.min(Math.abs(customChanges[cls.key]) / 60 * 100, 100)}%`,
                        backgroundColor: customChanges[cls.key] >= 0 ? colors.positive + '60' : colors.negative + '60',
                      },
                    ]}
                  />
                </View>
                <View style={styles.sliderButtons}>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCustomChange(cls.key, Math.max(-60, customChanges[cls.key] - 5));
                    }}
                    style={styles.sliderBtn}
                  >
                    <Text style={styles.sliderBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.sliderValue,
                      { color: customChanges[cls.key] >= 0 ? colors.positive : colors.negative },
                    ]}
                  >
                    {customChanges[cls.key] > 0 ? '+' : ''}{customChanges[cls.key]}%
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCustomChange(cls.key, Math.min(60, customChanges[cls.key] + 5));
                    }}
                    style={styles.sliderBtn}
                  >
                    <Text style={styles.sliderBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Results */}
        {result && selectedType && (
          <>
            {/* Summary */}
            <Card variant="glow" delay={200}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>{t('scenario.currentValue')}</Text>
                  <Text style={styles.summaryValue}>{displayValue(result.currentValue)}</Text>
                </View>
                <View style={styles.summaryArrow}>
                  <Text style={styles.summaryArrowText}>→</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>{t('scenario.projectedValue')}</Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      { color: result.totalChangePct >= 0 ? colors.positive : colors.negative },
                    ]}
                  >
                    {displayValue(result.projectedValue)}
                  </Text>
                </View>
              </View>
              <View style={styles.changeRow}>
                <Text style={styles.changeLabel}>{t('scenario.totalChange')}</Text>
                <Badge
                  value={`${result.totalChangePct >= 0 ? '+' : ''}${result.totalChangePct.toFixed(1)}% (${displayValue(result.totalChange)})`}
                  variant={result.totalChangePct >= 0 ? 'positive' : 'negative'}
                  size="sm"
                />
              </View>
            </Card>

            {/* Per class impact */}
            <Card delay={300}>
              <Text style={styles.sectionTitle}>{t('scenario.perClass')}</Text>
              {result.perClass.map((cls) => (
                <View key={cls.class} style={styles.classRow}>
                  <View style={styles.classHeader}>
                    <View style={[styles.classDot, { backgroundColor: cls.color }]} />
                    <Text style={styles.classLabel} numberOfLines={1}>{cls.label}</Text>
                    <Text
                      style={[
                        styles.classPct,
                        { color: cls.changePct >= 0 ? colors.positive : colors.negative },
                      ]}
                    >
                      {cls.changePct >= 0 ? '+' : ''}{cls.changePct}%
                    </Text>
                  </View>
                  <View style={styles.classValues}>
                    <Text style={styles.classCurrentValue} numberOfLines={1}>{displayValue(cls.currentValue)}</Text>
                    <Text style={styles.classArrow}>→</Text>
                    <Text
                      style={[
                        styles.classProjectedValue,
                        { color: cls.changePct >= 0 ? colors.positive : colors.negative },
                      ]}
                      numberOfLines={1}
                    >
                      {displayValue(cls.projectedValue)}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Empty state */}
        {!selectedType && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{'\uD83C\uDFB2'}</Text>
            <Text style={styles.emptyText}>{t('scenario.noData')}</Text>
          </View>
        )}
      </ScrollView>
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
    scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: 100 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.md },

    // Presets
    presetsRow: { gap: spacing.sm, marginBottom: spacing.lg, paddingRight: spacing.xl },
    presetCard: {
      width: 140, backgroundColor: colors.card, borderRadius: radius.lg,
      borderWidth: 1, borderColor: colors.border, padding: spacing.md,
    },
    presetEmoji: { fontSize: 28, marginBottom: spacing.xs },
    presetLabel: { fontSize: 14, fontWeight: '700', color: colors.text.primary, marginBottom: 2 },
    presetDesc: { fontSize: 11, color: colors.text.muted, lineHeight: 16 },

    // Sliders
    sliderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
    sliderLabel: { width: 80, fontSize: 12, fontWeight: '600', color: colors.text.secondary },
    sliderBar: {
      flex: 1, height: 8, backgroundColor: colors.border, borderRadius: 4,
      overflow: 'hidden', marginHorizontal: spacing.sm,
    },
    sliderFill: { height: 8, borderRadius: 4 },
    sliderButtons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    sliderBtn: {
      width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    sliderBtnText: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
    sliderValue: { width: 44, fontSize: 12, fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'] },

    // Summary
    summaryRow: { flexDirection: 'row', alignItems: 'center' },
    summaryItem: { flex: 1 },
    summaryArrow: { paddingHorizontal: spacing.sm },
    summaryArrowText: { fontSize: 20, color: colors.text.muted },
    summaryLabel: { fontSize: 12, color: colors.text.muted, marginBottom: 2 },
    summaryValue: { fontSize: 22, fontWeight: '700', color: colors.text.primary, fontVariant: ['tabular-nums'] },
    changeRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
    },
    changeLabel: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },

    // Per class
    classRow: { marginBottom: spacing.md },
    classHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    classDot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm },
    classLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.text.secondary },
    classValues: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 10 + spacing.sm },
    classCurrentValue: { fontSize: 12, color: colors.text.muted, fontVariant: ['tabular-nums'] },
    classArrow: { fontSize: 10, color: colors.text.muted },
    classProjectedValue: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
    classPct: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'], marginLeft: 'auto' },

    // Empty
    emptyState: { alignItems: 'center', paddingVertical: spacing.xxxl },
    emptyEmoji: { fontSize: 56, marginBottom: spacing.lg },
    emptyText: { fontSize: 16, fontWeight: '600', color: colors.text.secondary },
  });
