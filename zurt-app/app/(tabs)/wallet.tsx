import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { type ThemeColors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { usePortfolioStore } from '../../src/stores/portfolioStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { AssetCard } from '../../src/components/cards/AssetCard';
import { BottomSheet } from '../../src/components/shared/BottomSheet';
import { MiniLineChart } from '../../src/components/charts/MiniLineChart';
import { SkeletonList } from '../../src/components/skeletons/Skeleton';
import { ErrorState } from '../../src/components/shared/ErrorState';
import { formatPct, maskValue, formatCurrency } from '../../src/utils/formatters';
import type { Asset, AssetClass, InstitutionId } from '../../src/types';
import { AppIcon } from '../../src/hooks/useIcon';
import { logger } from '../../src/utils/logger';
import { demoBenchmarks } from '../../src/data/demo';

// ---------------------------------------------------------------------------
// Label Maps
// ---------------------------------------------------------------------------

// assetClassLabels — resolved dynamically via t(`class.${cls}`) in the component

const institutionNames: Record<InstitutionId, string> = {
  xp: 'XP Investimentos',
  btg: 'BTG Pactual',
  nubank: 'Nubank',
  inter: 'Inter',
  binance: 'Binance',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type ViewMode = 'class' | 'institution';

export default function WalletScreen() {
  const insets = useSafeAreaInsets();

  // Stores
  const {
    assets,
    allocations,
    institutions,
    isLoading,
    isRefreshing,
    error,
    loadPortfolio,
    refresh,
  } = usePortfolioStore();
  const { valuesHidden } = useAuthStore();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const router = useRouter();

  // Memoised styles
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Local state
  const [viewMode, setViewMode] = useState<ViewMode>('class');
  const [expandedClasses, setExpandedClasses] = useState<Set<AssetClass>>(
    new Set()
  );
  const [expandedInstitutions, setExpandedInstitutions] = useState<
    Set<InstitutionId>
  >(new Set());
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [benchmarkPeriod, setBenchmarkPeriod] = useState<'1M' | '3M' | '6M' | '12M'>('1M');

  const summary = usePortfolioStore((s) => s.summary);

  // Load data on mount & expand first group
  useEffect(() => {
    loadPortfolio();
  }, []);

  // When allocations load, expand the first class group
  useEffect(() => {
    if (allocations.length > 0 && expandedClasses.size === 0) {
      setExpandedClasses(new Set([allocations[0].class]));
    }
  }, [allocations]);

  // When institutions load, expand the first institution group
  useEffect(() => {
    if (institutions.length > 0 && expandedInstitutions.size === 0) {
      setExpandedInstitutions(new Set([institutions[0].id]));
    }
  }, [institutions]);

  // Derived data: assets grouped by institution
  const assetsByInstitution = useMemo(() => {
    const map: Record<string, Asset[]> = {};
    for (const asset of assets) {
      if (!map[asset.institution]) map[asset.institution] = [];
      map[asset.institution].push(asset);
    }
    return map;
  }, [assets]);

  // Derived data: assets grouped by class
  const assetsByClass = useMemo(() => {
    const map: Record<string, Asset[]> = {};
    for (const asset of assets) {
      if (!map[asset.class]) map[asset.class] = [];
      map[asset.class].push(asset);
    }
    return map;
  }, [assets]);

  // Handlers
  const handleToggleViewMode = useCallback(
    (mode: ViewMode) => {
      if (mode !== viewMode) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setViewMode(mode);
      }
    },
    [viewMode]
  );

  const handleToggleClass = useCallback(
    (assetClass: AssetClass) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setExpandedClasses((prev) => {
        const next = new Set(prev);
        if (next.has(assetClass)) {
          next.delete(assetClass);
        } else {
          next.add(assetClass);
        }
        return next;
      });
    },
    []
  );

  const handleToggleInstitution = useCallback(
    (institutionId: InstitutionId) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setExpandedInstitutions((prev) => {
        const next = new Set(prev);
        if (next.has(institutionId)) {
          next.delete(institutionId);
        } else {
          next.add(institutionId);
        }
        return next;
      });
    },
    []
  );

  const handleAssetPress = useCallback((asset: Asset) => {
    logger.log('ASSET PRESS:', asset.name, 'ticker:', asset.ticker, 'class:', asset.class);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Block detail navigation for Renda Fixa and Previdência
    if (asset.class === 'fixedIncome' || asset.class === 'pension') {
      Alert.alert('', t('wallet.comingSoonDetail'));
      return;
    }
    // Navigate to full asset detail if ticker exists
    if (asset.ticker) {
      router.push({ pathname: '/asset-detail', params: { ticker: asset.ticker } });
      return;
    }
    // Fallback to bottom sheet for assets without ticker
    setSelectedAsset(asset);
    setSheetVisible(true);
  }, [router, t]);

  const handleCloseSheet = useCallback(() => {
    setSheetVisible(false);
    setSelectedAsset(null);
  }, []);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  // Value display helper
  const displayValue = useCallback(
    (formatted: string) => (valuesHidden ? maskValue(formatted) : formatted),
    [valuesHidden]
  );

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const renderToggle = () => (
    <View style={styles.toggleContainer}>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          viewMode === 'class' && styles.toggleButtonActive,
        ]}
        onPress={() => handleToggleViewMode('class')}
        activeOpacity={0.7}
        accessibilityLabel={t('wallet.byClass')}
        accessibilityRole="button"
      >
        <Text
          style={[
            styles.toggleText,
            viewMode === 'class' && styles.toggleTextActive,
          ]}
        >
          {t('wallet.byClass')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          viewMode === 'institution' && styles.toggleButtonActive,
        ]}
        onPress={() => handleToggleViewMode('institution')}
        activeOpacity={0.7}
        accessibilityLabel={t('wallet.byInstitution')}
        accessibilityRole="button"
      >
        <Text
          style={[
            styles.toggleText,
            viewMode === 'institution' && styles.toggleTextActive,
          ]}
        >
          {t('wallet.byInstitution')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderClassView = () =>
    allocations.map((allocation) => {
      const isExpanded = expandedClasses.has(allocation.class);
      const groupAssets = assetsByClass[allocation.class] ?? [];

      return (
        <View key={allocation.class}>
          <TouchableOpacity
            style={styles.groupHeader}
            onPress={() => handleToggleClass(allocation.class)}
            activeOpacity={0.7}
            accessibilityLabel={`${allocation.label}, ${groupAssets.length} ativos, ${formatCurrency(allocation.value, currency)}`}
          >
            <View style={styles.groupHeaderLeft}>
              <View
                style={[
                  styles.colorDot,
                  { backgroundColor: allocation.color },
                ]}
              />
              <View style={styles.groupHeaderInfo}>
                <View style={styles.groupHeaderTopRow}>
                  <Text style={styles.groupLabel}>{allocation.label}</Text>
                  <Text style={styles.groupCount}>
                    {groupAssets.length}{' '}
                    {groupAssets.length === 1 ? t('wallet.asset') : t('wallet.assets')}
                  </Text>
                </View>
                <View style={styles.groupHeaderBottomRow}>
                  <Text style={styles.groupValue}>
                    {displayValue(formatCurrency(allocation.value, currency))}
                  </Text>
                  <Text style={styles.groupPercentage}>
                    {formatPct(allocation.percentage, false)}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.expandIndicator}>
              {isExpanded ? '\u25BC' : '\u25B6'}
            </Text>
          </TouchableOpacity>

          {isExpanded &&
            groupAssets.map((asset, index) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                index={index}
                onPress={handleAssetPress}
                showInstitution
              />
            ))}
        </View>
      );
    });

  const renderInstitutionView = () =>
    institutions.map((institution) => {
      const isExpanded = expandedInstitutions.has(institution.id);
      const groupAssets = assetsByInstitution[institution.id] ?? [];
      const totalValue = groupAssets.reduce(
        (sum, a) => sum + a.currentValue,
        0
      );

      return (
        <View key={institution.id}>
          <TouchableOpacity
            style={styles.groupHeader}
            onPress={() => handleToggleInstitution(institution.id)}
            activeOpacity={0.7}
            accessibilityLabel={`${institution.name}, ${groupAssets.length} ativos, ${formatCurrency(totalValue, currency)}`}
          >
            <View style={styles.groupHeaderLeft}>
              <View
                style={[
                  styles.institutionIcon,
                  { backgroundColor: institution.color },
                ]}
              >
                <Text style={styles.institutionIconText}>
                  {institution.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.groupHeaderInfo}>
                <View style={styles.groupHeaderTopRow}>
                  <Text style={styles.groupLabel}>{institution.name}</Text>
                  <Text style={styles.groupCount}>
                    {groupAssets.length}{' '}
                    {groupAssets.length === 1 ? t('wallet.asset') : t('wallet.assets')}
                  </Text>
                </View>
                <View style={styles.groupHeaderBottomRow}>
                  <Text style={styles.groupValue}>
                    {displayValue(formatCurrency(totalValue, currency))}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.expandIndicator}>
              {isExpanded ? '\u25BC' : '\u25B6'}
            </Text>
          </TouchableOpacity>

          {isExpanded &&
            groupAssets.map((asset, index) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                index={index}
                onPress={handleAssetPress}
                showInstitution={false}
              />
            ))}
        </View>
      );
    });

  const renderAssetDetail = () => {
    if (!selectedAsset) return null;

    const isPositive = selectedAsset.variation >= 0;
    const institutionName =
      institutionNames[selectedAsset.institution] ??
      selectedAsset.institution;
    const classLabel = t(`class.${selectedAsset.class}`);
    const classColor =
      colors.assetClasses[selectedAsset.class] ?? colors.accent;

    return (
      <View style={styles.detailContent}>
        {/* Ticker + class badge */}
        <View style={styles.detailTickerRow}>
          <Text style={styles.detailTicker}>{selectedAsset.ticker}</Text>
          <View
            style={[styles.classBadge, { backgroundColor: classColor + '20' }]}
          >
            <Text style={[styles.classBadgeText, { color: classColor }]}>
              {classLabel}
            </Text>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.detailChartContainer}>
          <MiniLineChart
            data={selectedAsset.priceHistory}
            width={280}
            height={100}
            strokeWidth={2}
          />
        </View>

        {/* Info rows */}
        <View style={styles.detailInfoGrid}>
          <View style={styles.detailInfoRow}>
            <Text style={styles.detailInfoLabel}>{t('wallet.avgPrice')}</Text>
            <Text style={styles.detailInfoValue}>
              {displayValue(formatCurrency(selectedAsset.averagePrice, currency))}
            </Text>
          </View>

          <View style={styles.detailInfoRow}>
            <Text style={styles.detailInfoLabel}>{t('wallet.currentPrice')}</Text>
            <Text style={styles.detailInfoValue}>
              {displayValue(formatCurrency(selectedAsset.currentPrice, currency))}
            </Text>
          </View>

          <View style={styles.detailInfoRow}>
            <Text style={styles.detailInfoLabel}>{t('wallet.quantity')}</Text>
            <Text style={styles.detailInfoValue}>
              {valuesHidden
                ? '\u2022\u2022\u2022\u2022'
                : selectedAsset.quantity < 1
                  ? selectedAsset.quantity.toFixed(4)
                  : selectedAsset.quantity.toLocaleString('pt-BR')}
            </Text>
          </View>

          <View style={styles.detailInfoRow}>
            <Text style={styles.detailInfoLabel}>{t('wallet.investedValue')}</Text>
            <Text style={styles.detailInfoValue}>
              {displayValue(formatCurrency(selectedAsset.investedValue, currency))}
            </Text>
          </View>

          <View style={styles.detailInfoRow}>
            <Text style={styles.detailInfoLabel}>{t('wallet.currentValue')}</Text>
            <Text style={styles.detailInfoValue}>
              {displayValue(formatCurrency(selectedAsset.currentValue, currency))}
            </Text>
          </View>

          <View style={styles.detailInfoRow}>
            <Text style={styles.detailInfoLabel}>{t('wallet.profitability')}</Text>
            <Text
              style={[
                styles.detailInfoValue,
                {
                  color: isPositive ? colors.positive : colors.negative,
                },
              ]}
            >
              {valuesHidden
                ? '\u2022\u2022\u2022\u2022'
                : formatPct(selectedAsset.variation)}
            </Text>
          </View>

          <View style={styles.detailInfoRow}>
            <Text style={styles.detailInfoLabel}>{t('wallet.institution')}</Text>
            <Text style={styles.detailInfoValue}>{institutionName}</Text>
          </View>
        </View>
      </View>
    );
  };

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('wallet.title')}</Text>
      </View>

      {/* Toggle */}
      {renderToggle()}

      {/* Content */}
      {isLoading ? (
        <View style={styles.skeletonContainer}>
          <SkeletonList count={6} />
        </View>
      ) : error && assets.length === 0 ? (
        <ErrorState message={error} onRetry={loadPortfolio} />
      ) : assets.length === 0 ? (
        <View style={styles.emptyState}>
          <AppIcon name="briefcase" size={48} color={colors.text.secondary} />
          <Text style={styles.emptyTitle}>{t('wallet.emptyTitle')}</Text>
          <Text style={styles.emptyDescription}>{t('wallet.emptyDescription')}</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/connect-bank')}
            activeOpacity={0.7}
          >
            <Text style={styles.emptyButtonText}>{t('wallet.emptyButton')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
              progressBackgroundColor={colors.card}
            />
          }
        >
          {/* Performance Comparison */}
          {summary && (
            <View style={styles.comparisonSection}>
              <Text style={styles.comparisonTitle}>{t('comparison.title')}</Text>

              {/* Period pills */}
              <View style={styles.compPillRow}>
                {(['1M', '3M', '6M', '12M'] as const).map((p) => {
                  const sel = benchmarkPeriod === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.compPill, sel && styles.compPillSel]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setBenchmarkPeriod(p);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.compPillText, sel && styles.compPillTextSel]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Bars */}
              {(() => {
                const bench = demoBenchmarks[benchmarkPeriod];
                const portfolioVar = benchmarkPeriod === '1M'
                  ? (summary.variation1m ?? 0)
                  : benchmarkPeriod === '12M'
                    ? (summary.variation12m ?? 0)
                    : benchmarkPeriod === '3M'
                      ? (summary.variation1m ?? 0) * 3
                      : (summary.variation1m ?? 0) * 6;

                const bars = [
                  { label: t('comparison.portfolio'), value: portfolioVar, color: colors.accent },
                  { label: t('comparison.cdi'), value: bench.cdi, color: colors.info },
                  { label: t('comparison.ipca'), value: bench.ipca, color: colors.warning },
                  { label: t('comparison.ibov'), value: bench.ibov, color: '#A855F7' },
                ];

                const maxVal = Math.max(...bars.map((b) => Math.abs(b.value)), 1);

                return bars.map((bar) => (
                  <View key={bar.label} style={styles.compBarRow}>
                    <Text style={styles.compBarLabel} numberOfLines={1}>{bar.label}</Text>
                    <View style={styles.compBarTrack}>
                      <View
                        style={[
                          styles.compBarFill,
                          {
                            width: `${(Math.abs(bar.value) / maxVal) * 100}%`,
                            backgroundColor: bar.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.compBarValue, { color: bar.value >= 0 ? colors.positive : colors.negative }]}>
                      {valuesHidden ? '••••' : `${bar.value >= 0 ? '+' : ''}${bar.value.toFixed(1)}%`}
                    </Text>
                  </View>
                ));
              })()}
            </View>
          )}

          {viewMode === 'class' ? renderClassView() : renderInstitutionView()}
        </ScrollView>
      )}

      {/* Bottom Sheet - Asset Detail */}
      <BottomSheet
        visible={sheetVisible}
        onClose={handleCloseSheet}
        title={selectedAsset?.name}
      >
        {renderAssetDetail()}
      </BottomSheet>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text.primary,
    },

    // Toggle
    toggleContainer: {
      flexDirection: 'row',
      marginHorizontal: spacing.xl,
      marginBottom: spacing.lg,
      backgroundColor: colors.elevated,
      borderRadius: radius.md,
      padding: spacing.xs,
    },
    toggleButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
    },
    toggleButtonActive: {
      backgroundColor: colors.accent,
    },
    toggleText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    toggleTextActive: {
      color: colors.background,
    },

    // Scroll
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 100,
    },

    // Skeleton
    skeletonContainer: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
    },

    // Group header
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    groupHeaderLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    colorDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: spacing.md,
    },
    institutionIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    institutionIconText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    groupHeaderInfo: {
      flex: 1,
    },
    groupHeaderTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    groupLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
    },
    groupCount: {
      fontSize: 12,
      color: colors.text.muted,
    },
    groupHeaderBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.xs,
    },
    groupValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.secondary,
      fontVariant: ['tabular-nums'],
    },
    groupPercentage: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.muted,
      fontVariant: ['tabular-nums'],
    },
    expandIndicator: {
      fontSize: 12,
      color: colors.text.muted,
      marginLeft: spacing.sm,
    },

    // Bottom sheet detail
    detailContent: {
      paddingBottom: spacing.xl,
    },
    detailTickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    detailTicker: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text.primary,
    },
    classBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
    },
    classBadgeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    detailChartContainer: {
      alignItems: 'center',
      marginBottom: spacing.xl,
      paddingVertical: spacing.md,
      backgroundColor: colors.card,
      borderRadius: radius.md,
    },
    detailInfoGrid: {
      gap: spacing.xs,
    },
    detailInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border + '40',
    },
    detailInfoLabel: {
      fontSize: 14,
      color: colors.text.secondary,
    },
    detailInfoValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },

    // Performance comparison
    comparisonSection: {
      marginBottom: spacing.xl,
    },
    comparisonTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.md,
    },
    compPillRow: {
      flexDirection: 'row',
      marginBottom: spacing.lg,
      gap: spacing.sm,
    },
    compPill: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
    },
    compPillSel: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    compPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    compPillTextSel: {
      color: colors.background,
    },
    compBarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    compBarLabel: {
      width: 90,
      fontSize: 12,
      color: colors.text.secondary,
    },
    compBarTrack: {
      flex: 1,
      height: 12,
      backgroundColor: colors.border,
      borderRadius: 6,
      marginHorizontal: spacing.sm,
      overflow: 'hidden',
    },
    compBarFill: {
      height: 12,
      borderRadius: 6,
    },
    compBarValue: {
      width: 52,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'right',
      fontVariant: ['tabular-nums'],
    },

    // Empty state
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
      paddingHorizontal: spacing.xl,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    emptyDescription: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    emptyButton: {
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
    },
    emptyButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.background,
    },
  });
