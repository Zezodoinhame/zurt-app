import React, { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Share,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Text as SvgText, Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useRouter, useFocusEffect } from 'expo-router';

import { type ThemeColors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { useAuthStore } from '../../src/stores/authStore';
import { usePortfolioStore } from '../../src/stores/portfolioStore';
import { useGoalsStore } from '../../src/stores/goalsStore';
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
import { GoalCard } from '../../src/components/shared/GoalCard';
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
import { useAvatarState } from '../../src/components/ui/UserAvatar';

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
  const { loadInitialInsights } = useAgentStore();
  const { articles: newsArticles, loadNews } = useNewsStore();
  const {
    ibovespa,
    usdBrl,
    eurBrl,
    btcBrl,
    isLoading: marketLoading,
    loadMarketOverview,
  } = useMarketStore();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);

  const [isSyncing, setIsSyncing] = useState(false);

  // ---- Avatar ----------------------------------------------------------------
  const { customUri: avatarUri, presetId: avatarPresetId } = useAvatarState();

  // ---- Counting animation ----------------------------------------------------
  const [animatedValue, setAnimatedValue] = useState(0);
  const animFrameRef = useRef<number>(0);

  const targetValue = summary?.totalValue ?? 0;

  useFocusEffect(
    useCallback(() => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      if (valuesHidden || !summary) {
        setAnimatedValue(targetValue);
        return;
      }

      const duration = 1500;
      const startTime = performance.now();
      const endValue = targetValue;
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      setAnimatedValue(0);

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setAnimatedValue(endValue * easeOutCubic(progress));
        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);

      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    }, [targetValue, valuesHidden, summary])
  );

  // ---- Memoised styles ------------------------------------------------------
  const styles = useMemo(() => createStyles(colors), [colors]);

  // ---- Effects --------------------------------------------------------------
  useEffect(() => {
    loadPortfolio();
    loadGoals();
    loadBenchmarks();
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
    const value = animatedValue;
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
  }, [animatedValue]);

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

  // ---- Valid allocations (> 0) ----------------------------------------------
  const validAllocations = useMemo(
    () => allocations.filter((a) => a.value > 0),
    [allocations],
  );

  // ---- Market preview items --------------------------------------------------
  const marketPreview = useMemo(() => {
    const items: { ticker: string; name: string; price: number; change: number; isCurrency: boolean }[] = [];
    if (ibovespa) {
      items.push({
        ticker: 'IBOV',
        name: 'Ibovespa',
        price: Number(ibovespa.regularMarketPrice || 0),
        change: Number(ibovespa.regularMarketChangePercent || 0),
        isCurrency: false,
      });
    }
    if (usdBrl) {
      items.push({
        ticker: 'USD/BRL',
        name: 'Dólar',
        price: Number(usdBrl.bidPrice || 0),
        change: Number(usdBrl.regularMarketChangePercent || 0),
        isCurrency: true,
      });
    }
    if (eurBrl) {
      items.push({
        ticker: 'EUR/BRL',
        name: 'Euro',
        price: Number(eurBrl.bidPrice || 0),
        change: Number(eurBrl.regularMarketChangePercent || 0),
        isCurrency: true,
      });
    }
    if (btcBrl) {
      items.push({
        ticker: 'BTC',
        name: 'Bitcoin',
        price: Number(btcBrl.regularMarketPrice || 0),
        change: Number(btcBrl.regularMarketChangePercent || 0),
        isCurrency: true,
      });
    }
    return items;
  }, [ibovespa, usdBrl, eurBrl, btcBrl]);

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
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
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.avatarImage}
                  />
                ) : (
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
                      {user?.initials?.[0] ?? 'Z'}
                    </SvgText>
                  </Svg>
                )}
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
            {/* 5. Metas \u2014 horizontal scroll                                   */}
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
            {/* 6. Meu Patrimônio                                              */}
            {/* -------------------------------------------------------------- */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <AppIcon name="chart" size={18} color={colors.text.primary} />
                  <Text style={styles.sectionTitle}>Meu Patrimônio</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(tabs)/wallet')} activeOpacity={0.7}>
                  <Text style={styles.sectionLink}>Ver detalhes ›</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.patrimonyCard}>
                {validAllocations.length > 0 ? (
                  <>
                    {/* Stacked bar */}
                    <View style={styles.stackedBar}>
                      {validAllocations.map((cls, i) => (
                        <View
                          key={i}
                          style={{
                            flex: cls.percentage,
                            backgroundColor: cls.color,
                            marginRight: i < validAllocations.length - 1 ? 1 : 0,
                          }}
                        />
                      ))}
                    </View>

                    {/* Class list */}
                    <View style={{ marginTop: 14 }}>
                      {validAllocations.map((cls, i) => (
                        <View key={i} style={styles.classRow}>
                          <View style={styles.classRowLeft}>
                            <View style={[styles.classDot, { backgroundColor: cls.color }]} />
                            <Text style={styles.className}>{cls.label}</Text>
                          </View>
                          <View style={styles.classRowRight}>
                            <Text style={styles.classValue}>
                              {valuesHidden ? maskValue('') : formatCurrency(cls.value, currency)}
                            </Text>
                            <Text style={styles.classPct}>{cls.percentage.toFixed(1)}%</Text>
                          </View>
                        </View>
                      ))}
                    </View>

                    {/* Monthly return footer */}
                    <View style={styles.patrimonyFooter}>
                      <Text style={styles.patrimonyFooterLabel}>Rendimento este mês</Text>
                      <Text
                        style={[
                          styles.patrimonyFooterValue,
                          { color: monthlyReturnValue >= 0 ? '#00D4AA' : '#FF4D4D' },
                        ]}
                      >
                        {valuesHidden
                          ? maskValue('')
                          : `${monthlyReturnValue >= 0 ? '+' : ''}${formatCurrency(monthlyReturnValue, currency)} (${variation1m >= 0 ? '+' : ''}${variation1m.toFixed(2)}%)`}
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.patrimonyEmpty}>
                    <AppIcon name="chart" size={48} color={colors.text.muted + '4D'} />
                    <Text style={styles.patrimonyEmptyText}>
                      Conecte seus bancos para ver seu patrimônio
                    </Text>
                    <TouchableOpacity
                      style={styles.patrimonyEmptyBtn}
                      activeOpacity={0.7}
                      onPress={() => router.push('/connect-bank')}
                    >
                      <Text style={styles.patrimonyEmptyBtnText}>Conectar banco</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* -------------------------------------------------------------- */}
            {/* 7. Mercado                                                     */}
            {/* -------------------------------------------------------------- */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <AppIcon name="trending" size={18} color={colors.text.primary} />
                  <Text style={styles.sectionTitle}>Mercado</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/market')} activeOpacity={0.7}>
                  <Text style={styles.sectionLink}>Ver todos ›</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.marketScroll}
              >
                {marketLoading && marketPreview.length === 0
                  ? [0, 1, 2, 3].map((i) => (
                      <View key={i} style={[styles.marketCard, { opacity: 0.4 }]}>
                        <View style={{ width: 40, height: 10, borderRadius: 4, backgroundColor: colors.border, marginBottom: 6 }} />
                        <View style={{ width: 60, height: 8, borderRadius: 4, backgroundColor: colors.border, marginBottom: 12 }} />
                        <View style={{ width: 70, height: 14, borderRadius: 4, backgroundColor: colors.border, marginBottom: 6 }} />
                        <View style={{ width: 50, height: 10, borderRadius: 4, backgroundColor: colors.border }} />
                      </View>
                    ))
                  : marketPreview.map((item) => (
                      <TouchableOpacity
                        key={item.ticker}
                        style={styles.marketCard}
                        activeOpacity={0.7}
                        onPress={() => router.push('/market')}
                      >
                        <Text style={styles.marketTicker}>{item.ticker}</Text>
                        <Text style={styles.marketName}>{item.name}</Text>
                        <Text style={styles.marketPrice}>
                          {item.isCurrency
                            ? `R$ ${item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : item.price.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </Text>
                        <Text
                          style={[
                            styles.marketChange,
                            { color: item.change >= 0 ? '#00D4AA' : '#FF4D4D' },
                          ]}
                        >
                          {item.change >= 0 ? '\u25B2' : '\u25BC'}{' '}
                          {item.change >= 0 ? '+' : ''}
                          {item.change.toFixed(2)}%
                        </Text>
                      </TouchableOpacity>
                    ))}
              </ScrollView>
            </View>

            {/* -------------------------------------------------------------- */}
            {/* 8. Notícias do Mercado                                        */}
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
            {/* 9. Plan Cards                                                  */}
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
      borderRadius: 18,
      overflow: 'hidden',
    },
    avatarImage: {
      width: 36,
      height: 36,
      borderRadius: 18,
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

    // -- Section headers -------------------------------------------------------
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
    },
    sectionLink: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },

    // -- Meu Patrimônio -------------------------------------------------------
    patrimonyCard: {
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    stackedBar: {
      flexDirection: 'row',
      height: 12,
      borderRadius: 6,
      overflow: 'hidden',
    },
    classRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    classRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    classDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    className: {
      fontSize: 13,
      color: colors.text.primary,
    },
    classRowRight: {
      alignItems: 'flex-end',
    },
    classValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    classPct: {
      fontSize: 11,
      color: colors.text.secondary,
      fontVariant: ['tabular-nums'],
    },
    patrimonyFooter: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
      marginTop: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    patrimonyFooterLabel: {
      fontSize: 12,
      color: colors.text.secondary,
    },
    patrimonyFooterValue: {
      fontSize: 14,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    patrimonyEmpty: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    patrimonyEmptyText: {
      fontSize: 13,
      color: colors.text.secondary,
      textAlign: 'center',
      marginTop: spacing.md,
      marginBottom: spacing.lg,
    },
    patrimonyEmptyBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
    },
    patrimonyEmptyBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.background,
    },

    // -- Market ---------------------------------------------------------------
    marketScroll: {
      paddingRight: spacing.xl,
    },
    marketCard: {
      width: 140,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginRight: 10,
    },
    marketTicker: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text.primary,
    },
    marketName: {
      fontSize: 10,
      color: colors.text.secondary,
      marginTop: 2,
    },
    marketPrice: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
      marginTop: 8,
      fontVariant: ['tabular-nums'],
    },
    marketChange: {
      fontSize: 11,
      fontWeight: '600',
      marginTop: 2,
      fontVariant: ['tabular-nums'],
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
