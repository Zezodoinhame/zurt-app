import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useRebalanceStore } from '../src/stores/rebalanceStore';
import { Card } from '../src/components/ui/Card';
import { ComparisonBar } from '../src/components/charts/ComparisonBar';
import { AppIcon } from '../src/hooks/useIcon';
import { formatCurrency, maskValue } from '../src/utils/formatters';

export default function RebalanceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const currency = useSettingsStore((s) => s.currency);
  const { valuesHidden, isDemoMode } = useAuthStore();
  const {
    targetAllocations,
    result,
    loadTargets,
    setTargetPercentage,
    resetToDefaults,
    calculateRebalance,
    saveTargets,
  } = useRebalanceStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    loadTargets();
  }, []);

  const totalTarget = targetAllocations.reduce((s, t) => s + t.targetPct, 0);
  const isValid = Math.abs(totalTarget - 100) < 0.1;

  const displayVal = (v: number) => (valuesHidden ? maskValue('') : formatCurrency(v, currency));

  const handleSave = useCallback(() => {
    if (!isValid) {
      Alert.alert(t('rebalance.error'), t('rebalance.totalMust100'));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    calculateRebalance();
    saveTargets();
  }, [isValid, calculateRebalance, saveTargets, t]);

  const handleReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetToDefaults();
  }, [resetToDefaults]);

  const comparisonData = targetAllocations.map((a) => ({
    label: a.label,
    current: a.currentPct,
    target: a.targetPct,
    color: a.color,
  }));

  const actionColor = (action: string) => {
    if (action === 'BUY') return colors.positive;
    if (action === 'SELL') return colors.negative;
    return colors.text.muted;
  };

  const actionLabel = (action: string) => {
    if (action === 'BUY') return t('rebalance.buy');
    if (action === 'SELL') return t('rebalance.sell');
    return t('rebalance.hold');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('rebalance.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {!isDemoMode && (
        <View style={{ backgroundColor: colors.elevated, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, marginHorizontal: spacing.xl, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ fontSize: 13, color: colors.text.secondary }}>{'\uD83D\uDD1C'} {t('common.featureInDevelopment')}</Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Comparison */}
        <Card delay={100}>
          <Text style={styles.sectionTitle}>{t('rebalance.comparison')}</Text>
          <ComparisonBar data={comparisonData} />
        </Card>

        {/* Target Editor */}
        <Card delay={200}>
          <Text style={styles.sectionTitle}>{t('rebalance.targetEditor')}</Text>
          {targetAllocations.map((alloc) => (
            <View key={alloc.class} style={styles.editorRow}>
              <View style={[styles.editorDot, { backgroundColor: alloc.color }]} />
              <Text style={styles.editorLabel} numberOfLines={1}>{alloc.label}</Text>
              <Text style={styles.editorCurrent}>{alloc.currentPct.toFixed(1)}%</Text>
              <TextInput
                style={[
                  styles.editorInput,
                  { borderColor: colors.border, color: colors.text.primary, backgroundColor: colors.input },
                ]}
                keyboardType="numeric"
                value={String(alloc.targetPct)}
                onChangeText={(txt) => {
                  const val = parseFloat(txt) || 0;
                  setTargetPercentage(alloc.class, val);
                }}
                maxLength={5}
              />
              <Text style={styles.editorPct}>%</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('rebalance.total')}</Text>
            <Text style={[styles.totalValue, { color: isValid ? colors.positive : colors.negative }]}>
              {totalTarget.toFixed(1)}%
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.elevated, borderColor: colors.border, borderWidth: 1 }]}
              onPress={handleReset}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnText, { color: colors.text.secondary }]}>{t('rebalance.reset')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.accent }]}
              onPress={handleSave}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnText, { color: colors.background }]}>{t('rebalance.calculate')}</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Suggested Trades */}
        {result && (
          <Card delay={300}>
            <Text style={styles.sectionTitle}>{t('rebalance.suggestedTrades')}</Text>
            {result.trades.map((trade) => (
              <View key={trade.class} style={styles.tradeRow}>
                <View style={[styles.editorDot, { backgroundColor: trade.color }]} />
                <Text style={styles.tradeLabel} numberOfLines={1}>{trade.label}</Text>
                <View style={[styles.actionBadge, { backgroundColor: actionColor(trade.action) + '20' }]}>
                  <Text style={[styles.actionBadgeText, { color: actionColor(trade.action) }]}>
                    {actionLabel(trade.action)}
                  </Text>
                </View>
                <Text style={styles.tradeAmount}>{displayVal(trade.amount)}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Cost Summary */}
        {result && (
          <Card variant="elevated" delay={400}>
            <Text style={styles.sectionTitle}>{t('rebalance.costSummary')}</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('rebalance.totalBuy')}</Text>
              <Text style={[styles.summaryValue, { color: colors.positive }]}>{displayVal(result.totalBuy)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('rebalance.totalSell')}</Text>
              <Text style={[styles.summaryValue, { color: colors.negative }]}>{displayVal(result.totalSell)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('rebalance.estimatedTax')}</Text>
              <Text style={styles.summaryValue}>{displayVal(result.estimatedTax)}</Text>
            </View>
            <View style={[styles.summaryRow, { borderBottomWidth: 0, paddingTop: spacing.md }]}>
              <Text style={[styles.summaryLabel, { fontWeight: '700' }]}>{t('rebalance.netCash')}</Text>
              <Text style={[styles.summaryValue, { fontWeight: '800' }]}>
                {displayVal(Math.abs(result.netCashRequired))}
                {result.netCashRequired < 0 ? ` (${t('rebalance.surplus')})` : ''}
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
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
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.lg,
    },
    editorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    editorDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: spacing.sm,
    },
    editorLabel: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.primary,
    },
    editorCurrent: {
      fontSize: 12,
      color: colors.text.muted,
      marginRight: spacing.sm,
      fontVariant: ['tabular-nums'],
      width: 44,
      textAlign: 'right',
    },
    editorInput: {
      width: 56,
      borderWidth: 1,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'right',
      fontVariant: ['tabular-nums'],
    },
    editorPct: {
      fontSize: 12,
      color: colors.text.muted,
      marginLeft: 2,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: spacing.sm,
    },
    totalLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text.primary,
    },
    totalValue: {
      fontSize: 14,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    buttonRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    btn: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      alignItems: 'center',
    },
    btnText: {
      fontSize: 14,
      fontWeight: '700',
    },
    tradeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    tradeLabel: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.primary,
    },
    actionBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.sm,
      marginRight: spacing.sm,
    },
    actionBadgeText: {
      fontSize: 10,
      fontWeight: '800',
    },
    tradeAmount: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border + '40',
    },
    summaryLabel: {
      fontSize: 14,
      color: colors.text.secondary,
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
  });
