import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useComparisonStore } from '../src/stores/comparisonStore';
import { Header } from '../src/components/shared/Header';
import { Card } from '../src/components/ui/Card';
import { BottomSheet } from '../src/components/shared/BottomSheet';
import { MetricComparisonBar } from '../src/components/charts/MetricComparisonBar';
import { AppIcon } from '../src/hooks/useIcon';
import { SkeletonCard } from '../src/components/skeletons/Skeleton';

export default function ComparisonScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const {
    selectedAssets,
    availableAssets,
    isLoading,
    loadAvailable,
    addAsset,
    removeAsset,
    clearAll,
  } = useComparisonStore();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [sheetVisible, setSheetVisible] = useState(false);

  useEffect(() => {
    loadAvailable();
  }, []);

  const handleAddAsset = useCallback(
    (ticker: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      addAsset(ticker);
      setSheetVisible(false);
    },
    [addAsset],
  );

  const handleRemoveAsset = useCallback(
    (ticker: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      removeAsset(ticker);
    },
    [removeAsset],
  );

  const handleClear = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearAll();
  }, [clearAll]);

  const handleOpenSheet = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSheetVisible(true);
  }, []);

  // Assets available in the sheet (not already selected)
  const sheetAssets = useMemo(
    () => availableAssets.filter((a) => !selectedAssets.some((s) => s.ticker === a.ticker)),
    [availableAssets, selectedAssets],
  );

  // Build metric items from selected assets
  const buildItems = useCallback(
    (key: keyof (typeof selectedAssets)[0]) =>
      selectedAssets.map((a) => ({ label: a.ticker, value: a[key] as number, color: a.color })),
    [selectedAssets],
  );

  const canCompare = selectedAssets.length >= 2;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('comparison.compareTitle')}</Text>
        <TouchableOpacity onPress={handleClear} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.clearText}>{t('comparison.clear')}</Text>
        </TouchableOpacity>
      </View>

      {/* Asset selector pills */}
      <View style={styles.pillRow}>
        {selectedAssets.map((asset) => (
          <TouchableOpacity
            key={asset.ticker}
            style={[styles.pill, { backgroundColor: asset.color + '25', borderColor: asset.color }]}
            onPress={() => handleRemoveAsset(asset.ticker)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, { color: asset.color }]}>{asset.ticker}</Text>
            <AppIcon name="close" size={14} color={asset.color} />
          </TouchableOpacity>
        ))}
        {selectedAssets.length < 3 && (
          <TouchableOpacity style={styles.addPill} onPress={handleOpenSheet} activeOpacity={0.7}>
            <AppIcon name="add" size={18} color={colors.accent} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.scrollContent}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : !canCompare ? (
        <View style={styles.emptyContainer}>
          <AppIcon name="comparison" size={48} color={colors.text.muted} />
          <Text style={styles.emptyText}>{t('comparison.minTwo')}</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* YTD Return */}
          <Card delay={100}>
            <MetricComparisonBar
              metricLabel={t('comparison.ytdReturn')}
              items={buildItems('ytdReturn')}
              format="pct"
            />
          </Card>

          {/* 12M Return */}
          <Card delay={150}>
            <MetricComparisonBar
              metricLabel={t('comparison.return12m')}
              items={buildItems('return12m')}
              format="pct"
            />
          </Card>

          {/* Volatility */}
          <Card delay={200}>
            <MetricComparisonBar
              metricLabel={t('comparison.volatility')}
              items={buildItems('volatility')}
              format="pct"
            />
          </Card>

          {/* Dividend Yield */}
          <Card delay={250}>
            <MetricComparisonBar
              metricLabel={t('comparison.dividendYield')}
              items={buildItems('dividendYield')}
              format="pct"
            />
          </Card>

          {/* P/E */}
          <Card delay={300}>
            <MetricComparisonBar
              metricLabel={t('comparison.pe')}
              items={buildItems('pe')}
              format="ratio"
            />
          </Card>

          {/* Market Cap */}
          <Card delay={350}>
            <MetricComparisonBar
              metricLabel={t('comparison.marketCap')}
              items={buildItems('marketCap')}
              format="currency"
            />
          </Card>
        </ScrollView>
      )}

      {/* Bottom Sheet for adding assets */}
      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title={t('comparison.available')}
      >
        {sheetAssets.length === 0 ? (
          <Text style={styles.sheetEmpty}>{t('comparison.maxThree')}</Text>
        ) : (
          <FlatList
            data={sheetAssets}
            keyExtractor={(item) => item.ticker}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.sheetRow}
                onPress={() => handleAddAsset(item.ticker)}
                activeOpacity={0.7}
              >
                <View style={[styles.sheetDot, { backgroundColor: item.color }]} />
                <View style={styles.sheetInfo}>
                  <Text style={styles.sheetTicker}>{item.ticker}</Text>
                  <Text style={styles.sheetName} numberOfLines={1}>{item.name}</Text>
                </View>
                <AppIcon name="add" size={20} color={colors.accent} />
              </TouchableOpacity>
            )}
          />
        )}
      </BottomSheet>
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
    clearText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.accent,
    },
    pillRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.lg,
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
      borderWidth: 1,
      gap: spacing.xs,
    },
    pillText: {
      fontSize: 13,
      fontWeight: '700',
    },
    addPill: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.accent,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 100,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 80,
    },
    emptyText: {
      fontSize: 15,
      color: colors.text.muted,
      marginTop: spacing.lg,
      textAlign: 'center',
    },
    sheetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border + '40',
    },
    sheetDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: spacing.md,
    },
    sheetInfo: {
      flex: 1,
    },
    sheetTicker: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text.primary,
    },
    sheetName: {
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 2,
    },
    sheetEmpty: {
      fontSize: 14,
      color: colors.text.muted,
      textAlign: 'center',
      paddingVertical: spacing.xxl,
    },
  });
