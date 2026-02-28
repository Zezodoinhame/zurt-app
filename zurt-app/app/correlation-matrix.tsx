import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useCorrelationStore } from '../src/stores/correlationStore';
import { Card } from '../src/components/ui/Card';
import { CircularProgress } from '../src/components/charts/CircularProgress';
import { HeatMap } from '../src/components/charts/HeatMap';
import { AppIcon } from '../src/hooks/useIcon';
import { SkeletonCard, SkeletonList } from '../src/components/skeletons/Skeleton';

// ===========================================================================
// CorrelationMatrixScreen
// ===========================================================================

export default function CorrelationMatrixScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const { isDemoMode } = useAuthStore();

  const { matrix, selectedPair, isLoading, loadMatrix, selectPair, clearPair } = useCorrelationStore();

  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    loadMatrix();
  }, []);

  const handleCellPress = useCallback(
    (row: number, col: number) => {
      if (!matrix) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      selectPair(matrix.tickers[row], matrix.tickers[col]);
    },
    [matrix, selectPair],
  );

  const getInterpretation = useCallback(
    (value: number): string => {
      if (value >= 0.7) return t('correlation.highPositive');
      if (value >= 0.3) return t('correlation.lowPositive');
      if (value >= -0.3) return t('correlation.noCorrelation');
      if (value >= -0.7) return t('correlation.lowNegative');
      return t('correlation.highNegative');
    },
    [t],
  );

  const diversScore = matrix?.diversificationScore ?? 0;
  const diversColor = diversScore >= 70 ? colors.positive : diversScore >= 40 ? colors.warning : colors.negative;

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
        <Text style={styles.headerTitle}>{t('correlation.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {!isDemoMode && (
        <View style={{ backgroundColor: colors.elevated, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, marginHorizontal: spacing.xl, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ fontSize: 13, color: colors.text.secondary }}>{'\uD83D\uDD1C'} {t('common.featureInDevelopment')}</Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <SkeletonCard />
          <SkeletonList count={4} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Diversification Score */}
          <Card variant="glow" delay={0}>
            <View style={styles.scoreRow}>
              <CircularProgress progress={diversScore / 100} size={64} strokeWidth={6} color={diversColor}>
                <Text style={[styles.scoreValue, { color: diversColor }]}>{diversScore}</Text>
              </CircularProgress>
              <View style={styles.scoreInfo}>
                <Text style={styles.scoreLabel}>{t('correlation.diversification')}</Text>
                <Text style={styles.scoreDesc}>{t('correlation.diversificationDesc')}</Text>
              </View>
            </View>
          </Card>

          {/* Heat Map */}
          {matrix && (
            <Card delay={100}>
              <Text style={styles.sectionTitle}>{t('correlation.title')}</Text>
              <Text style={styles.hint}>{t('correlation.tapCell')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <HeatMap
                  tickers={matrix.tickers}
                  values={matrix.values}
                  onCellPress={handleCellPress}
                />
              </ScrollView>
            </Card>
          )}

          {/* Legend */}
          <Card delay={200}>
            <Text style={styles.sectionTitle}>{t('correlation.legend')}</Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#E85D5D' }]} />
                <Text style={styles.legendText}>-1 {t('correlation.negative')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
                <Text style={styles.legendText}>0 {t('correlation.neutral')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.legendText}>+1 {t('correlation.positive')}</Text>
              </View>
            </View>
          </Card>
        </ScrollView>
      )}

      {/* Pair Detail Modal */}
      <Modal visible={!!selectedPair} transparent animationType="fade" onRequestClose={clearPair}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={clearPair}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('correlation.pairDetail')}</Text>
            {selectedPair && (
              <>
                <Text style={styles.modalPair}>
                  {selectedPair.a} {t('correlation.vs')} {selectedPair.b}
                </Text>
                <Text style={styles.modalValue}>{selectedPair.value.toFixed(2)}</Text>
                <Text style={styles.modalInterpretation}>{getInterpretation(selectedPair.value)}</Text>
              </>
            )}
            <TouchableOpacity
              style={[styles.modalClose, { backgroundColor: colors.accent }]}
              onPress={clearPair}
            >
              <Text style={[styles.modalCloseText, { color: colors.background }]}>OK</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
    loadingContainer: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
    scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: 100 },

    // Score
    scoreRow: { flexDirection: 'row', alignItems: 'center' },
    scoreInfo: { flex: 1, marginLeft: spacing.lg },
    scoreLabel: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 2 },
    scoreDesc: { fontSize: 13, color: colors.text.muted },
    scoreValue: { fontSize: 16, fontWeight: '700' },

    // Section
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.sm },
    hint: { fontSize: 12, color: colors.text.muted, marginBottom: spacing.md },

    // Legend
    legendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 16, height: 16, borderRadius: 4 },
    legendText: { fontSize: 12, color: colors.text.secondary },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.xl,
      width: Dimensions.get('window').width - spacing.xl * 4,
      alignItems: 'center',
    },
    modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.md },
    modalPair: { fontSize: 18, fontWeight: '700', color: colors.accent, marginBottom: spacing.sm },
    modalValue: { fontSize: 36, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.sm },
    modalInterpretation: {
      fontSize: 13,
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
      lineHeight: 20,
    },
    modalClose: {
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
    },
    modalCloseText: { fontSize: 14, fontWeight: '600' },
  });
