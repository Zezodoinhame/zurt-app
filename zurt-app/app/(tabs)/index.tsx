import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Text as SvgText, Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { type ThemeColors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { useAuthStore } from '../../src/stores/authStore';
import { usePortfolioStore } from '../../src/stores/portfolioStore';
import { useGoalsStore } from '../../src/stores/goalsStore';
import { useCardsStore } from '../../src/stores/cardsStore';
import { useAgentStore } from '../../src/stores/agentStore';
import { useNotificationStore } from '../../src/stores/notificationStore';
import { syncAllFinance } from '../../src/services/api';

import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import {
  SkeletonCard,
  SkeletonChart,
  SkeletonList,
} from '../../src/components/skeletons/Skeleton';
import { ErrorState } from '../../src/components/shared/ErrorState';
import { SectionHeader } from '../../src/components/shared/SectionHeader';
import { QuickActionButton } from '../../src/components/shared/QuickActionButton';
import { InsightCard } from '../../src/components/shared/InsightCard';
import { TransactionRow } from '../../src/components/shared/TransactionRow';
import { GoalCard } from '../../src/components/shared/GoalCard';
import { AllocationBar } from '../../src/components/shared/AllocationBar';
import PlanCards from '../../src/components/home/PlanCards';
import { MarketTicker } from '../../src/components/home/MarketTicker';

import {
  formatCurrency,
  formatPct,
  maskValue,
} from '../../src/utils/formatters';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useNewsStore } from '../../src/stores/newsStore';
import { useMarketStore } from '../../src/stores/marketStore';
import { AppIcon } from '../../src/hooks/useIcon';

// ---------------------------------------------------------------------------
// Sparkline SVG — lightweight chart for the hero card
// ---------------------------------------------------------------------------

function Sparkline({
  data,
  width,
  height,
  color,
}: {
  data: number[];
  width: number;
  height: number;
  color: string;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padY = 4;

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: padY + (1 - (v - min) / range) * (height - padY * 2),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.25" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </SvgGradient>
      </Defs>
      <Path d={areaPath} fill="url(#sparkFill)" />
      <Path d={linePath} fill="none" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

// ===========================================================================
// HomeScreen
// ===========================================================================

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // ---- Stores ---------------------------------------------------------------
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
    loadBenchmarks,
  } = usePortfolioStore();
  const { goals, loadGoals } = useGoalsStore();
  const { cards, dashboardTransactions, loadTransactions } = useCardsStore();
  const { loadInitialInsights } = useAgentStore();
  const { articles: newsArticles, loadNews } = useNewsStore();
  const { getUnreadCount } = useNotificationStore();
  const {
    ibovespa,
    currencies,
    selic,
    cryptos,
    loadMarketOverview,
  } = useMarketStore();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const unreadCount = getUnreadCount();

  const [isSyncing, setIsSyncing] = useState(false);

  // ---- Memoised styles ------------------------------------------------------
  const styles = useMemo(() => createStyles(colors), [colors]);

  // ---- Effects --------------------------------------------------------------
  useEffect(() => {
    loadPortfolio();
    loadGoals();
    loadBenchmarks();
    loadTransactions();
    loadInitialInsights();
    loadNews();
    loadMarketOverview();
  }, []);

  // ---- Handlers -------------------------------------------------------------
  const handleToggleValues = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleValuesHidden();
  }, [toggleValuesHidden]);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    refresh();
  }, [refresh]);

  const handleSync = useCallback(async () => {
    if (isSyncing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSyncing(true);
    try {
      await syncAllFinance();
      await refresh();
    } catch {
      // silent
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refresh]);

  // ---- Derived values -------------------------------------------------------
  const firstName = user?.name?.split(' ')[0] ?? '';
  const hour = new Date().getHours();
  const greeting = `${t('greeting.' + (hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'))}, ${firstName}`;

  const variation1mVariant: 'positive' | 'negative' =
    (summary?.variation1m ?? 0) >= 0 ? 'positive' : 'negative';

  const monthlyReturn = summary
    ? summary.totalValue - (summary.investedValue + (summary.profit - (summary.totalValue - summary.investedValue)))
    : 0;
  const monthlyReturnValue = summary
    ? summary.totalValue * (summary.variation1m / 100)
    : 0;

  // ---- Helpers for value display --------------------------------------------
  const displayValue = (value: number) =>
    valuesHidden ? maskValue('') : formatCurrency(value, currency);

  const displayPct = (value: number) =>
    valuesHidden ? '••••' : formatPct(value);

  // ---- Sparkline data from history ------------------------------------------
  const sparklineData = useMemo(() => {
    const history = summary?.history ?? [];
    if (history.length < 2) return [];
    return history.slice(-12).map((h) => h.value);
  }, [summary?.history]);

  // ---- Insight type mapping -------------------------------------------------
  const insightTypeMap: Record<string, 'positive' | 'negative' | 'warning' | 'info'> = {
    opportunity: 'positive',
    warning: 'warning',
    info: 'info',
  };

  const insightIconMap: Record<string, 'trending' | 'warning' | 'info'> = {
    opportunity: 'trending',
    warning: 'warning',
    info: 'info',
  };

  // ---- Transaction category label map ---------------------------------------
  const categoryLabelMap: Record<string, string> = {
    food: 'Alimentação',
    transport: 'Transporte',
    subscriptions: 'Assinaturas',
    shopping: 'Compras',
    fuel: 'Combustível',
    health: 'Saúde',
    travel: 'Viagens',
    tech: 'Tecnologia',
  };

  // ---- Market indicators for strip ------------------------------------------
  const marketIndicators = useMemo(() => {
    const items: { label: string; value: string; change?: number }[] = [];

    if (ibovespa) {
      items.push({
        label: 'IBOV',
        value: ibovespa.regularMarketPrice?.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) ?? '---',
        change: ibovespa.regularMarketChangePercent,
      });
    }

    const usd = currencies.find((c) => c.fromCurrency === 'USD');
    if (usd) {
      items.push({
        label: 'USD/BRL',
        value: `R$ ${Number(usd.bidPrice).toFixed(2).replace('.', ',')}`,
        change: usd.regularMarketChangePercent,
      });
    }

    const eur = currencies.find((c) => c.fromCurrency === 'EUR');
    if (eur) {
      items.push({
        label: 'EUR/BRL',
        value: `R$ ${Number(eur.bidPrice).toFixed(2).replace('.', ',')}`,
        change: eur.regularMarketChangePercent,
      });
    }

    const btc = cryptos.find((c) => c.coin === 'BTC');
    if (btc) {
      items.push({
        label: 'BTC',
        value: `R$ ${(btc.regularMarketPrice / 1000).toFixed(0)}K`,
        change: btc.regularMarketChangePercent,
      });
    }

    if (selic.length > 0) {
      items.push({
        label: 'SELIC',
        value: `${Number(selic[0].value).toFixed(2).replace('.', ',')}%`,
      });
    }

    return items;
  }, [ibovespa, currencies, cryptos, selic]);

  // ---- Valid allocations (> 0) ----------------------------------------------
  const validAllocations = useMemo(
    () => allocations.filter((a) => a.value > 0),
    [allocations],
  );

  // ---- Transactions (last 4) ------------------------------------------------
  const recentTransactions = useMemo(
    () => dashboardTransactions.slice(0, 4),
    [dashboardTransactions],
  );

  // ---- Top 2 cards ----------------------------------------------------------
  const topCards = useMemo(() => cards.slice(0, 2), [cards]);

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Market Ticker — fixed above scroll */}
      <MarketTicker />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
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
        {/* 1. Header                                                        */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.header}>
          {/* Top row: ZURT logo + actions */}
          <View style={styles.headerTopRow}>
            <View style={styles.headerBrand}>
              <Svg width={30} height={30} viewBox="0 0 30 30">
                <Defs>
                  <SvgGradient id="zurt-logo-grad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor={colors.accent} />
                    <Stop offset="100%" stopColor={colors.accent + 'BB'} />
                  </SvgGradient>
                </Defs>
                <Rect width={30} height={30} rx={8} fill="url(#zurt-logo-grad)" />
                <SvgText
                  x={15}
                  y={21}
                  textAnchor="middle"
                  fill={colors.background}
                  fontWeight="900"
                  fontSize={18}
                >
                  Z
                </SvgText>
              </Svg>
              <Text style={styles.brandText}>ZURT</Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleToggleValues}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel={valuesHidden ? t('home.showValues') : t('home.hideValues')}
                style={styles.headerIconBtn}
              >
                <AppIcon name={valuesHidden ? 'eyeOff' : 'eye'} size={18} color={colors.text.secondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/alerts')}
                style={styles.headerIconBtn}
                accessibilityLabel="Notifications"
              >
                <AppIcon name="notification" size={18} color={colors.text.secondary} />
                {unreadCount > 0 && <View style={styles.notifBadge} />}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/profile')}
                style={styles.headerIconBtn}
                accessibilityLabel="Settings"
              >
                <AppIcon name="settings" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Greeting */}
          <Text style={styles.greeting}>{greeting}</Text>
        </View>

        {/* ---------------------------------------------------------------- */}
        {/* Loading / Error                                                  */}
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
            {/* 2. Hero Card — Patrimônio Total + Sparkline                    */}
            {/* -------------------------------------------------------------- */}
            {summary && (
              <Card variant="glow" delay={100}>
                <View style={styles.heroTop}>
                  <View style={styles.heroTextCol}>
                    <Text style={styles.heroLabel}>{t('home.totalPatrimony')}</Text>
                    <Text style={styles.heroValue}>
                      {displayValue(summary.totalValue)}
                    </Text>
                    <View style={styles.heroBadgeRow}>
                      <Badge
                        value={`${displayPct(summary.variation1m)}  ${valuesHidden ? '' : formatCurrency(monthlyReturnValue, currency)}`}
                        variant={variation1mVariant}
                        size="sm"
                      />
                    </View>
                  </View>
                  {sparklineData.length >= 2 && (
                    <View style={styles.sparklineWrap}>
                      <Sparkline
                        data={sparklineData}
                        width={100}
                        height={48}
                        color={colors.accent}
                      />
                    </View>
                  )}
                </View>

                {/* Mini-badges: institutions */}
                {institutions.length > 0 && (
                  <>
                    <View style={styles.heroDivider} />
                    <View style={styles.institutionRow}>
                      {institutions.slice(0, 4).map((inst) => {
                        const pct = summary.totalValue > 0
                          ? (inst.totalValue / summary.totalValue) * 100
                          : 0;
                        return (
                          <View key={inst.id} style={styles.institutionChip}>
                            <View style={[styles.institutionDot, { backgroundColor: inst.color }]} />
                            <Text style={styles.institutionName} numberOfLines={1}>
                              {inst.name}
                            </Text>
                            <Text style={styles.institutionPct}>
                              {valuesHidden ? '••' : `${pct.toFixed(0)}%`}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </>
                )}
              </Card>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Empty State — no connections                                    */}
            {/* -------------------------------------------------------------- */}
            {validAllocations.length === 0 && institutions.length === 0 && (
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
            {/* 3. Quick Actions                                               */}
            {/* -------------------------------------------------------------- */}
            <View style={styles.quickActions}>
              <QuickActionButton
                icon="bank"
                label={t('home.connectBank')}
                onPress={() => router.push('/connect-bank')}
              />
              <QuickActionButton
                icon="family"
                label={t('family.title')}
                onPress={() => router.push('/family')}
              />
              <QuickActionButton
                icon="refresh"
                label={t('home.syncData')}
                onPress={handleSync}
              />
              <QuickActionButton
                icon="trending"
                label="Mercado"
                onPress={() => router.push('/market')}
              />
            </View>

            {/* -------------------------------------------------------------- */}
            {/* 4. ZURT Insights                                               */}
            {/* -------------------------------------------------------------- */}
            {insights.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title={t('home.insights')}
                  onAction={() => router.push('/(tabs)/agent')}
                />
                {insights.slice(0, 3).map((insight) => (
                  <InsightCard
                    key={insight.id}
                    icon={insightIconMap[insight.type] ?? 'info'}
                    text={insight.text}
                    type={insightTypeMap[insight.type] ?? 'info'}
                    onPress={() => router.push('/(tabs)/agent')}
                  />
                ))}
              </View>
            )}

            {/* -------------------------------------------------------------- */}
            {/* 5. Alocação                                                    */}
            {/* -------------------------------------------------------------- */}
            {validAllocations.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title={t('home.allocation')} />
                <Card animated={false}>
                  <AllocationBar
                    allocations={validAllocations}
                    valuesHidden={valuesHidden}
                  />
                </Card>
              </View>
            )}

            {/* -------------------------------------------------------------- */}
            {/* 6. Metas — horizontal scroll                                   */}
            {/* -------------------------------------------------------------- */}
            {goals.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title={t('home.goals')}
                  onAction={() => router.push('/goals')}
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.goalsScroll}
                >
                  {goals.slice(0, 5).map((goal) => {
                    const progress =
                      goal.target_amount > 0
                        ? goal.current_amount / goal.target_amount
                        : 0;
                    return (
                      <View key={goal.id} style={styles.goalCardWrap}>
                        <GoalCard
                          name={goal.name}
                          icon="goal"
                          progress={progress}
                          currentValue={goal.current_amount}
                          targetValue={goal.target_amount}
                          valuesHidden={valuesHidden}
                          color={goal.color || colors.accent}
                          onPress={() => router.push('/goals')}
                        />
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* -------------------------------------------------------------- */}
            {/* 7. Cartões — 2 side by side                                    */}
            {/* -------------------------------------------------------------- */}
            {topCards.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title={t('home.cards')}
                  onAction={() => router.push('/(tabs)/cards')}
                />
                <View style={styles.cardsRow}>
                  {topCards.map((card) => {
                    const usage = card.limit > 0 ? card.used / card.limit : 0;
                    const usageColor =
                      usage > 0.8 ? colors.negative : usage > 0.5 ? colors.warning : colors.accent;
                    return (
                      <TouchableOpacity
                        key={card.id}
                        style={styles.miniCard}
                        activeOpacity={0.7}
                        onPress={() => router.push('/(tabs)/cards')}
                      >
                        <View style={[styles.miniCardStripe, { backgroundColor: card.color }]} />
                        <Text style={styles.miniCardName} numberOfLines={1}>
                          {card.name}
                        </Text>
                        <Text style={styles.miniCardLabel}>
                          {valuesHidden ? maskValue('') : formatCurrency(card.currentInvoice, currency)}
                        </Text>
                        {/* Usage bar */}
                        <View style={styles.usageBarBg}>
                          <View
                            style={[
                              styles.usageBarFill,
                              {
                                width: `${Math.min(usage * 100, 100)}%`,
                                backgroundColor: usageColor,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.miniCardUsage}>
                          {valuesHidden ? '••%' : `${(usage * 100).toFixed(0)}%`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* -------------------------------------------------------------- */}
            {/* 8. Movimentações — last 4                                      */}
            {/* -------------------------------------------------------------- */}
            {recentTransactions.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title={t('home.transactions')}
                  onAction={() => router.push('/(tabs)/cards')}
                />
                <Card animated={false}>
                  {recentTransactions.map((tx, idx) => (
                    <View key={tx.id || idx}>
                      <TransactionRow
                        description={tx.description || tx.merchant || ''}
                        category={tx.category || ''}
                        categoryLabel={categoryLabelMap[tx.category || ''] || tx.category || ''}
                        amount={tx.amount}
                        date={tx.date ? new Date(tx.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''}
                        valuesHidden={valuesHidden}
                      />
                      {idx < recentTransactions.length - 1 && (
                        <View style={styles.txDivider} />
                      )}
                    </View>
                  ))}
                </Card>
              </View>
            )}

            {/* -------------------------------------------------------------- */}
            {/* 9. Market Indicators Strip                                  */}
            {/* -------------------------------------------------------------- */}
            {marketIndicators.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="Indicadores"
                  onAction={() => router.push('/market')}
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.indicatorsScroll}
                >
                  {marketIndicators.map((item) => (
                    <TouchableOpacity
                      key={item.label}
                      style={styles.indicatorCard}
                      activeOpacity={0.7}
                      onPress={() => router.push('/market')}
                    >
                      <Text style={styles.indicatorLabel}>{item.label}</Text>
                      <Text style={styles.indicatorValue}>{item.value}</Text>
                      {item.change !== undefined && (
                        <Text
                          style={[
                            styles.indicatorChange,
                            { color: item.change >= 0 ? colors.positive : colors.negative },
                          ]}
                        >
                          {item.change >= 0 ? '+' : ''}{item.change.toFixed(2).replace('.', ',')}%
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* -------------------------------------------------------------- */}
            {/* 10. Not\u00EDcias do Mercado                                        */}
            {/* -------------------------------------------------------------- */}
            {newsArticles.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title={t('news.title')}
                  onAction={() => router.push('/news')}
                />
                <Card animated={false}>
                  {newsArticles.slice(0, 3).map((article, idx) => {
                    const timeAgo = (() => {
                      const d = new Date(article.date);
                      if (isNaN(d.getTime())) return '';
                      const mins = Math.floor((Date.now() - d.getTime()) / 60000);
                      if (mins < 60) return `${mins}min`;
                      const hrs = Math.floor(mins / 60);
                      if (hrs < 24) return `${hrs}h`;
                      const days = Math.floor(hrs / 24);
                      return `${days}d`;
                    })();
                    return (
                      <TouchableOpacity
                        key={article.id}
                        style={styles.newsItem}
                        activeOpacity={0.7}
                        onPress={() => article.url && Linking.openURL(article.url)}
                      >
                        <View style={styles.newsContent}>
                          <Text style={styles.newsTitle} numberOfLines={2}>
                            {article.title}
                          </Text>
                          <View style={styles.newsMeta}>
                            <Text style={styles.newsSource}>{article.source}</Text>
                            {timeAgo ? (
                              <>
                                <Text style={styles.newsDot}>{' \u00B7 '}</Text>
                                <Text style={styles.newsTime}>{timeAgo}</Text>
                              </>
                            ) : null}
                          </View>
                        </View>
                        <AppIcon name="chevron" size={14} color={colors.text.muted} />
                      </TouchableOpacity>
                    );
                  })}
                </Card>
              </View>
            )}

            {/* -------------------------------------------------------------- */}
            {/* 10. Plan Cards                                                 */}
            {/* -------------------------------------------------------------- */}
            <PlanCards />
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
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    headerBrand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    brandText: {
      color: colors.text.primary,
      fontWeight: '800',
      fontSize: 17,
      letterSpacing: 3.5,
    },
    greeting: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text.primary,
      lineHeight: 30,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    headerIconBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notifBadge: {
      position: 'absolute',
      top: 9,
      right: 10,
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: '#f87171',
      borderWidth: 2,
      borderColor: colors.card,
    },

    // -- Hero Card ------------------------------------------------------------
    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    heroTextCol: {
      flex: 1,
    },
    heroLabel: {
      fontSize: 13,
      color: colors.text.secondary,
      marginBottom: spacing.xs,
    },
    heroValue: {
      fontSize: 30,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
      marginBottom: spacing.sm,
    },
    heroBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sparklineWrap: {
      marginLeft: spacing.md,
      marginTop: spacing.sm,
    },
    heroDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.lg,
    },
    institutionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    institutionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.elevated,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      gap: 6,
    },
    institutionDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    institutionName: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.text.primary,
      maxWidth: 80,
    },
    institutionPct: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text.secondary,
      fontVariant: ['tabular-nums'],
    },

    // -- Quick Actions --------------------------------------------------------
    quickActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },

    // -- Sections -------------------------------------------------------------
    section: {
      marginBottom: spacing.xl,
    },

    // -- Goals horizontal scroll ----------------------------------------------
    goalsScroll: {
      paddingRight: spacing.xl,
      gap: spacing.md,
    },
    goalCardWrap: {
      width: 260,
    },

    // -- Cards row (side by side) ---------------------------------------------
    cardsRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    miniCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      overflow: 'hidden',
    },
    miniCardStripe: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
    },
    miniCardName: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: spacing.sm,
    },
    miniCardLabel: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
      marginBottom: spacing.md,
    },
    usageBarBg: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: spacing.xs,
    },
    usageBarFill: {
      height: 6,
      borderRadius: 3,
    },
    miniCardUsage: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text.muted,
      textAlign: 'right',
      fontVariant: ['tabular-nums'],
    },

    // -- Transactions ---------------------------------------------------------
    txDivider: {
      height: 1,
      backgroundColor: colors.border,
    },

    // -- Indicators strip -----------------------------------------------------
    indicatorsScroll: {
      gap: spacing.sm,
    },
    indicatorCard: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      minWidth: 110,
      alignItems: 'center',
    },
    indicatorLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text.muted,
      marginBottom: spacing.xs,
    },
    indicatorValue: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'] as any,
    },
    indicatorChange: {
      fontSize: 11,
      fontWeight: '700',
      fontVariant: ['tabular-nums'] as any,
      marginTop: 2,
    },

    // -- News section ---------------------------------------------------------
    newsItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border + '50',
    },
    newsContent: {
      flex: 1,
      marginRight: spacing.sm,
    },
    newsTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.primary,
      lineHeight: 18,
      marginBottom: 4,
    },
    newsMeta: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    newsSource: {
      fontSize: 11,
      color: colors.text.secondary,
    },
    newsDot: {
      fontSize: 11,
      color: colors.text.muted,
    },
    newsTime: {
      fontSize: 11,
      color: colors.text.secondary,
    },

    // -- Empty state ----------------------------------------------------------
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
