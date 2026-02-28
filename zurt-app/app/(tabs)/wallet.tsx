import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { usePortfolioStore } from '../../src/stores/portfolioStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useCardsStore } from '../../src/stores/cardsStore';
import { fetchMarketIndicators, fetchTransactions } from '../../src/services/api';
import { formatCurrency, maskValue, formatPct } from '../../src/utils/formatters';
import { SkeletonList } from '../../src/components/skeletons/Skeleton';
import { ErrorState } from '../../src/components/shared/ErrorState';
import { AppIcon } from '../../src/hooks/useIcon';
import { LinearGradient } from 'expo-linear-gradient';
import type { Asset } from '../../src/types';

// ---------------------------------------------------------------------------
// Theme Constants
// ---------------------------------------------------------------------------

const C = {
  bg: '#0A0E14',
  card: '#111820',
  cardBorder: '#1A2332',
  accent: '#00D4AA',
  accentDim: '#00D4AA20',
  red: '#FF4757',
  orange: '#FF8C42',
  yellow: '#F5A623',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  purpleDark: '#6D28D9',
  text: '#F1F5F9',
  textSec: '#64748B',
  textDim: '#334155',
};

const ALLOC_COLORS: Record<string, string> = {
  fixedIncome: C.accent,
  stocks: C.purple,
  fiis: C.blue,
  crypto: C.orange,
  international: C.yellow,
  pension: '#EC4899',
};

const ALLOC_LABELS: Record<string, string> = {
  fixedIncome: 'Renda Fixa',
  stocks: 'Renda Variavel',
  fiis: 'FIIs',
  crypto: 'Cripto',
  international: 'Internacional',
  pension: 'Previdencia',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Orbit Rings — animated concentric arcs
// ---------------------------------------------------------------------------

interface OrbitData {
  label: string;
  value: number;
  pct: number;
  color: string;
}

function OrbitRings({
  data,
  size,
  hidden,
  currency,
}: {
  data: OrbitData[];
  size: number;
  hidden: boolean;
  currency: any;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const baseRadius = size * 0.18;
  const ringGap = size * 0.085;
  const strokeW = size * 0.045;

  // Animated rotations
  const rotations = useRef(
    data.map((_, i) => new Animated.Value(0))
  ).current;

  // Pulse for glowing dots
  const pulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Start rotation for each ring
    rotations.forEach((anim, i) => {
      Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 20000 + i * 12000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    });

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.6,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  if (data.length === 0) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.textSec, fontSize: 13 }}>Sem dados</Text>
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size }}>
      {data.map((item, i) => {
        const r = baseRadius + i * ringGap;
        const circumference = 2 * Math.PI * r;
        const arcLength = circumference * Math.min(item.pct / 100, 1);
        const gapLength = circumference - arcLength;

        const rotation = rotations[i]?.interpolate({
          inputRange: [0, 1],
          outputRange: i % 2 === 0 ? ['0deg', '360deg'] : ['360deg', '0deg'],
        });

        return (
          <Animated.View
            key={item.label}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              transform: [{ rotate: rotation || '0deg' }],
            }}
          >
            <Svg width={size} height={size}>
              {/* Background ring */}
              <Circle
                cx={cx}
                cy={cy}
                r={r}
                stroke={C.cardBorder}
                strokeWidth={strokeW}
                fill="none"
                opacity={0.4}
              />
              {/* Colored arc */}
              <Circle
                cx={cx}
                cy={cy}
                r={r}
                stroke={item.color}
                strokeWidth={strokeW}
                fill="none"
                strokeDasharray={`${arcLength} ${gapLength}`}
                strokeDashoffset={circumference * 0.25}
                strokeLinecap="round"
                opacity={0.9}
              />
            </Svg>
          </Animated.View>
        );
      })}

      {/* Center label */}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Animated.View style={{ opacity: pulse }}>
          <View style={{
            width: size * 0.2,
            height: size * 0.2,
            borderRadius: size * 0.1,
            backgroundColor: C.accent + '15',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <View style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: C.accent,
            }} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Evolution Chart — SVG line chart with gradient fill
// ---------------------------------------------------------------------------

function EvolutionChart({
  data,
  width,
  height,
  hidden,
}: {
  data: { label: string; value: number }[];
  width: number;
  height: number;
  hidden: boolean;
}) {
  if (data.length < 2) {
    return (
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.textSec, fontSize: 13 }}>Dados insuficientes</Text>
      </View>
    );
  }

  const padX = 10;
  const padTop = 15;
  const padBot = 25;
  const chartW = width - padX * 2;
  const chartH = height - padTop - padBot;

  const values = data.map((d) => d.value);
  const minV = Math.min(...values) * 0.98;
  const maxV = Math.max(...values) * 1.02;
  const rangeV = maxV - minV || 1;

  const points = data.map((d, i) => ({
    x: padX + (i / (data.length - 1)) * chartW,
    y: padTop + chartH - ((d.value - minV) / rangeV) * chartH,
  }));

  // Line path
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  // Fill path (closed to bottom)
  const fillPath =
    linePath +
    ` L ${points[points.length - 1].x.toFixed(1)} ${(height - padBot).toFixed(1)}` +
    ` L ${points[0].x.toFixed(1)} ${(height - padBot).toFixed(1)} Z`;

  return (
    <View style={{ opacity: hidden ? 0.3 : 1 }}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={C.accent} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={C.accent} stopOpacity={0.02} />
          </SvgLinearGradient>
        </Defs>

        {/* Gradient fill */}
        <Path d={fillPath} fill="url(#chartGrad)" />

        {/* Line */}
        <Path d={linePath} stroke={C.accent} strokeWidth={2.5} fill="none" strokeLinejoin="round" />

        {/* Dots */}
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={C.accent} />
        ))}
      </Svg>

      {/* X labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: padX, marginTop: -padBot + 5 }}>
        {data.map((d, i) => (
          <Text key={i} style={{ color: C.textSec, fontSize: 10, fontWeight: '500' }}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Flow Bar — income vs expense
// ---------------------------------------------------------------------------

function FlowBar({
  income,
  expense,
  hidden,
  currency,
}: {
  income: number;
  expense: number;
  hidden: boolean;
  currency: any;
}) {
  const total = income + expense || 1;
  const incomePct = (income / total) * 100;
  const expensePct = (expense / total) * 100;

  const display = (v: number) =>
    hidden ? maskValue(formatCurrency(v, currency), currency) : formatCurrency(v, currency);

  return (
    <View style={styles.flowContainer}>
      <View style={styles.flowBarTrack}>
        <View style={[styles.flowBarSegment, { width: `${incomePct}%`, backgroundColor: C.accent }]} />
        <View style={[styles.flowBarSegment, { width: `${expensePct}%`, backgroundColor: C.red }]} />
      </View>
      <View style={styles.flowLabels}>
        <View style={styles.flowLabelItem}>
          <View style={[styles.flowDot, { backgroundColor: C.accent }]} />
          <Text style={styles.flowLabelText}>Receita</Text>
          <Text style={[styles.flowValue, { color: C.accent }]}>{display(income)}</Text>
        </View>
        <View style={styles.flowLabelItem}>
          <View style={[styles.flowDot, { backgroundColor: C.red }]} />
          <Text style={styles.flowLabelText}>Despesa</Text>
          <Text style={[styles.flowValue, { color: C.red }]}>{display(expense)}</Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Macro Card — single indicator
// ---------------------------------------------------------------------------

function MacroCard({
  label,
  value,
  change,
  color,
  icon,
}: {
  label: string;
  value: string;
  change?: string;
  color: string;
  icon: string;
}) {
  return (
    <View style={[styles.macroCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <Text style={styles.macroIcon}>{icon}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>{value}</Text>
      {change ? (
        <Text style={[styles.macroChange, { color: change.startsWith('+') ? C.accent : change.startsWith('-') ? C.red : C.textSec }]}>
          {change}
        </Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Position Item — single investment row
// ---------------------------------------------------------------------------

function PositionItem({
  asset,
  hidden,
  currency,
  onPress,
}: {
  asset: Asset;
  hidden: boolean;
  currency: any;
  onPress: (a: Asset) => void;
}) {
  const classColor = ALLOC_COLORS[asset.class] ?? C.textSec;
  const classLabel = ALLOC_LABELS[asset.class] ?? asset.class;
  const isPositive = asset.variation >= 0;

  return (
    <TouchableOpacity
      style={styles.positionRow}
      onPress={() => onPress(asset)}
      activeOpacity={0.7}
    >
      <View style={[styles.positionDot, { backgroundColor: classColor }]} />
      <View style={styles.positionInfo}>
        <Text style={styles.positionName} numberOfLines={1}>
          {asset.ticker || asset.name}
        </Text>
        <Text style={styles.positionClass}>{classLabel}</Text>
      </View>
      <View style={styles.positionValues}>
        <Text style={styles.positionValue}>
          {hidden ? maskValue(formatCurrency(asset.currentValue, currency), currency) : formatCurrency(asset.currentValue, currency)}
        </Text>
        <Text style={[styles.positionChange, { color: isPositive ? C.accent : C.red }]}>
          {hidden ? '****' : formatPct(asset.variation)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const router = useRouter();

  // Stores
  const {
    summary,
    assets,
    allocations,
    institutions,
    isLoading,
    isRefreshing,
    error,
    loadPortfolio,
    refresh,
  } = usePortfolioStore();
  const { valuesHidden, toggleValuesHidden } = useAuthStore();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const dashboardTransactions = useCardsStore((s) => s.dashboardTransactions);

  // Local state
  const [indicators, setIndicators] = useState<any>(null);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  useEffect(() => {
    loadPortfolio();
    fetchMarketIndicators().then(setIndicators).catch(() => {});
  }, []);

  const handleRefresh = useCallback(() => {
    refresh();
    fetchMarketIndicators().then(setIndicators).catch(() => {});
  }, [refresh]);

  // ---------------------------------------------------------------------------
  // Derived: allocations for orbit
  // ---------------------------------------------------------------------------

  const orbitData: OrbitData[] = useMemo(() => {
    if (!allocations || allocations.length === 0) return [];
    const total = allocations.reduce((s, a) => s + a.value, 0) || 1;
    return allocations
      .filter((a) => a.value > 0)
      .sort((a, b) => a.value - b.value) // inner = smallest
      .map((a) => ({
        label: a.label || ALLOC_LABELS[a.class] || a.class,
        value: a.value,
        pct: (a.value / total) * 100,
        color: a.color || ALLOC_COLORS[a.class] || C.textSec,
      }));
  }, [allocations]);

  // ---------------------------------------------------------------------------
  // Derived: evolution chart from summary.history
  // ---------------------------------------------------------------------------

  const chartData = useMemo(() => {
    const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    if (summary?.history && summary.history.length >= 2) {
      return summary.history.slice(-6).map((h) => ({
        label: h.month || MONTH_LABELS[parseInt(h.date?.split('-')[1] || '1', 10) - 1] || '',
        value: h.value,
      }));
    }
    // Placeholder
    return MONTH_LABELS.slice(-6).map((m, i) => ({
      label: m,
      value: (summary?.totalValue ?? 100000) * (0.92 + i * 0.016),
    }));
  }, [summary]);

  // ---------------------------------------------------------------------------
  // Derived: monthly flow from dashboardTransactions
  // ---------------------------------------------------------------------------

  const flow = useMemo(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    let income = 0;
    let expense = 0;
    for (const tx of dashboardTransactions) {
      const txDate = new Date(tx.date);
      if (txDate >= firstDay) {
        if (tx.amount > 0) income += tx.amount;
        else expense += Math.abs(tx.amount);
      }
    }
    return { income, expense };
  }, [dashboardTransactions]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleAssetPress = useCallback(
    (asset: Asset) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (asset.ticker) {
        router.push({ pathname: '/asset-detail', params: { ticker: asset.ticker } });
      }
    },
    [router]
  );

  const handleToggleHidden = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleValuesHidden();
  }, [toggleValuesHidden]);

  // ---------------------------------------------------------------------------
  // Display helpers
  // ---------------------------------------------------------------------------

  const display = useCallback(
    (v: number) =>
      valuesHidden
        ? maskValue(formatCurrency(v, currency), currency)
        : formatCurrency(v, currency),
    [valuesHidden, currency]
  );

  // ---------------------------------------------------------------------------
  // Macro indicators
  // ---------------------------------------------------------------------------

  const macroCards = useMemo(() => {
    const cards: { label: string; value: string; change?: string; color: string; icon: string }[] = [];

    if (indicators?.selic) {
      const selic = Array.isArray(indicators.selic) ? indicators.selic[0] : indicators.selic;
      const selicVal = selic?.value ?? selic?.rate ?? selic;
      cards.push({
        label: 'SELIC',
        value: typeof selicVal === 'number' ? `${selicVal.toFixed(2)}%` : `${selicVal}%`,
        change: 'mantida',
        color: C.accent,
        icon: '\uD83C\uDFE6',
      });
    }

    if (indicators?.inflation) {
      const inf = Array.isArray(indicators.inflation) ? indicators.inflation[0] : indicators.inflation;
      const infVal = inf?.value ?? inf?.rate ?? inf;
      cards.push({
        label: 'IPCA',
        value: typeof infVal === 'number' ? `${infVal.toFixed(2)}%` : `${infVal}%`,
        color: C.orange,
        icon: '\uD83D\uDCC8',
      });
    }

    if (indicators?.currencies) {
      const usd = Array.isArray(indicators.currencies)
        ? indicators.currencies.find((c: any) => c.fromCurrency === 'USD' || c.symbol === 'USD')
        : indicators.currencies?.USD;
      if (usd) {
        const price = usd.bidPrice ?? usd.price ?? usd.regularMarketPrice ?? 0;
        const change = usd.regularMarketChangePercent ?? usd.pctChange ?? 0;
        cards.push({
          label: 'USD/BRL',
          value: `R$ ${Number(price).toFixed(2)}`,
          change: `${change >= 0 ? '+' : ''}${Number(change).toFixed(2)}%`,
          color: C.blue,
          icon: '\uD83D\uDCB5',
        });
      }
    }

    if (indicators?.ibovespa) {
      const ibov = indicators.ibovespa;
      const price = ibov.regularMarketPrice ?? ibov.price ?? 0;
      const change = ibov.regularMarketChangePercent ?? 0;
      cards.push({
        label: 'IBOV',
        value: Number(price).toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
        change: `${change >= 0 ? '+' : ''}${Number(change).toFixed(2)}%`,
        color: C.purple,
        icon: '\uD83D\uDCCA',
      });
    }

    // Fill to at least 4 cards
    if (cards.length === 0) {
      cards.push(
        { label: 'SELIC', value: '---', color: C.accent, icon: '\uD83C\uDFE6' },
        { label: 'IPCA', value: '---', color: C.orange, icon: '\uD83D\uDCC8' },
        { label: 'USD/BRL', value: '---', color: C.blue, icon: '\uD83D\uDCB5' },
        { label: 'IBOV', value: '---', color: C.purple, icon: '\uD83D\uDCCA' }
      );
    }

    return cards;
  }, [indicators]);

  // ---------------------------------------------------------------------------
  // Orbit chart sizing
  // ---------------------------------------------------------------------------

  const orbitSize = Math.min(screenWidth * 0.48, 200);
  const chartWidth = screenWidth - 40;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading && !summary) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>{t('wallet.title')}</Text>
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <SkeletonList count={6} />
        </View>
      </View>
    );
  }

  if (error && !summary && assets.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>{t('wallet.title')}</Text>
        </View>
        <ErrorState message={error} onRetry={loadPortfolio} />
      </View>
    );
  }

  const totalValue = summary?.totalValue ?? 0;
  const monthVar = summary?.variation1m ?? 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={C.accent}
            colors={[C.accent]}
            progressBackgroundColor={C.card}
          />
        }
      >
        {/* ============================================================= */}
        {/* SECTION 1: HERO — Patrimonio                                  */}
        {/* ============================================================= */}

        <View style={styles.heroSection}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroLabel}>Patrimonio consolidado</Text>
            <TouchableOpacity onPress={handleToggleHidden} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <AppIcon name={valuesHidden ? 'eyeOff' : 'eye'} size={20} color={C.textSec} />
            </TouchableOpacity>
          </View>
          <Text style={styles.heroValue}>
            {display(totalValue)}
          </Text>
          {monthVar !== 0 && (
            <View style={[styles.heroBadge, { backgroundColor: monthVar >= 0 ? C.accent + '18' : C.red + '18' }]}>
              <Text style={[styles.heroBadgeText, { color: monthVar >= 0 ? C.accent : C.red }]}>
                {formatPct(monthVar)} no mes
              </Text>
            </View>
          )}
        </View>

        {/* ============================================================= */}
        {/* SECTION 2: ORBITS — Allocation                                */}
        {/* ============================================================= */}

        {orbitData.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Alocacao" />
            <View style={styles.orbitRow}>
              <OrbitRings data={orbitData} size={orbitSize} hidden={valuesHidden} currency={currency} />
              <View style={styles.orbitLegend}>
                {orbitData.map((item) => (
                  <View key={item.label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <View style={styles.legendTextCol}>
                      <Text style={styles.legendLabel} numberOfLines={1}>{item.label}</Text>
                      <Text style={styles.legendValue}>
                        {valuesHidden ? '****' : `${item.pct.toFixed(1)}%`}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ============================================================= */}
        {/* SECTION 3: EVOLUTION — 6-month chart                          */}
        {/* ============================================================= */}

        <View style={styles.section}>
          <SectionHeader title="Evolucao" subtitle="Ultimos 6 meses" />
          <View style={styles.chartCard}>
            <EvolutionChart
              data={chartData}
              width={chartWidth}
              height={160}
              hidden={valuesHidden}
            />
          </View>
        </View>

        {/* ============================================================= */}
        {/* SECTION 4: POSITIONS — Investments                            */}
        {/* ============================================================= */}

        <View style={styles.section}>
          <SectionHeader title="Posicoes" subtitle={assets.length > 0 ? `${assets.length} ativos` : undefined} />
          {assets.length === 0 ? (
            <View style={styles.emptyCard}>
              <AppIcon name="briefcase" size={32} color={C.textSec} />
              <Text style={styles.emptyText}>Conecte seu banco para ver seus investimentos</Text>
            </View>
          ) : (
            <View style={styles.positionsCard}>
              {assets.slice(0, 15).map((asset) => (
                <PositionItem
                  key={asset.id}
                  asset={asset}
                  hidden={valuesHidden}
                  currency={currency}
                  onPress={handleAssetPress}
                />
              ))}
              {assets.length > 15 && (
                <TouchableOpacity
                  style={styles.seeAllBtn}
                  onPress={() => router.push('/market')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.seeAllText}>Ver todos ({assets.length})</Text>
                  <AppIcon name="chevron" size={14} color={C.accent} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ============================================================= */}
        {/* SECTION 5: FLOW — Income vs Expense                           */}
        {/* ============================================================= */}

        {(flow.income > 0 || flow.expense > 0) && (
          <View style={styles.section}>
            <SectionHeader title="Fluxo do mes" />
            <View style={styles.cardContainer}>
              <FlowBar income={flow.income} expense={flow.expense} hidden={valuesHidden} currency={currency} />
            </View>
          </View>
        )}

        {/* ============================================================= */}
        {/* SECTION 6: MARKET — Macro Indicators                          */}
        {/* ============================================================= */}

        <View style={styles.section}>
          <SectionHeader title="Mercado" />
          <View style={styles.macroGrid}>
            {macroCards.map((card, i) => (
              <MacroCard key={card.label + i} {...card} />
            ))}
          </View>
        </View>

        {/* ============================================================= */}
        {/* SECTION 7: B3 — Coming Soon Banner                            */}
        {/* ============================================================= */}

        <View style={styles.section}>
          <LinearGradient
            colors={[C.purple, C.purpleDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.b3Banner}
          >
            <Text style={styles.b3Icon}>{'\uD83D\uDE80'}</Text>
            <View style={styles.b3TextCol}>
              <Text style={styles.b3Title}>Portal do Investidor B3</Text>
              <Text style={styles.b3Subtitle}>Posicoes detalhadas por ticker — EM BREVE</Text>
            </View>
          </LinearGradient>
        </View>

        {/* ============================================================= */}
        {/* SECTION 8: CTA — Open Finance                                 */}
        {/* ============================================================= */}

        {assets.length === 0 && institutions.length === 0 && (
          <View style={styles.section}>
            <View style={styles.ctaCard}>
              <AppIcon name="link" size={28} color={C.accent} />
              <Text style={styles.ctaTitle}>Conectar banco via Open Finance</Text>
              <Text style={styles.ctaSubtitle}>Importe investimentos, contas e cartoes automaticamente</Text>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/connect-bank');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.ctaButtonText}>Conectar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
  },

  // Section
  section: {
    marginTop: 28,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: C.textSec,
    marginTop: 2,
  },

  // Hero
  heroSection: {
    paddingTop: 28,
    paddingBottom: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heroLabel: {
    fontSize: 14,
    color: C.textSec,
    fontWeight: '500',
  },
  heroValue: {
    fontSize: 34,
    fontWeight: '800',
    color: C.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  heroBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Orbit
  orbitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  orbitLegend: {
    flex: 1,
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendTextCol: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 12,
    color: C.textSec,
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 13,
    color: C.text,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Chart
  chartCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 16,
    paddingBottom: 8,
  },

  // Positions
  positionsCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    overflow: 'hidden',
  },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  positionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  positionInfo: {
    flex: 1,
  },
  positionName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  positionClass: {
    fontSize: 11,
    color: C.textSec,
    marginTop: 2,
  },
  positionValues: {
    alignItems: 'flex-end',
  },
  positionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    fontVariant: ['tabular-nums'],
  },
  positionChange: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.accent,
  },

  // Flow
  cardContainer: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 16,
  },
  flowContainer: {
    gap: 12,
  },
  flowBarTrack: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: C.cardBorder,
  },
  flowBarSegment: {
    height: 12,
  },
  flowLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  flowLabelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  flowLabelText: {
    fontSize: 12,
    color: C.textSec,
  },
  flowValue: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Macro
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  macroCard: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: '45%',
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 14,
    gap: 4,
  },
  macroIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textSec,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
    fontVariant: ['tabular-nums'],
  },
  macroChange: {
    fontSize: 12,
    fontWeight: '600',
  },

  // B3 Banner
  b3Banner: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  b3Icon: {
    fontSize: 28,
  },
  b3TextCol: {
    flex: 1,
  },
  b3Title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  b3Subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },

  // CTA
  ctaCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.cardBorder,
    borderStyle: 'dashed',
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 13,
    color: C.textSec,
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: C.accent,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.bg,
  },

  // Empty
  emptyCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: C.textSec,
    textAlign: 'center',
    lineHeight: 20,
  },
});
