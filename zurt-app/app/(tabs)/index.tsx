import React, { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { type ThemeColors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { useAuthStore } from '../../src/stores/authStore';
import { usePortfolioStore } from '../../src/stores/portfolioStore';
import { useNotificationStore } from '../../src/stores/notificationStore';
import { useGoalsStore } from '../../src/stores/goalsStore';
import { useCardsStore } from '../../src/stores/cardsStore';
import { generatePatrimonialReport } from '../../src/services/reportGenerator';

import { Card } from '../../src/components/ui/Card';
import { Badge, DotBadge } from '../../src/components/ui/Badge';
import { LineChart } from '../../src/components/charts/LineChart';
import { AllocationBar } from '../../src/components/charts/AllocationBar';
import { AccountCard } from '../../src/components/cards/AccountCard';
import {
  SkeletonCard,
  SkeletonChart,
  SkeletonList,
} from '../../src/components/skeletons/Skeleton';
import { CircularProgress } from '../../src/components/charts/CircularProgress';
import { ErrorState } from '../../src/components/shared/ErrorState';

import {
  formatCurrency,
  formatPct,
  maskValue,
} from '../../src/utils/formatters';
import { demoBenchmarks } from '../../src/data/demo';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { AppIcon } from '../../src/hooks/useIcon';

// ---------------------------------------------------------------------------
// Time range options for the chart
// ---------------------------------------------------------------------------

const TIME_RANGES = ['1M', '3M', '6M', '1A', 'MAX'] as const;
type TimeRange = (typeof TIME_RANGES)[number];

// ===========================================================================
// Animated Tool Card (stagger fadeIn)
// ===========================================================================

function ToolCardAnimated({
  index,
  onPress,
  style,
  children,
}: {
  index: number;
  onPress: () => void;
  style: any;
  children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }, index * 60);
    return () => clearTimeout(timer);
  }, [index, opacity, translateY]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ flex: 1 }}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ===========================================================================
// HomeScreen
// ===========================================================================

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // ---- Stores -------------------------------------------------------------
  const { user, valuesHidden, toggleValuesHidden } = useAuthStore();
  const {
    summary,
    institutions,
    allocations,
    insights,
    isLoading,
    isRefreshing,
    error,
    loadPortfolio,
    refresh,
    selectedTimeRange,
    setTimeRange,
  } = usePortfolioStore();
  const { getUnreadCount, loadNotifications } = useNotificationStore();
  const { goals, loadGoals } = useGoalsStore();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const { cards } = useCardsStore();
  const [isExporting, setIsExporting] = useState(false);

  // ---- Memoised styles & constants ----------------------------------------
  const styles = useMemo(() => createStyles(colors), [colors]);

  const INSIGHT_COLORS: Record<string, string> = useMemo(
    () => ({
      warning: colors.warning,
      info: colors.info,
      opportunity: colors.accent,
    }),
    [colors],
  );

  // ---- Effects ------------------------------------------------------------
  useEffect(() => {
    loadPortfolio();
    loadNotifications();
    loadGoals();
  }, []);

  // ---- Handlers -----------------------------------------------------------
  const handleToggleValues = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleValuesHidden();
  }, [toggleValuesHidden]);

  const handleTimeRangePress = useCallback(
    (range: TimeRange) => {
      Haptics.selectionAsync();
      setTimeRange(range);
    },
    [setTimeRange],
  );

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    refresh();
  }, [refresh]);

  const handleExportPdf = useCallback(async () => {
    if (!summary || !user || isExporting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsExporting(true);
    try {
      const { assets } = usePortfolioStore.getState();
      await generatePatrimonialReport(
        { summary, institutions, allocations, cards, assets },
        user,
        accentColor,
      );
    } catch (err: any) {
      Alert.alert(t('common.error'), t('report.error'));
    } finally {
      setIsExporting(false);
    }
  }, [summary, user, institutions, allocations, cards, accentColor, isExporting, t]);

  // ---- Derived values -----------------------------------------------------
  const unreadCount = getUnreadCount();
  const firstName = user?.name?.split(' ')[0] ?? '';
  const greeting = `${t('greeting.' + (new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'))}, ${firstName}`;

  const variation1mVariant =
    (summary?.variation1m ?? 0) >= 0 ? 'positive' : 'negative';
  const variation12mVariant =
    (summary?.variation12m ?? 0) >= 0 ? 'positive' : 'negative';
  const profitColor =
    (summary?.profit ?? 0) >= 0 ? colors.positive : colors.negative;

  // ---- Helpers for value display ------------------------------------------
  const displayValue = (value: number) =>
    valuesHidden ? maskValue('') : formatCurrency(value, currency);

  const displayPct = (value: number) =>
    valuesHidden ? '••••' : formatPct(value);

  // ---- Chart data (filtered by selected time range) ----------------------
  const chartData = useMemo(() => {
    const history = summary?.history ?? [];
    if (history.length === 0) return [];

    const cutoffDays: Record<TimeRange, number> = {
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1A': 365,
      'MAX': Infinity,
    };
    const days = cutoffDays[selectedTimeRange] ?? 365;

    if (days === Infinity) {
      return history.map((h) => ({ label: h.month, value: h.value }));
    }

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const filtered = history.filter((h) => new Date(h.date) >= cutoff);

    // Fallback: if filter returns < 2 points, take last N proportional points
    if (filtered.length < 2) {
      const fallbackCount: Record<TimeRange, number> = {
        '1M': 5,
        '3M': 15,
        '6M': 30,
        '1A': 52,
        'MAX': history.length,
      };
      const count = Math.min(history.length, fallbackCount[selectedTimeRange] ?? history.length);
      return history.slice(-count).map((h) => ({ label: h.month, value: h.value }));
    }

    return filtered.map((h) => ({ label: h.month, value: h.value }));
  }, [summary?.history, selectedTimeRange]);

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            progressBackgroundColor={colors.card}
            colors={[colors.accent]}
          />
        }
      >
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                           */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{greeting}</Text>
          </View>

          <View style={styles.headerActions}>
            {summary && (
              <TouchableOpacity
                style={styles.pdfButton}
                activeOpacity={0.7}
                accessibilityLabel={t('home.exportPdf')}
                onPress={handleExportPdf}
                disabled={isExporting}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <AppIcon name="report" size={20} color={colors.text.primary} />
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.bellContainer}
              activeOpacity={0.7}
              accessibilityLabel={`${t('home.notifications')}, ${unreadCount} ${t('home.unread')}`}
              onPress={() => router.push('/(tabs)/alerts')}
            >
              <AppIcon name="notification" size={22} color={colors.text.primary} />
              {unreadCount > 0 && (
                <DotBadge
                  count={unreadCount}
                  style={styles.dotBadge}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ---------------------------------------------------------------- */}
        {/* Loading skeleton state                                           */}
        {/* ---------------------------------------------------------------- */}
        {isLoading ? (
          <View>
            <SkeletonCard />
            <SkeletonChart />
            <SkeletonCard />
            <SkeletonList count={3} />
          </View>
        ) : error && !summary ? (
          <ErrorState message={error} onRetry={loadPortfolio} />
        ) : (
          <>
            {/* -------------------------------------------------------------- */}
            {/* Hero Card - Patrimonio Total                                    */}
            {/* -------------------------------------------------------------- */}
            {summary && (
              <Card variant="glow" delay={100}>
                <Text style={styles.heroLabel}>{t('home.totalPatrimony')}</Text>

                <View style={styles.heroValueRow}>
                  <Text style={styles.heroValue}>
                    {displayValue(summary.totalValue)}
                  </Text>
                  <TouchableOpacity
                    onPress={handleToggleValues}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityLabel={
                      valuesHidden ? t('home.showValues') : t('home.hideValues')
                    }
                  >
                    <AppIcon name="eye" size={22} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.badgeRow}>
                  <Badge
                    value={`${t('home.month')}: ${displayPct(summary.variation1m)}`}
                    variant={variation1mVariant}
                    size="sm"
                  />
                  <Badge
                    value={`${t('home.12m')}: ${displayPct(summary.variation12m)}`}
                    variant={variation12mVariant}
                    size="sm"
                    style={styles.badgeSpacing}
                  />
                </View>

                <View style={styles.heroDivider} />

                <View style={styles.heroSubRow}>
                  <View style={styles.heroSubItem}>
                    <Text style={styles.heroSubLabel}>{t('home.invested')}</Text>
                    <Text style={styles.heroSubValue}>
                      {displayValue(summary.investedValue)}
                    </Text>
                  </View>
                  <View style={styles.heroSubSeparator} />
                  <View style={styles.heroSubItem}>
                    <Text style={styles.heroSubLabel}>{t('home.profit')}</Text>
                    <Text
                      style={[
                        styles.heroSubValue,
                        !valuesHidden && { color: profitColor },
                      ]}
                    >
                      {displayValue(summary.profit)}
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Empty State CTA - No connections                                */}
            {/* -------------------------------------------------------------- */}
            {allocations.length === 0 && institutions.length === 0 && (
              <Card delay={200}>
                <View style={styles.emptyState}>
                  <AppIcon name="bank" size={48} color={colors.text.secondary} />
                  <Text style={styles.emptyText}>{t('home.emptyTitle')}</Text>
                  <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={() => router.push('/connect-bank')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emptyButtonText}>{t('home.emptyButton')}</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Chart Section - Evolucao patrimonial                            */}
            {/* -------------------------------------------------------------- */}
            {summary && chartData.length > 1 && (
              <Card delay={200}>
                <Text style={styles.sectionTitleInCard}>
                  {t('home.evolution')}
                </Text>

                {/* Time range pills */}
                <View style={styles.timeRangeRow}>
                  {TIME_RANGES.map((range) => {
                    const isSelected = selectedTimeRange === range;
                    return (
                      <TouchableOpacity
                        key={range}
                        style={[
                          styles.timeRangePill,
                          isSelected && styles.timeRangePillSelected,
                        ]}
                        onPress={() => handleTimeRangePress(range)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.timeRangeText,
                            isSelected && styles.timeRangeTextSelected,
                          ]}
                        >
                          {range}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <LineChart
                  data={chartData}
                  referenceValue={summary.investedValue}
                />
              </Card>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Allocation Section                                              */}
            {/* -------------------------------------------------------------- */}
            {allocations.length > 0 && (
              <Card delay={300}>
                <Text style={styles.sectionTitleInCard}>
                  {t('home.allocation')}
                </Text>
                <AllocationBar allocations={allocations} />
              </Card>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Performance Comparison                                          */}
            {/* -------------------------------------------------------------- */}
            {summary && (
              <Card delay={350}>
                <Text style={styles.sectionTitleInCard}>
                  {t('comparison.title')}
                </Text>
                <Text style={styles.compPeriod}>{t('comparison.period12m')}</Text>

                {(() => {
                  const benchmarks = demoBenchmarks['12M'];
                  const portfolioReturn = summary.variation12m ?? 0;
                  const items = [
                    { label: t('comparison.portfolio'), value: portfolioReturn, color: colors.accent },
                    { label: t('comparison.cdi'), value: benchmarks.cdi, color: colors.info },
                    { label: t('comparison.ipca'), value: benchmarks.ipca, color: colors.warning },
                    { label: t('comparison.ibov'), value: benchmarks.ibov, color: '#A855F7' },
                  ];
                  const maxVal = Math.max(...items.map((i) => Math.abs(i.value)), 1);

                  return items.map((item, i) => (
                    <View key={i} style={styles.compRow}>
                      <Text style={styles.compLabel}>{item.label}</Text>
                      <View style={styles.compBarBg}>
                        <View
                          style={[
                            styles.compBarFill,
                            {
                              width: `${Math.max((Math.abs(item.value) / maxVal) * 100, 4)}%`,
                              backgroundColor: item.color,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.compValue, { color: item.color }]}>
                        {valuesHidden ? '\u{2022}\u{2022}\u{2022}\u{2022}' : displayPct(item.value)}
                      </Text>
                    </View>
                  ));
                })()}
              </Card>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Tools Grid — Ferramentas ZURT (horizontal scroll 2 rows)       */}
            {/* -------------------------------------------------------------- */}
            <View style={styles.toolsSection}>
              <Text style={[styles.sectionTitle, { paddingHorizontal: spacing.xl }]}>{t('tools.title')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.toolsScrollContent}
              >
                <View style={styles.toolsColumns}>
                  {(() => {
                    const allTools = [
                      { emoji: '\u{1F916}', title: t('tools.agent'), desc: t('tools.agentDesc'), onPress: () => router.push('/(tabs)/agent') },
                      { emoji: '\u{1F4C8}', title: t('tools.simulator'), desc: t('tools.simulatorDesc'), onPress: () => router.push('/simulator') },
                      { emoji: '\u{1F3AF}', title: t('tools.goals'), desc: t('tools.goalsDesc'), onPress: () => router.push('/goals') },
                      { emoji: '\u{1F4C4}', title: t('tools.report'), desc: t('tools.reportDesc'), onPress: handleExportPdf },
                      { emoji: '\u{1F46A}', title: t('tools.family'), desc: t('tools.familyDesc'), onPress: () => router.push('/family') },
                      { emoji: '\u{1F4B3}', title: t('tools.cards'), desc: t('tools.cardsDesc'), onPress: () => router.push('/(tabs)/cards') },
                      { emoji: '\u{2696}\u{FE0F}', title: t('tools.rebalance'), desc: t('tools.rebalanceDesc'), onPress: () => router.push('/rebalance') },
                      { emoji: '\u{1F9FE}', title: t('tools.taxDashboard'), desc: t('tools.taxDashboardDesc'), onPress: () => router.push('/tax-dashboard') },
                      { emoji: '\u{1F49A}', title: t('tools.health'), desc: t('tools.healthDesc'), onPress: () => router.push('/risk-metrics') },
                      { emoji: '\u{1F3C6}', title: t('tools.badges'), desc: t('tools.badgesDesc'), onPress: () => router.push('/badges') },
                      { emoji: '\u{1F4CB}', title: t('tools.watchlist'), desc: t('tools.watchlistDesc'), onPress: () => router.push('/watchlist') },
                      { emoji: '\u{1F4F0}', title: t('tools.news'), desc: t('tools.newsDesc'), onPress: () => router.push('/news') },
                      { emoji: '\u{1F4B8}', title: t('tools.dividends'), desc: t('tools.dividendsDesc'), onPress: () => router.push('/dividends') },
                      { emoji: '\u{1F504}', title: t('tools.comparison'), desc: t('tools.comparisonDesc'), onPress: () => router.push('/comparison') },
                      { emoji: '\u{1F967}', title: t('tools.budget'), desc: t('tools.budgetDesc'), onPress: () => router.push('/budget') },
                      { emoji: '\u{1F4C8}', title: t('tools.cashFlow'), desc: t('tools.cashFlowDesc'), onPress: () => router.push('/cash-flow') },
                      { emoji: '\u{1F4C9}', title: t('tools.insights'), desc: t('tools.insightsDesc'), onPress: () => router.push('/spending-insights') },
                      { emoji: '\u{1F9FE}', title: t('tools.bills'), desc: t('tools.billsDesc'), onPress: () => router.push('/bills') },
                      { emoji: '\u{1F536}', title: t('tools.correlation'), desc: t('tools.correlationDesc'), onPress: () => router.push('/correlation-matrix') },
                      { emoji: '\u{23F0}', title: t('tools.backtest'), desc: t('tools.backtestDesc'), onPress: () => router.push('/backtest') },
                      { emoji: '\u{1F3B2}', title: t('tools.scenario'), desc: t('tools.scenarioDesc'), onPress: () => router.push('/scenario-planner') },
                      { emoji: '\u{1F514}', title: t('tools.priceAlerts'), desc: t('tools.priceAlertsDesc'), onPress: () => router.push('/price-alerts') },
                      { emoji: '\u{1F501}', title: t('tools.recurring'), desc: t('tools.recurringDesc'), onPress: () => router.push('/recurring-investments') },
                    ];
                    // Arrange as 2 rows x 12 columns (24 slots, some may be empty)
                    const columns: Array<[typeof allTools[0], typeof allTools[0] | undefined]> = [];
                    for (let c = 0; c < 12; c++) {
                      columns.push([allTools[c * 2], allTools[c * 2 + 1]]);
                    }
                    return columns.map((col, ci) => (
                      <View key={ci} style={styles.toolColumn}>
                        {col.map((tool, ri) =>
                          tool ? (
                            <ToolCardAnimated key={ci * 2 + ri} index={ci * 2 + ri} onPress={tool.onPress} style={styles.toolCard}>
                              <Text style={styles.toolEmoji}>{tool.emoji}</Text>
                              <Text style={styles.toolTitle}>{tool.title}</Text>
                              <Text style={styles.toolDesc} numberOfLines={1}>{tool.desc}</Text>
                            </ToolCardAnimated>
                          ) : null,
                        )}
                      </View>
                    ));
                  })()}
                </View>
              </ScrollView>
            </View>

            {/* -------------------------------------------------------------- */}
            {/* Goals Preview                                                   */}
            {/* -------------------------------------------------------------- */}
            {goals.length > 0 && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>{t('goals.title')}</Text>
                  <TouchableOpacity
                    onPress={() => router.push('/goals')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewAllLink}>{t('goals.viewAll')} →</Text>
                  </TouchableOpacity>
                </View>

                {goals.slice(0, 2).map((goal) => {
                  const progress = goal.target_amount > 0
                    ? goal.current_amount / goal.target_amount
                    : 0;
                  const pct = Math.round(progress * 100);
                  const goalColor = goal.color || colors.accent;

                  return (
                    <TouchableOpacity
                      key={goal.id}
                      style={styles.goalMiniCard}
                      onPress={() => router.push('/goals')}
                      activeOpacity={0.7}
                    >
                      <CircularProgress
                        progress={progress}
                        size={48}
                        strokeWidth={5}
                        color={goalColor}
                      >
                        <Text style={[styles.goalMiniPct, { color: goalColor }]}>{pct}%</Text>
                      </CircularProgress>
                      <View style={styles.goalMiniInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 16, marginRight: 6 }}>{goal.icon || '\u{1F3AF}'}</Text>
                          <Text style={styles.goalMiniName} numberOfLines={1}>{goal.name}</Text>
                        </View>
                        <Text style={styles.goalMiniProgress}>
                          {valuesHidden
                            ? 'R$ \u{2022}\u{2022}\u{2022}\u{2022}\u{2022} / R$ \u{2022}\u{2022}\u{2022}\u{2022}\u{2022}'
                            : `${formatCurrency(goal.current_amount, currency)} / ${formatCurrency(goal.target_amount, currency)}`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Simulator CTA                                                   */}
            {/* -------------------------------------------------------------- */}
            <TouchableOpacity
              style={styles.simulatorCta}
              onPress={() => router.push('/simulator')}
              activeOpacity={0.7}
            >
              <AppIcon name="trending" size={20} color={colors.accent} />
              <Text style={styles.simulatorCtaText}>{t('simulator.cta')}</Text>
              <AppIcon name="chevron" size={16} color={colors.text.muted} />
            </TouchableOpacity>

            {/* -------------------------------------------------------------- */}
            {/* Contas Conectadas                                               */}
            {/* -------------------------------------------------------------- */}
            {institutions.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>{t('home.connectedAccounts')}</Text>

                {institutions.map((inst, idx) => (
                  <AccountCard
                    key={inst.id}
                    institution={inst}
                    index={idx}
                  />
                ))}

                <TouchableOpacity
                  style={styles.connectButton}
                  activeOpacity={0.7}
                  onPress={() => router.push('/connect-bank')}
                >
                  <Text style={styles.connectButtonText}>
                    {t('home.connectInstitution')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Insights                                                        */}
            {/* -------------------------------------------------------------- */}
            {insights.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>{t('home.insights')}</Text>

                {insights.map((insight, idx) => {
                  const borderColor =
                    INSIGHT_COLORS[insight.type] ?? colors.accent;

                  return (
                    <View key={insight.id}>
                      <View
                        style={[
                          styles.insightCard,
                          { borderLeftColor: borderColor },
                        ]}
                      >
                        <View style={styles.insightContent}>
                          <Text style={styles.insightIcon}>
                            {insight.icon}
                          </Text>
                          <Text style={styles.insightText}>
                            {insight.text}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.insightAction}
                          activeOpacity={0.7}
                          onPress={() => router.push('/(tabs)/agent')}
                        >
                          <Text
                            style={[
                              styles.insightActionText,
                              { color: borderColor },
                            ]}
                          >
                            {insight.action || t('home.viewDetails')} →
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
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
    // -- Layout ---------------------------------------------------------------
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
    },

    // -- Header ---------------------------------------------------------------
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
    },
    headerLeft: {
      flex: 1,
    },
    greeting: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text.primary,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    pdfButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bellContainer: {
      position: 'relative',
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotBadge: {
      position: 'absolute',
      top: 2,
      right: 0,
    },

    // -- Hero Card ------------------------------------------------------------
    heroLabel: {
      fontSize: 14,
      color: colors.text.secondary,
      marginBottom: spacing.xs,
    },
    heroValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    heroValue: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    badgeSpacing: {
      marginLeft: spacing.sm,
    },
    heroDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginBottom: spacing.lg,
    },
    heroSubRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    heroSubItem: {
      flex: 1,
    },
    heroSubSeparator: {
      width: 1,
      height: 36,
      backgroundColor: colors.border,
      marginHorizontal: spacing.lg,
    },
    heroSubLabel: {
      fontSize: 12,
      color: colors.text.secondary,
      marginBottom: spacing.xs,
    },
    heroSubValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },

    // -- Section titles -------------------------------------------------------
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.md,
      marginTop: spacing.xl,
    },
    sectionTitleInCard: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.md,
    },

    // -- Time range pills -----------------------------------------------------
    timeRangeRow: {
      flexDirection: 'row',
      marginBottom: spacing.lg,
    },
    timeRangePill: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: spacing.sm,
    },
    timeRangePillSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    timeRangeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    timeRangeTextSelected: {
      color: colors.background,
    },

    // -- Connect institution button -------------------------------------------
    connectButton: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: 'dashed',
      borderRadius: radius.md,
      paddingVertical: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.xs,
    },
    connectButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.secondary,
    },

    // -- Insight cards --------------------------------------------------------
    insightCard: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      padding: spacing.lg,
      marginBottom: spacing.sm,
    },
    insightContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    insightIcon: {
      fontSize: 20,
      marginRight: spacing.md,
      marginTop: 2,
    },
    insightText: {
      flex: 1,
      fontSize: 14,
      color: colors.text.primary,
      lineHeight: 20,
    },
    insightAction: {
      alignSelf: 'flex-end',
    },
    insightActionText: {
      fontSize: 13,
      fontWeight: '600',
    },

    // -- Performance comparison ---------------------------------------------------
    compPeriod: {
      fontSize: 12,
      color: colors.text.muted,
      marginBottom: spacing.lg,
    },
    compRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    compLabel: {
      width: 80,
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    compBarBg: {
      flex: 1,
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
      marginHorizontal: spacing.sm,
    },
    compBarFill: {
      height: 8,
      borderRadius: 4,
    },
    compValue: {
      width: 60,
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'right',
      fontVariant: ['tabular-nums'],
    },

    // -- Goals preview ----------------------------------------------------------
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.xl,
      marginBottom: spacing.md,
    },
    viewAllLink: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
    goalMiniCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      marginBottom: spacing.sm,
    },
    goalMiniInfo: {
      flex: 1,
      marginLeft: spacing.md,
    },
    goalMiniName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 2,
    },
    goalMiniProgress: {
      fontSize: 12,
      color: colors.text.secondary,
      fontVariant: ['tabular-nums'],
    },
    goalMiniPct: {
      fontSize: 11,
      fontWeight: '700',
    },

    // -- Tools grid (horizontal scroll) -------------------------------------------
    toolsSection: {
      marginBottom: spacing.md,
      marginHorizontal: -spacing.xl,
    },
    toolsScrollContent: {
      paddingHorizontal: spacing.xl,
    },
    toolsColumns: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    toolColumn: {
      gap: spacing.sm,
    },
    toolCard: {
      width: (Dimensions.get('window').width - spacing.xl * 2 - spacing.sm * 2) / 3,
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
    },
    toolEmoji: {
      fontSize: 22,
      marginBottom: spacing.xs,
    },
    toolTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 1,
    },
    toolDesc: {
      fontSize: 11,
      color: colors.text.muted,
    },

    // -- Simulator CTA ----------------------------------------------------------
    simulatorCta: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    simulatorCtaText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
    },

    // -- Empty state -----------------------------------------------------------
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    emptyText: {
      fontSize: 15,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: spacing.xl,
      paddingHorizontal: spacing.md,
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
