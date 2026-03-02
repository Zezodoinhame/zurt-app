import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Easing,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
  G,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { usePortfolioStore } from '../../src/stores/portfolioStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { formatCurrency, maskValue } from '../../src/utils/formatters';
import { AppIcon } from '../../src/hooks/useIcon';
import { getToken } from '../../src/services/api';
import { logger } from '../../src/utils/logger';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://zurt.com.br/api';

// =============================================================================
// THEME
// =============================================================================
const C = {
  bg: '#0A0E14',
  card: '#111820',
  cardBorder: '#1A2332',
  accent: '#00D4AA',
  accentDim: 'rgba(0,212,170,0.12)',
  red: '#FF4757',
  orange: '#FF8C42',
  yellow: '#F5A623',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  pink: '#EC4899',
  text: '#F1F5F9',
  textSec: '#94A3B8',
  textDim: '#475569',
};

const ALLOC_COLORS: Record<string, string> = {
  CHECKING_ACCOUNT: C.blue,
  SAVINGS_ACCOUNT: C.yellow,
  FIXED_INCOME: C.accent,
  EQUITY: C.purple,
  CRYPTO: C.orange,
  OTHER: C.pink,
};

const ALLOC_LABELS: Record<string, string> = {
  CHECKING_ACCOUNT: 'Conta Corrente',
  SAVINGS_ACCOUNT: 'Poupança',
  FIXED_INCOME: 'Renda Fixa',
  EQUITY: 'Renda Variável',
  CRYPTO: 'Cripto',
  OTHER: 'Outros',
};

const ALLOC_ICONS: Record<string, string> = {
  CHECKING_ACCOUNT: '🏦',
  SAVINGS_ACCOUNT: '🐷',
  FIXED_INCOME: '🔒',
  EQUITY: '📈',
  CRYPTO: '₿',
  OTHER: '📦',
};

// =============================================================================
// FORMATTERS
// =============================================================================
const fmtBRL = (v: number) =>
  'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtK = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return v.toFixed(0);
};

const fmtPct = (v: number | null | undefined) => {
  if (v == null) return '';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
};

// =============================================================================
// API — fetch market indicators
// =============================================================================
async function fetchMarketIndicators(): Promise<any> {
  try {
    const token = await getToken();
    if (!token) return null;
    const res = await fetch(`${API_BASE}/market-data/indicators`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchMonthTransactions(): Promise<{ income: number; expense: number }> {
  try {
    const token = await getToken();
    if (!token) return { income: 0, expense: 0 };
    const now = new Date();
    const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const res = await fetch(`${API_BASE}/finance/transactions?from=${from}&limit=500`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { income: 0, expense: 0 };
    const data = await res.json();
    const txs: any[] = data.transactions ?? [];
    let income = 0, expense = 0;
    for (const t of txs) {
      const amt = parseFloat(t.amount) || 0;
      if (amt > 0) expense += amt;
      else income += Math.abs(amt);
    }
    return { income, expense };
  } catch {
    return { income: 0, expense: 0 };
  }
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

// --- Section Header ---
const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <View style={s.sectionHeader}>
    <Text style={s.sectionTitle}>{title}</Text>
    {subtitle ? <Text style={s.sectionSubtitle}>{subtitle}</Text> : null}
  </View>
);

// --- Orbit Rings (Animated) ---
const OrbitRings = ({ data, size = 220 }: { data: { label: string; value: number; color: string }[]; size?: number }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const minR = 30;
  const maxR = (size / 2) - 12;
  const count = data.length;

  // Create rotation animations
  const rotations = useRef(
    data.map((_, i) => new Animated.Value(0))
  ).current;

  const pulseAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    // Start orbit animations
    rotations.forEach((anim, i) => {
      Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 18000 + i * 14000, // 18s → 74s
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    });

    // Pulse animation for dots
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    return () => {
      rotations.forEach(a => a.stopAnimation());
      pulseAnim.stopAnimation();
    };
  }, []);

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      {/* Background rings + center text (static) */}
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {data.map((d, i) => {
          const r = minR + ((maxR - minR) * (i + 1)) / count;
          return (
            <Circle
              key={`bg-${i}`}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={C.cardBorder}
              strokeWidth={1}
              opacity={0.3}
            />
          );
        })}
        {/* Center */}
        <Circle cx={cx} cy={cy} r={26} fill={C.card} stroke={C.cardBorder} strokeWidth={1} />
        <SvgText
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          fill={C.text}
          fontSize={12}
          fontWeight="800"
        >
          {fmtK(total)}
        </SvgText>
        <SvgText
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fill={C.accent}
          fontSize={8}
          fontWeight="700"
        >
          total
        </SvgText>
      </Svg>

      {/* Animated arcs — each in its own Animated.View */}
      {data.map((d, i) => {
        const r = minR + ((maxR - minR) * (i + 1)) / count;
        const pct = d.value / total;
        const strokeW = Math.max(5, pct * 28);
        const circumference = 2 * Math.PI * r;
        const arcLen = circumference * Math.min(pct * 3, 0.85); // max 85% of circle
        const rotation = rotations[i].interpolate({
          inputRange: [0, 1],
          outputRange: i % 2 === 0 ? ['0deg', '360deg'] : ['360deg', '0deg'],
        });

        return (
          <Animated.View
            key={`orbit-${i}`}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              transform: [{ rotate: rotation }],
            }}
          >
            <Svg width={size} height={size}>
              <Circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={strokeW}
                strokeDasharray={`${arcLen} ${circumference - arcLen}`}
                strokeLinecap="round"
                opacity={0.85}
                rotation={-90}
                origin={`${cx}, ${cy}`}
              />
              {/* Glowing dot at arc tip */}
              <Circle
                cx={cx}
                cy={cy - r}
                r={strokeW / 2 + 2}
                fill={d.color}
                opacity={0.9}
              />
            </Svg>
          </Animated.View>
        );
      })}
    </View>
  );
};

// --- Orbit Legend ---
const OrbitLegend = ({ data, hideValues }: { data: { label: string; value: number; color: string; icon: string }[]; hideValues: boolean }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <View style={{ marginTop: 16 }}>
      {data.map((d, i) => {
        const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
        return (
          <View key={i} style={s.legendRow}>
            <View style={[s.legendDot, { backgroundColor: d.color }]} />
            <Text style={s.legendIcon}>{d.icon}</Text>
            <Text style={s.legendLabel}>{d.label}</Text>
            <View style={{ flex: 1 }} />
            <Text style={s.legendValue}>
              {hideValues ? '•••' : fmtBRL(d.value)}
            </Text>
            <Text style={[s.legendPct, { color: d.color }]}>{pct}%</Text>
          </View>
        );
      })}
    </View>
  );
};

// --- Evolution Line Chart ---
const EvolutionChart = ({ data, width: chartW }: { data: { month: string; value: number }[]; width: number }) => {
  if (!data || data.length < 2) return null;
  const h = 140;
  const padX = 36;
  const padY = 16;
  const values = data.map(d => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = chartW - 32; // padding

  const points = data.map((d, i) => ({
    x: padX + (i / (data.length - 1)) * (w - padX * 2),
    y: padY + (1 - (d.value - min) / range) * (h - padY * 2),
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = pathD + ` L ${points[points.length - 1].x} ${h - 4} L ${points[0].x} ${h - 4} Z`;

  return (
    <View style={[s.card, { padding: 16 }]}>
      <Svg width={w} height={h + 24}>
        <Defs>
          <SvgLinearGradient id="evoGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={C.accent} stopOpacity={0.25} />
            <Stop offset="100%" stopColor={C.accent} stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        <Path d={areaD} fill="url(#evoGrad)" />
        <Path d={pathD} fill="none" stroke={C.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 5 : 3}
            fill={i === points.length - 1 ? C.accent : C.card}
            stroke={C.accent}
            strokeWidth={2}
          />
        ))}
        {/* Month labels */}
        {data.map((d, i) => (
          <SvgText
            key={`lbl-${i}`}
            x={points[i].x}
            y={h + 16}
            textAnchor="middle"
            fill={C.textSec}
            fontSize={11}
          >
            {d.month}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
};

// --- Flow Bar ---
const FlowBar = ({ income, expense, hideValues }: { income: number; expense: number; hideValues: boolean }) => {
  const total = income + expense;
  const incomePct = total > 0 ? (income / total) * 100 : 50;

  return (
    <View style={s.card}>
      <View style={{ padding: 16 }}>
        {/* Bar */}
        <View style={s.flowBarContainer}>
          <View style={[s.flowBarSegment, { flex: incomePct, backgroundColor: C.accent, borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }]} />
          <View style={{ width: 2, backgroundColor: C.bg }} />
          <View style={[s.flowBarSegment, { flex: 100 - incomePct, backgroundColor: C.red, borderTopRightRadius: 6, borderBottomRightRadius: 6 }]} />
        </View>

        {/* Labels */}
        <View style={s.flowLabels}>
          <View>
            <Text style={[s.flowLabelTitle, { color: C.accent }]}>↓ Receita</Text>
            <Text style={s.flowLabelValue}>{hideValues ? 'R$ •••' : fmtBRL(income)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[s.flowLabelTitle, { color: C.red }]}>↑ Despesa</Text>
            <Text style={s.flowLabelValue}>{hideValues ? 'R$ •••' : fmtBRL(expense)}</Text>
          </View>
        </View>

        {/* Net */}
        <View style={s.flowNet}>
          <Text style={s.flowNetLabel}>Saldo do mês</Text>
          <Text style={[s.flowNetValue, { color: income - expense >= 0 ? C.accent : C.red }]}>
            {hideValues ? 'R$ •••' : fmtBRL(income - expense)}
          </Text>
        </View>
      </View>
    </View>
  );
};

// --- Macro Indicator Card ---
const MacroCard = ({ label, value, change, color }: { label: string; value: string; change: string; color: string }) => (
  <View style={[s.macroCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
    <Text style={s.macroLabel}>{label}</Text>
    <Text style={s.macroValue}>{value}</Text>
    <Text style={[s.macroChange, { color }]}>{change}</Text>
  </View>
);

// --- Position Item ---
const PositionItem = ({ name, type, value, change, hideValues }: {
  name: string; type: string; value: number; change?: number | null; hideValues: boolean;
}) => {
  // Detect if it has a ticker
  const tickerMatch = name.match(/\b([A-Z]{4}\d{1,2})\b/);
  const displayName = tickerMatch ? tickerMatch[1] : name;
  const typeLabel = type || 'Outros';

  return (
    <View style={s.positionRow}>
      <View style={[s.positionDot, { backgroundColor: ALLOC_COLORS[type] || C.textDim }]} />
      <View style={{ flex: 1 }}>
        <Text style={s.positionName} numberOfLines={1}>{displayName}</Text>
        <Text style={s.positionType}>{ALLOC_LABELS[type] || typeLabel}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={s.positionValue}>{hideValues ? 'R$ •••' : fmtBRL(value)}</Text>
        {change != null && change !== 0 ? (
          <Text style={[s.positionChange, { color: change >= 0 ? C.accent : C.red }]}>
            {fmtPct(change)}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const router = useRouter();

  const portfolio = usePortfolioStore();
  const settings = useSettingsStore();
  const hideValues = (settings as any).hideValues ?? false;

  const [indicators, setIndicators] = useState<any>(null);
  const [flow, setFlow] = useState<{ income: number; expense: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadExtraData = useCallback(async () => {
    const [ind, fl] = await Promise.all([
      fetchMarketIndicators(),
      fetchMonthTransactions(),
    ]);
    if (ind) setIndicators(ind);
    if (fl) setFlow(fl);
  }, []);

  useEffect(() => {
    portfolio.loadPortfolio();
    loadExtraData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([
      portfolio.refresh(),
      loadExtraData(),
    ]);
    setRefreshing(false);
  }, [portfolio, loadExtraData]);

  // ---- Derived data ----

  const patrimonio = portfolio.summary?.totalValue ?? 0;
  const variation = portfolio.summary?.variation1m ?? 0;

  // Build allocation from dashboard data
  const allocationData = useMemo(() => {
    const assets = portfolio.assets ?? [];
    const summary = portfolio.summary;

    // Group by asset class/type
    const groups: Record<string, number> = {};
    for (const a of assets) {
      const cls = (a as any).class || (a as any).type || 'OTHER';
      const val = parseFloat(String(a.currentValue ?? (a as any).current_value ?? 0));
      if (val > 0) {
        groups[cls] = (groups[cls] || 0) + val;
      }
    }

    // If we have summary with cash/investments/debt, use those directly
    if (summary) {
      const cash = parseFloat(String((summary as any).cash ?? (summary as any).cashBalance ?? 0));
      const investments = parseFloat(String((summary as any).investments ?? 0));
      const debt = parseFloat(String((summary as any).debt ?? 0));

      // If no assets were grouped but we have summary data, build from summary
      if (Object.keys(groups).length === 0) {
        if (cash > 0) groups['CHECKING_ACCOUNT'] = cash;
        if (investments > 0) groups['FIXED_INCOME'] = investments;
        if (debt > 0) groups['OTHER'] = debt;
      } else {
        // Add cash if we have it and it's not already counted
        if (cash > 0 && !groups['CHECKING_ACCOUNT']) {
          groups['CHECKING_ACCOUNT'] = cash;
        }
      }
    }

    return Object.entries(groups)
      .filter(([_, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([cls, value]) => ({
        label: ALLOC_LABELS[cls] || cls,
        value,
        color: ALLOC_COLORS[cls] || C.textDim,
        icon: ALLOC_ICONS[cls] || '📦',
      }));
  }, [portfolio.assets, portfolio.institutions, portfolio.summary]);

  // Evolution data
  const evolutionData = useMemo(() => {
    const history = portfolio.summary?.history ?? [];
    if (history.length < 2) return null;
    const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return history.slice(-6).map((h: any) => {
      const d = new Date(h.date || h.month);
      const monthLabel = isNaN(d.getTime()) ? (h.month || '?') : MONTHS[d.getMonth()];
      return { month: monthLabel, value: h.value || 0 };
    });
  }, [portfolio.summary]);

  // Positions (investments) — exclude zero-value assets
  const positions = useMemo(() => {
    const assets = portfolio.assets ?? [];
    const seen = new Set<string>();
    return assets.filter(a => {
      const val = parseFloat(String(a.currentValue ?? (a as any).current_value ?? 0));
      if (val <= 0) return false; // Exclude R$ 0,00
      const key = `${a.name}-${(a as any).class || (a as any).type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [portfolio.assets]);

  // Macro indicators
  const macroCards = useMemo(() => {
    if (!indicators) return null;
    const cards = [];

    // SELIC
    if (indicators.selic) {
      const selicVal = typeof indicators.selic === 'object' ? indicators.selic.value : indicators.selic;
      cards.push({
        label: 'SELIC',
        value: `${selicVal}%`,
        change: 'a.a.',
        color: C.accent,
      });
    }

    // IPCA / Inflation
    const ipca = indicators.inflation ?? indicators.ipca;
    if (ipca) {
      const ipcaVal = typeof ipca === 'object' ? ipca.value : ipca;
      cards.push({
        label: 'IPCA',
        value: `${ipcaVal ?? 0}%`,
        change: '12 meses',
        color: C.orange,
      });
    }

    // USD
    const currencies = indicators.currencies ?? [];
    const usd = Array.isArray(currencies)
      ? currencies.find((c: any) => (c.fromCurrency ?? '').includes('USD'))
      : null;
    if (usd) {
      cards.push({
        label: 'USD/BRL',
        value: `R$ ${parseFloat(usd.bidPrice ?? usd.bid ?? 0).toFixed(2)}`,
        change: usd.percentageChange != null ? `${parseFloat(usd.percentageChange) >= 0 ? '+' : ''}${parseFloat(usd.percentageChange).toFixed(2)}%` : '',
        color: C.blue,
      });
    }

    // IBOV
    const ibov = indicators.ibovespa;
    if (ibov) {
      cards.push({
        label: 'IBOV',
        value: fmtK(parseFloat(String(ibov.points ?? ibov.price ?? 0))),
        change: ibov.changePercent != null ? fmtPct(parseFloat(String(ibov.changePercent))) : '',
        color: C.purple,
      });
    }

    return cards.length > 0 ? cards : null;
  }, [indicators]);

  // ---- Loading state ----
  if (portfolio.isLoading && !portfolio.summary) {
    return (
      <View style={[s.container, { paddingTop: insets.top + 20 }]}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={[s.textSec, { textAlign: 'center', marginTop: 16 }]}>Carregando carteira...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[s.container]}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ============================================================= */}
      {/* SECTION 1: HERO — Patrimônio Consolidado                      */}
      {/* ============================================================= */}
      <View style={s.heroSection}>
        <View style={s.heroRow}>
          <Text style={s.heroLabel}>Patrimônio consolidado</Text>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              (settings as any).toggleHideValues?.();
            }}
          >
            <AppIcon name={hideValues ? 'eye-off' : 'eye'} size={22} color={C.textSec} />
          </TouchableOpacity>
        </View>
        <Text style={s.heroValue}>
          {hideValues ? 'R$ ••••••' : fmtBRL(patrimonio)}
        </Text>
        {variation !== 0 && (
          <View style={[s.heroBadge, { backgroundColor: variation >= 0 ? C.accentDim : 'rgba(255,71,87,0.12)' }]}>
            <Text style={[s.heroBadgeText, { color: variation >= 0 ? C.accent : C.red }]}>
              {fmtPct(variation)} no mês
            </Text>
          </View>
        )}
      </View>

      {/* ============================================================= */}
      {/* SECTION 2: ÓRBITAS — Alocação Visual                          */}
      {/* ============================================================= */}
      {allocationData.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <SectionHeader title="Alocação" subtitle="Distribuição do patrimônio" />
          <View style={s.card}>
            <View style={{ padding: 20 }}>
              <OrbitRings data={allocationData} size={Math.min(screenW - 80, 240)} />
              <OrbitLegend data={allocationData} hideValues={hideValues} />
            </View>
          </View>
        </View>
      )}

      {/* ============================================================= */}
      {/* SECTION 3: EVOLUÇÃO — Gráfico 6 Meses                         */}
      {/* ============================================================= */}
      {evolutionData && (
        <View style={{ marginTop: 28 }}>
          <SectionHeader title="Evolução" subtitle="Últimos 6 meses" />
          <EvolutionChart data={evolutionData} width={screenW} />
        </View>
      )}

      {/* ============================================================= */}
      {/* SECTION 4: POSIÇÕES — Investimentos                            */}
      {/* ============================================================= */}
      <View style={{ marginTop: 28 }}>
        <SectionHeader title="Posições" subtitle={`${positions.length} ativos`} />
        <View style={s.card}>
          {positions.length > 0 ? (
            positions.map((p, i) => (
              <View key={`pos-${i}`}>
                <PositionItem
                  name={p.name}
                  type={(p as any).class || (p as any).type || 'OTHER'}
                  value={parseFloat(String(p.currentValue ?? (p as any).current_value ?? 0))}
                  change={(p as any).variation ?? null}
                  hideValues={hideValues}
                />
                {i < positions.length - 1 && <View style={s.divider} />}
              </View>
            ))
          ) : (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 32 }}>🏦</Text>
              <Text style={[s.textSec, { textAlign: 'center', marginTop: 8 }]}>
                Conecte seu banco para ver{'\n'}seus investimentos
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ============================================================= */}
      {/* SECTION 5: FLUXO — Receita vs Despesa                          */}
      {/* ============================================================= */}
      {flow && (flow.income > 0 || flow.expense > 0) && (
        <View style={{ marginTop: 28 }}>
          <SectionHeader title="Fluxo do Mês" subtitle="Receita vs Despesa" />
          <FlowBar income={flow.income} expense={flow.expense} hideValues={hideValues} />
        </View>
      )}

      {/* ============================================================= */}
      {/* SECTION 7: B3 — Banner Em Breve                                */}
      {/* ============================================================= */}
      <View style={{ marginTop: 28 }}>
        <View style={s.b3Banner}>
          <Text style={{ fontSize: 24 }}>🚀</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.b3Title}>Portal do Investidor B3</Text>
            <Text style={s.b3Subtitle}>Posições detalhadas por ticker — EM BREVE</Text>
          </View>
        </View>
      </View>

      {/* ============================================================= */}
      {/* SECTION 8: CONEXÃO — CTA Open Finance                          */}
      {/* ============================================================= */}
      {positions.length === 0 && (
        <View style={{ marginTop: 28 }}>
          <TouchableOpacity
            style={s.ctaCard}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/connections' as any);
            }}
          >
            <Text style={{ fontSize: 24 }}>🔗</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.ctaTitle}>Conectar banco via Open Finance</Text>
              <Text style={s.ctaSubtitle}>Importe seus investimentos automaticamente</Text>
            </View>
            <AppIcon name="chevron-right" size={20} color={C.accent} />
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

// =============================================================================
// STYLES
// =============================================================================
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: 16,
  },
  textSec: {
    fontSize: 14,
    color: C.textSec,
  },

  // Section Header
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  sectionSubtitle: { fontSize: 13, color: C.textSec, marginTop: 2 },

  // Card
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    overflow: 'hidden',
  },

  // Hero
  heroSection: { marginTop: 8 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { fontSize: 14, color: C.textSec, fontWeight: '500' },
  heroValue: { fontSize: 36, fontWeight: '800', color: C.text, marginTop: 4, letterSpacing: -1 },
  heroBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  heroBadgeText: { fontSize: 13, fontWeight: '700' },

  // Legend
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendIcon: { fontSize: 14, marginRight: 6 },
  legendLabel: { fontSize: 13, color: C.textSec, flex: 0 },
  legendValue: { fontSize: 13, fontWeight: '600', color: C.text, marginRight: 8 },
  legendPct: { fontSize: 12, fontWeight: '700', width: 44, textAlign: 'right' },

  // Flow
  flowBarContainer: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' },
  flowBarSegment: { height: 12 },
  flowLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  flowLabelTitle: { fontSize: 12, fontWeight: '600' },
  flowLabelValue: { fontSize: 15, fontWeight: '700', color: C.text, marginTop: 2 },
  flowNet: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.cardBorder },
  flowNetLabel: { fontSize: 13, color: C.textSec },
  flowNetValue: { fontSize: 16, fontWeight: '800' },

  // Macro
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  macroCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 14,
    width: '48%' as any,
    flexGrow: 1,
  },
  macroLabel: { fontSize: 11, fontWeight: '700', color: C.textSec, textTransform: 'uppercase', letterSpacing: 0.5 },
  macroValue: { fontSize: 20, fontWeight: '800', color: C.text, marginTop: 4 },
  macroChange: { fontSize: 12, fontWeight: '600', marginTop: 2 },

  // Positions
  positionRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  positionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  positionName: { fontSize: 15, fontWeight: '700', color: C.text },
  positionType: { fontSize: 12, color: C.textSec, marginTop: 1 },
  positionValue: { fontSize: 14, fontWeight: '700', color: C.text },
  positionChange: { fontSize: 12, fontWeight: '600', marginTop: 1 },
  divider: { height: 1, backgroundColor: C.cardBorder, marginHorizontal: 14 },

  // B3 Banner
  b3Banner: {
    backgroundColor: '#1E1245',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2D1B69',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  b3Title: { fontSize: 16, fontWeight: '700', color: C.text },
  b3Subtitle: { fontSize: 12, color: C.purple, marginTop: 2, fontWeight: '500' },

  // CTA
  ctaCard: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.cardBorder,
    borderStyle: 'dashed',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  ctaSubtitle: { fontSize: 12, color: C.textSec, marginTop: 2 },
});
