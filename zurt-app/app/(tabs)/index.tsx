import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Share,
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
import { syncAllFinance } from '../../src/services/api';

import { Card } from '../../src/components/ui/Card';
import {
  SkeletonCard,
  SkeletonChart,
  SkeletonList,
} from '../../src/components/skeletons/Skeleton';
import { ErrorState } from '../../src/components/shared/ErrorState';
import { SectionHeader } from '../../src/components/shared/SectionHeader';
import { InsightCard } from '../../src/components/shared/InsightCard';
import { TransactionRow } from '../../src/components/shared/TransactionRow';
import { GoalCard } from '../../src/components/shared/GoalCard';
import { AllocationBar } from '../../src/components/shared/AllocationBar';
import PlanCards from '../../src/components/home/PlanCards';

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
// Helpers
// ---------------------------------------------------------------------------

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

const BAR_HEIGHTS = [55, 40, 48, 65, 58, 50, 56, 70, 74, 68, 72, 80];
const SPARKLINE_FALLBACK = [24, 20, 22, 18, 15, 17, 12, 14, 8, 10, 6];

// ---------------------------------------------------------------------------
// HeroSparkline — lightweight SVG sparkline for the hero card
// ---------------------------------------------------------------------------

function HeroSparkline({
  data,
  color,
  width = 80,
  height = 32,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  const pts = data.length >= 2 ? data : SPARKLINE_FALLBACK;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const pad = 2;

  const points = pts.map((v, i) => ({
    x: (i / (pts.length - 1)) * width,
    y: pad + (1 - (v - min) / range) * (height - pad * 2),
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGradient id="heroSparkFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.3" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </SvgGradient>
      </Defs>
      <Path d={areaPath} fill="url(#heroSparkFill)" />
      <Path d={linePath} fill="none" stroke={color} strokeWidth={1.5} />
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
  const { loadMarketOverview } = useMarketStore();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);

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
  const firstName = user?.name?.split(' ')[0] ?? 'Usuário';

  const variation1m = summary?.variation1m ?? 0;
  const isPositive = variation1m >= 0;

  const monthlyReturnValue = summary
    ? summary.totalValue * (variation1m / 100)
    : 0;

  const heroValueParts = useMemo(() => {
    const value = summary?.totalValue ?? 0;
    const abs = Math.abs(value);
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(abs);
    const [integer, decimal] = formatted.split(',');
    return {
      sign: value < 0 ? '-' : '',
      integer: integer || '0',
      decimal: `,${decimal || '00'}`,
    };
  }, [summary?.totalValue]);

  const sparklineData = useMemo(() => {
    const history = summary?.history ?? [];
    if (history.length < 2) return SPARKLINE_FALLBACK;
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
        {/* 1. Header \u2014 Greeting + Eye Toggle + ZURT Avatar               */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.greetingText}>{getGreeting()},</Text>
              <Text style={styles.userName}>{firstName}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={handleToggleValues}
                style={styles.headerBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AppIcon
                  name={valuesHidden ? 'eyeOff' : 'eye'}
                  size={18}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
              <View style={styles.avatarBadge}>
                <Svg width={36} height={36} viewBox="0 0 36 36">
                  <Defs>
                    <SvgGradient id="zurt-av" x1="0" y1="0" x2="1" y2="1">
                      <Stop offset="0%" stopColor="#00D4AA" />
                      <Stop offset="100%" stopColor="#00A888" />
                    </SvgGradient>
                  </Defs>
                  <Rect width={36} height={36} rx={12} fill="url(#zurt-av)" />
                  <SvgText
                    x={18}
                    y={24}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontWeight="900"
                    fontSize={18}
                  >
                    Z
                  </SvgText>
                </Svg>
              </View>
            </View>
          </View>
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
            {/* 2. Hero Card \u2014 Patrimônio Consolidado                        */}
            {/* -------------------------------------------------------------- */}
            {summary && (
              <View style={styles.heroCard}>
                {/* Radial glow background layers */}
                <View style={styles.heroGlow1} />
                <View style={styles.heroGlow2} />

                <View style={styles.heroContent}>
                  {/* Top row: label + sparkline */}
                  <View style={styles.heroTopRow}>
                    <Text style={styles.heroLabel}>
                      PATRIMÔNIO CONSOLIDADO
                    </Text>
                    <HeroSparkline
                      data={sparklineData}
                      color={isPositive ? colors.positive : colors.negative}
                    />
                  </View>

                  {/* Value: R$ + integer + ,decimal */}
                  <View style={styles.heroValueRow}>
                    {valuesHidden ? (
                      <Text style={styles.heroValueMain}>{'\u2022\u2022\u2022\u2022\u2022'}</Text>
                    ) : (
                      <>
                        <Text style={styles.heroValuePrefix}>
                          {heroValueParts.sign}R$
                        </Text>
                        <Text style={styles.heroValueMain}>
                          {heroValueParts.integer}
                        </Text>
                        <Text style={styles.heroValueDecimal}>
                          {heroValueParts.decimal}
                        </Text>
                      </>
                    )}
                  </View>

                  {/* Variation badge + monthly return */}
                  <View style={styles.heroBadgeRow}>
                    <View
                      style={[
                        styles.heroBadge,
                        {
                          backgroundColor: (isPositive ? '#00D4AA' : '#FF4D4D') + '1F',
                          borderColor: (isPositive ? '#00D4AA' : '#FF4D4D') + '33',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.heroBadgeArrow,
                          { color: isPositive ? '#00D4AA' : '#FF4D4D' },
                        ]}
                      >
                        {isPositive ? '\u25B2' : '\u25BC'}
                      </Text>
                      <Text
                        style={[
                          styles.heroBadgeValue,
                          { color: isPositive ? '#00D4AA' : '#FF4D4D' },
                        ]}
                      >
                        {valuesHidden ? '\u2022\u2022\u2022' : formatPct(variation1m)}
                      </Text>
                    </View>
                    <Text style={styles.heroMonthly}>
                      {valuesHidden
                        ? '\u2022\u2022\u2022\u2022\u2022'
                        : `${monthlyReturnValue >= 0 ? '+' : ''}${formatCurrency(monthlyReturnValue, currency)} este mês`}
                    </Text>
                  </View>

                  {/* Mini bar chart \u2014 12 bars */}
                  <View style={styles.barChartRow}>
                    {BAR_HEIGHTS.map((h, i) => (
                      <View
                        key={i}
                        style={[
                          styles.bar,
                          {
                            height: (h / 100) * 36,
                            backgroundColor:
                              i === BAR_HEIGHTS.length - 1
                                ? colors.accent + '80'
                                : colors.accent + '26',
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Empty State \u2014 no connections                                 */}
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
              {([
                { icon: 'bank' as const, label: 'Conectar\nbanco', accent: true, onPress: () => router.push('/connect-bank') },
                { icon: 'chart' as const, label: 'Gerar\nrelatório', accent: false, onPress: () => router.push('/report') },
                { icon: 'refresh' as const, label: 'Sincronizar', accent: false, onPress: handleSync },
                { icon: 'gift' as const, label: 'Convidar\namigos', accent: false, onPress: () => Share.share({ message: 'Conheça o ZURT - inteligência patrimonial na palma da mão! https://zurt.com.br' }) },
              ] as const).map((btn, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.qaBtn, btn.accent && styles.qaBtnAccent]}
                  activeOpacity={0.7}
                  onPress={btn.onPress}
                >
                  <AppIcon name={btn.icon} size={22} color={btn.accent ? colors.accent : colors.text.secondary} />
                  <Text style={[styles.qaLabel, btn.accent && styles.qaLabelAccent]}>
                    {btn.label}
                  </Text>
                </TouchableOpacity>
              ))}
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
            {/* 6. Metas \u2014 horizontal scroll                                   */}
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
            {/* 7. Cartões \u2014 2 side by side                                    */}
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
                          {valuesHidden ? '\u2022\u2022%' : `${(usage * 100).toFixed(0)}%`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* -------------------------------------------------------------- */}
            {/* 8. Movimentações \u2014 last 4                                      */}
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
            {/* 9. Notícias do Mercado                                        */}
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
                                <Text style={styles.newsDot}>{' · '}</Text>
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
      paddingBottom: spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeft: {
      flex: 1,
    },
    greetingText: {
      fontSize: 13,
      color: colors.text.secondary,
    },
    userName: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text.primary,
      lineHeight: 28,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    headerBtn: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarBadge: {
      width: 36,
      height: 36,
      borderRadius: 12,
      overflow: 'hidden',
    },

    // -- Hero Card (Patrimônio) -----------------------------------------------
    heroCard: {
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginBottom: spacing.lg,
    },
    heroGlow1: {
      position: 'absolute',
      top: -40,
      left: -40,
      width: 250,
      height: 200,
      borderRadius: 999,
      backgroundColor: '#00D4AA',
      opacity: 0.05,
    },
    heroGlow2: {
      position: 'absolute',
      bottom: -40,
      right: -40,
      width: 180,
      height: 180,
      borderRadius: 999,
      backgroundColor: '#3B82F6',
      opacity: 0.03,
    },
    heroContent: {
      paddingVertical: 24,
      paddingHorizontal: 20,
    },
    heroTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    heroLabel: {
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 3,
      color: colors.text.muted,
    },
    heroValueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginTop: 8,
    },
    heroValuePrefix: {
      fontSize: 14,
      color: colors.text.secondary,
      marginRight: 4,
    },
    heroValueMain: {
      fontSize: 42,
      fontWeight: '800',
      color: colors.text.primary,
      letterSpacing: -2,
    },
    heroValueDecimal: {
      fontSize: 18,
      fontWeight: '300',
      color: colors.text.muted,
    },
    heroBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
      flexWrap: 'wrap',
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      gap: 3,
    },
    heroBadgeArrow: {
      fontSize: 10,
      fontWeight: '700',
    },
    heroBadgeValue: {
      fontSize: 12,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    heroMonthly: {
      fontSize: 12,
      color: colors.text.secondary,
      fontVariant: ['tabular-nums'],
    },
    barChartRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 3,
      marginTop: 18,
      height: 36,
    },
    bar: {
      flex: 1,
      borderRadius: 3,
    },

    // -- Quick Actions --------------------------------------------------------
    quickActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 14,
      marginBottom: spacing.xl,
    },
    qaBtn: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    qaBtnAccent: {
      backgroundColor: '#00D4AA0D',
      borderColor: '#00D4AA26',
    },
    qaLabel: {
      fontSize: 10,
      fontWeight: '600',
      textAlign: 'center',
      color: colors.text.secondary,
    },
    qaLabelAccent: {
      color: '#00D4AA',
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
