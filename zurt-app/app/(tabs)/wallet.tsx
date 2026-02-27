import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
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
import { AppIcon, type AppIconName } from '../../src/hooks/useIcon';
import { BankLogo } from '../../src/components/icons/BankLogo';
import { logger } from '../../src/utils/logger';
import { demoBenchmarks } from '../../src/data/demo';
import { usePlanStore } from '../../src/stores/planStore';
import { exportService, type PortfolioExportRow } from '../../src/services/exportService';
import type { BenchmarkData } from '../../src/services/benchmarks';
import { brapiService } from '../../src/services/brapiService';

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
// Tools Hub
// ---------------------------------------------------------------------------

type ToolItem = {
  icon: AppIconName;
  labelKey: string;
  route: string;
  isTodo?: boolean;
};

type ToolCategory = {
  titleKey: string;
  emoji: string;
  items: ToolItem[];
};

const TOOL_CATEGORIES: ToolCategory[] = [
  {
    titleKey: 'wallet.categoryAnalysis',
    emoji: '\uD83D\uDCCA',
    items: [
      { icon: 'backtest', labelKey: 'tools.backtest', route: '/backtest', isTodo: true },
      { icon: 'comparison', labelKey: 'tools.comparison', route: '/comparison', isTodo: true },
      { icon: 'correlation', labelKey: 'tools.correlation', route: '/correlation-matrix', isTodo: true },
      { icon: 'scenario', labelKey: 'tools.scenario', route: '/scenario-planner', isTodo: true },
    ],
  },
  {
    titleKey: 'wallet.categoryFinance',
    emoji: '\uD83D\uDCB0',
    items: [
      { icon: 'budget', labelKey: 'tools.budget', route: '/budget' },
      { icon: 'billReminder', labelKey: 'tools.bills', route: '/bills' },
      { icon: 'debt', labelKey: 'tools.debt', route: '/debt-manager' },
      { icon: 'cashFlow', labelKey: 'tools.cashFlow', route: '/cash-flow', isTodo: true },
    ],
  },
  {
    titleKey: 'wallet.categoryInvestments',
    emoji: '\uD83D\uDCC8',
    items: [
      { icon: 'dividend', labelKey: 'tools.dividends', route: '/dividends', isTodo: true },
      { icon: 'rebalance', labelKey: 'tools.rebalance', route: '/rebalance', isTodo: true },
      { icon: 'crypto', labelKey: 'tools.crypto', route: '/crypto' },
      { icon: 'priceAlert', labelKey: 'tools.priceAlerts', route: '/price-alerts' },
      { icon: 'trending', labelKey: 'tools.market', route: '/market' },
    ],
  },
  {
    titleKey: 'wallet.categoryPlanning',
    emoji: '\uD83C\uDFE0',
    items: [
      { icon: 'fire', labelKey: 'tools.fire', route: '/fire' },
      { icon: 'compound', labelKey: 'tools.compound', route: '/compound' },
      { icon: 'realEstate', labelKey: 'tools.realEstate', route: '/real-estate' },
      { icon: 'emergency', labelKey: 'tools.emergency', route: '/emergency-fund' },
    ],
  },
  {
    titleKey: 'wallet.categoryFamily',
    emoji: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67',
    items: [
      { icon: 'family', labelKey: 'tools.family', route: '/family' },
    ],
  },
  {
    titleKey: 'wallet.categoryOther',
    emoji: '\uD83D\uDCDD',
    items: [
      { icon: 'diary', labelKey: 'tools.diary', route: '/diary' },
      { icon: 'challenge', labelKey: 'tools.challenges', route: '/savings-challenges' },
      { icon: 'report', labelKey: 'tools.report', route: '/report' },
    ],
  },
];

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
  const { valuesHidden, isDemoMode } = useAuthStore();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const checkLimit = usePlanStore((s) => s.checkLimit);
  const router = useRouter();

  const { width: screenWidth } = useWindowDimensions();

  // Memoised styles
  const styles = useMemo(() => createStyles(colors), [colors]);

  // 4 columns with 3 gaps
  const toolCardWidth = (screenWidth - spacing.xl * 2 - spacing.sm * 3) / 4;

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
  const [dailyChanges, setDailyChanges] = useState<Record<string, number>>({});

  const summary = usePortfolioStore((s) => s.summary);

  // Load data on mount & expand first group
  useEffect(() => {
    loadPortfolio();
  }, []);

  // Fetch BRAPI daily changes for portfolio tickers
  useEffect(() => {
    if (assets.length === 0) return;
    const tickers = assets
      .filter((a) => a.ticker && (a.class === 'stocks' || a.class === 'fiis'))
      .map((a) => a.ticker);
    if (tickers.length === 0) return;

    const unique = [...new Set(tickers)];
    brapiService
      .getMultipleQuotes(unique.slice(0, 20))
      .then((quotes) => {
        const map: Record<string, number> = {};
        for (const q of quotes) {
          if (q.symbol && q.regularMarketChangePercent != null) {
            map[q.symbol] = q.regularMarketChangePercent;
          }
        }
        setDailyChanges(map);
      })
      .catch(() => {
        // silently fail — daily changes are optional enrichment
      });
  }, [assets]);

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

  const handleExportXLSX = useCallback(async () => {
    if (!checkLimit('exportData')) {
      Alert.alert(
        t('export.proRequired'),
        t('export.upgradeMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('export.seePlans'), onPress: () => router.push('/plans') },
        ],
      );
      return;
    }
    try {
      const rows: PortfolioExportRow[] = assets.map((a) => ({
        ticker: a.ticker || a.name,
        name: a.name,
        quantity: a.quantity,
        avgPrice: a.averagePrice,
        currentPrice: a.currentPrice,
        totalValue: a.currentValue,
        profitLoss: a.currentValue - a.investedValue,
        profitPct: a.variation,
      }));
      const total = assets.reduce((s, a) => s + a.currentValue, 0);
      await exportService.exportPortfolioXLSX({
        assets: rows,
        totalValue: total,
        date: new Date().toISOString().split('T')[0],
      });
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message ?? 'Export failed');
    }
  }, [assets, checkLimit, t, router]);

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
    allocations.map((allocation, index) => {
      const isExpanded = expandedClasses.has(allocation.class);
      const groupAssets = assetsByClass[allocation.class] ?? [];

      return (
        <View key={`${allocation.class}-${index}`}>
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
                dailyChange={dailyChanges[asset.ticker]}
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
              <View style={{ marginRight: spacing.md }}>
                <BankLogo institutionName={institution.name} imageUrl={institution.imageUrl} size={36} />
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
                dailyChange={dailyChanges[asset.ticker]}
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
        {assets.length > 0 && (
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportXLSX} activeOpacity={0.7}>
            <AppIcon name="share" size={18} color={colors.accent} />
            <Text style={styles.exportBtnText}>XLSX</Text>
          </TouchableOpacity>
        )}
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
                const storeBenchmarks = usePortfolioStore.getState().benchmarks;
                const bench = storeBenchmarks?.[benchmarkPeriod] ?? demoBenchmarks[benchmarkPeriod];
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

          {/* Risk Health + Rebalance CTA */}
          <TouchableOpacity
            style={styles.riskMiniCard}
            onPress={() => router.push('/risk-metrics')}
            activeOpacity={0.7}
          >
            <AppIcon name="health" size={20} color={colors.accent} />
            <View style={styles.riskMiniInfo}>
              <Text style={styles.riskMiniLabel}>{t('risk.healthScore')}</Text>
              <Text style={[styles.riskMiniScore, { color: colors.accent }]}>72</Text>
            </View>
            <AppIcon name="chevron" size={16} color={colors.text.muted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rebalanceCta}
            onPress={() => router.push('/rebalance')}
            activeOpacity={0.7}
          >
            <AppIcon name="rebalance" size={20} color={colors.accent} />
            <Text style={styles.rebalanceCtaText}>{t('rebalance.ctaShort')}</Text>
            <AppIcon name="chevron" size={16} color={colors.text.muted} />
          </TouchableOpacity>

          {viewMode === 'class' ? renderClassView() : renderInstitutionView()}

          {/* Tools Hub */}
          <View style={styles.toolsSection}>
            <Text style={styles.toolsSectionTitle}>{t('wallet.toolsHub')}</Text>
            {TOOL_CATEGORIES.map((category) => (
              <View key={category.titleKey} style={styles.toolsCategory}>
                <Text style={styles.toolsCategoryTitle}>
                  {category.emoji} {t(category.titleKey)}
                </Text>
                <View style={styles.toolsGrid}>
                  {category.items.map((tool) => (
                    <TouchableOpacity
                      key={tool.labelKey}
                      style={[styles.toolCard, { width: toolCardWidth }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(tool.route as any);
                      }}
                      activeOpacity={0.7}
                    >
                      <AppIcon name={tool.icon} size={22} color={colors.accent} />
                      <Text
                        style={styles.toolName}
                        numberOfLines={2}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                        {t(tool.labelKey)}
                      </Text>
                      {tool.isTodo && !isDemoMode && (
                        <View style={styles.toolBadge}>
                          <Text style={styles.toolBadgeText}>{t('common.comingSoon')}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
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
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text.primary,
    },
    exportBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.accent + '40',
      backgroundColor: colors.accent + '10',
    },
    exportBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.accent,
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
      color: colors.background,
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

    // Risk mini-card & Rebalance CTA
    riskMiniCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    riskMiniInfo: {
      flex: 1,
    },
    riskMiniLabel: {
      fontSize: 12,
      color: colors.text.secondary,
    },
    riskMiniScore: {
      fontSize: 18,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    rebalanceCta: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      marginBottom: spacing.xl,
      gap: spacing.sm,
    },
    rebalanceCtaText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
    },

    // Tools Hub
    toolsSection: {
      marginTop: spacing.xxl,
      paddingTop: spacing.xl,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    toolsSectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.xl,
    },
    toolsCategory: {
      marginBottom: spacing.xl,
    },
    toolsCategoryTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.secondary,
      marginBottom: spacing.md,
    },
    toolsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    toolCard: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xs,
      alignItems: 'center',
      gap: spacing.xs,
    },
    toolName: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.text.primary,
      textAlign: 'center',
      lineHeight: 15,
      alignSelf: 'stretch',
    },
    toolBadge: {
      backgroundColor: colors.warning + '20',
      paddingHorizontal: spacing.xs + 2,
      paddingVertical: 1,
      borderRadius: radius.sm,
    },
    toolBadgeText: {
      fontSize: 8,
      fontWeight: '600',
      color: colors.warning,
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
