import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path, Line } from 'react-native-svg';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { fetchAssetDetail } from '../src/services/api';
import { formatCurrency, formatBRLCompact, formatNumber, formatPct, formatDate } from '../src/utils/formatters';
import { logger } from '../src/utils/logger';

// ===========================================================================
// Types
// ===========================================================================

interface AssetData {
  symbol: string;
  longName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketOpen: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketPreviousClose: number;
  regularMarketVolume: number;
  marketCap: number;
  priceEarnings: number;
  earningsPerShare: number;
  bookValuePerShare: number;
  priceToBook: number;
  dividendYield: number;
  summaryProfile?: {
    longBusinessSummary?: string;
    sector?: string;
    industry?: string;
    website?: string;
    fullTimeEmployees?: number;
  };
  financialData?: {
    returnOnEquity?: number;
    profitMargins?: number;
    netIncomeToCommon?: number;
    totalDebt?: number;
    ebitda?: number;
  };
  historicalDataPrice?: Array<{ date: number; close: number }>;
  dividendsData?: {
    cashDividends?: Array<{
      paymentDate: string;
      rate: number;
      type: string;
      relatedTo: string;
    }>;
  };
}

type ChartRange = '1M' | '3M' | '6M' | '1A';

// ===========================================================================
// Chart Component (SVG)
// ===========================================================================

function PriceChart({ data, width, height, colors }: { data: number[]; width: number; height: number; colors: ThemeColors }) {
  const { t } = useSettingsStore();
  const chartStyles = useMemo(() => createChartStyles(colors), [colors]);

  if (data.length < 2) {
    return (
      <View style={[chartStyles.empty, { width, height }]}>
        <Text style={chartStyles.emptyText}>{t('asset.noChartData')}</Text>
      </View>
    );
  }

  const isPositive = data[data.length - 1] >= data[0];
  const lineColor = isPositive ? colors.positive : colors.negative;
  const padX = 4;
  const padY = 8;
  const w = width - padX * 2;
  const h = height - padY * 2;

  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;

  const points = data.map((val, i) => ({
    x: padX + (i / (data.length - 1)) * w,
    y: padY + h - ((val - minVal) / range) * h,
  }));

  const pathD = points.reduce((path, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = points[i - 1];
    const cpx = (prev.x + point.x) / 2;
    return `${path} C ${cpx} ${prev.y}, ${cpx} ${point.y}, ${point.x} ${point.y}`;
  }, '');

  // Grid lines
  const gridCount = 4;
  const gridLines = Array.from({ length: gridCount }, (_, i) => padY + (i / (gridCount - 1)) * h);

  return (
    <Svg width={width} height={height}>
      {gridLines.map((y, i) => (
        <Line
          key={i}
          x1={padX}
          y1={y}
          x2={width - padX}
          y2={y}
          stroke={colors.border}
          strokeWidth={0.5}
          strokeDasharray="4,4"
        />
      ))}
      <Path d={pathD} stroke={lineColor} strokeWidth={2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

const createChartStyles = (colors: ThemeColors) => StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderRadius: radius.md },
  emptyText: { color: colors.text.muted, fontSize: 13 },
});

// ===========================================================================
// Indicator Card
// ===========================================================================

function IndicatorCard({ label, value, good, colors }: { label: string; value: string; good?: boolean | null; colors: ThemeColors }) {
  const indicatorStyles = useMemo(() => createIndicatorStyles(colors), [colors]);
  const valueColor = good === true ? colors.positive : good === false ? colors.negative : colors.text.primary;
  return (
    <View style={indicatorStyles.card}>
      <Text style={indicatorStyles.label}>{label}</Text>
      <Text style={[indicatorStyles.value, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const createIndicatorStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minWidth: '46%' as any,
  },
  label: { fontSize: 11, color: colors.text.secondary, marginBottom: 4 },
  value: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] as any },
});

// ===========================================================================
// Main Screen
// ===========================================================================

export default function AssetDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ ticker: string }>();
  // expo-router may return string | string[] — normalize to string
  const ticker = Array.isArray(params.ticker) ? params.ticker[0] : params.ticker;
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [data, setData] = useState<AssetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartRange, setChartRange] = useState<ChartRange>('1A');
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const loadData = useCallback(async () => {
    logger.log('ASSET DETAIL - ticker param:', ticker);
    if (!ticker) {
      logger.log('ASSET DETAIL - ticker is undefined/empty, aborting');
      setLoading(false);
      setError('Ticker not provided');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAssetDetail(ticker);
      logger.log('ASSET DETAIL - response:', JSON.stringify(response).substring(0, 300));
      const results = response?.results ?? [];
      if (results.length > 0) {
        setData(results[0]);
      } else {
        setError(t('asset.noData'));
      }
    } catch (err: any) {
      logger.log('ASSET DETAIL - error:', err?.message);
      setError(err?.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [ticker, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter chart data by range
  const chartData = useMemo(() => {
    if (!data?.historicalDataPrice) return [];
    const history = data.historicalDataPrice;
    const now = Date.now();
    const rangeMs: Record<ChartRange, number> = {
      '1M': 30 * 86400000,
      '3M': 90 * 86400000,
      '6M': 180 * 86400000,
      '1A': 365 * 86400000,
    };
    const cutoff = now - rangeMs[chartRange];
    return history
      .filter((h) => h.date * 1000 >= cutoff)
      .map((h) => h.close);
  }, [data?.historicalDataPrice, chartRange]);

  // Dividends (last 12)
  const dividends = useMemo(() => {
    if (!data?.dividendsData?.cashDividends) return [];
    return data.dividendsData.cashDividends.slice(0, 12);
  }, [data?.dividendsData]);

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>{'\u2190'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerBarTitle}>{ticker ?? ''}</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>{'\u2190'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerBarTitle}>{ticker ?? ''}</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{error ?? t('asset.noData')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isPositive = (data.regularMarketChangePercent ?? 0) >= 0;
  const profile = data.summaryProfile;
  const financial = data.financialData;
  const roe = financial?.returnOnEquity != null ? financial.returnOnEquity * 100 : null;
  const marginNet = financial?.profitMargins != null ? financial.profitMargins * 100 : null;
  const debtEbitda =
    financial?.totalDebt != null && financial?.ebitda != null && financial.ebitda !== 0
      ? financial.totalDebt / financial.ebitda
      : null;
  const dy = data.dividendYield != null ? data.dividendYield * 100 : null;

  const formatMarketCap = (val: number) => {
    if (val >= 1e12) return `R$ ${(val / 1e12).toFixed(1)} tri`;
    if (val >= 1e9) return `R$ ${(val / 1e9).toFixed(1)} bi`;
    if (val >= 1e6) return `R$ ${(val / 1e6).toFixed(1)} mi`;
    return formatBRLCompact(val);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerBarTitle}>{data.symbol}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Hero ---- */}
        <View style={styles.heroSection}>
          <View style={styles.heroRow}>
            {!logoError ? (
              <Image
                source={{ uri: `https://raw.githubusercontent.com/raulneto90/stocks_icons/refs/heads/main/assets/${(data.symbol ?? '').replace(/\d+$/, '')}.png` }}
                style={styles.logo}
                onError={() => setLogoError(true)}
              />
            ) : (
              <View style={styles.logoFallback}>
                <Text style={styles.logoFallbackText}>{'\u{1F4CA}'}</Text>
              </View>
            )}
            <View style={styles.heroInfo}>
              <Text style={styles.heroName} numberOfLines={2}>{data.longName}</Text>
              <Text style={styles.heroTicker}>
                {data.symbol} {profile?.sector ? `\u2022 ${profile.sector}` : ''}
              </Text>
            </View>
          </View>
          <Text style={styles.heroPrice}>
            {formatCurrency(data.regularMarketPrice, 'BRL')}
          </Text>
          <Text style={[styles.heroChange, { color: isPositive ? colors.positive : colors.negative }]}>
            {isPositive ? '+' : ''}{formatNumber(data.regularMarketChange, 2)}{' '}
            ({formatPct(data.regularMarketChangePercent)})
          </Text>
        </View>

        {/* ---- Quote Card ---- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('asset.quoteOfDay')}</Text>
          <View style={styles.quoteGrid}>
            <View style={styles.quoteItem}>
              <Text style={styles.quoteLabel}>{t('asset.open')}</Text>
              <Text style={styles.quoteValue}>{formatCurrency(data.regularMarketOpen, 'BRL')}</Text>
            </View>
            <View style={styles.quoteItem}>
              <Text style={styles.quoteLabel}>{t('asset.high')}</Text>
              <Text style={styles.quoteValue}>{formatCurrency(data.regularMarketDayHigh, 'BRL')}</Text>
            </View>
            <View style={styles.quoteItem}>
              <Text style={styles.quoteLabel}>{t('asset.low')}</Text>
              <Text style={styles.quoteValue}>{formatCurrency(data.regularMarketDayLow, 'BRL')}</Text>
            </View>
            <View style={styles.quoteItem}>
              <Text style={styles.quoteLabel}>{t('asset.prevClose')}</Text>
              <Text style={styles.quoteValue}>{formatCurrency(data.regularMarketPreviousClose, 'BRL')}</Text>
            </View>
            <View style={styles.quoteItem}>
              <Text style={styles.quoteLabel}>{t('asset.volume')}</Text>
              <Text style={styles.quoteValue}>
                {data.regularMarketVolume ? (data.regularMarketVolume / 1e6).toFixed(1) + 'M' : '-'}
              </Text>
            </View>
            <View style={styles.quoteItem}>
              <Text style={styles.quoteLabel}>Market Cap</Text>
              <Text style={styles.quoteValue}>
                {data.marketCap ? formatMarketCap(data.marketCap) : '-'}
              </Text>
            </View>
          </View>
        </View>

        {/* ---- Fundamentals Card ---- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('asset.fundamentals')}</Text>
          <View style={styles.indicatorGrid}>
            <IndicatorCard
              label="P/L"
              value={data.priceEarnings ? formatNumber(data.priceEarnings, 1) : '-'}
              good={data.priceEarnings ? (data.priceEarnings <= 15 ? true : data.priceEarnings > 30 ? false : null) : null}
              colors={colors}
            />
            <IndicatorCard
              label="P/VP"
              value={data.priceToBook ? formatNumber(data.priceToBook, 2) : '-'}
              good={data.priceToBook ? (data.priceToBook <= 1.5 ? true : data.priceToBook > 3 ? false : null) : null}
              colors={colors}
            />
            <IndicatorCard
              label="ROE"
              value={roe != null ? `${formatNumber(roe, 1)}%` : '-'}
              good={roe != null ? (roe >= 15 ? true : roe < 5 ? false : null) : null}
              colors={colors}
            />
            <IndicatorCard
              label="Dividend Yield"
              value={dy != null ? `${formatNumber(dy, 2)}%` : '-'}
              good={dy != null ? (dy >= 6 ? true : dy < 1 ? false : null) : null}
              colors={colors}
            />
            <IndicatorCard
              label="LPA"
              value={data.earningsPerShare ? formatNumber(data.earningsPerShare, 2) : '-'}
              good={data.earningsPerShare ? (data.earningsPerShare > 0 ? true : false) : null}
              colors={colors}
            />
            <IndicatorCard
              label="VPA"
              value={data.bookValuePerShare ? formatNumber(data.bookValuePerShare, 2) : '-'}
              good={null}
              colors={colors}
            />
            <IndicatorCard
              label={t('asset.netMargin')}
              value={marginNet != null ? `${formatNumber(marginNet, 1)}%` : '-'}
              good={marginNet != null ? (marginNet >= 15 ? true : marginNet < 0 ? false : null) : null}
              colors={colors}
            />
            <IndicatorCard
              label={t('asset.debtEbitda')}
              value={debtEbitda != null ? `${formatNumber(debtEbitda, 1)}x` : '-'}
              good={debtEbitda != null ? (debtEbitda <= 2 ? true : debtEbitda > 4 ? false : null) : null}
              colors={colors}
            />
          </View>
        </View>

        {/* ---- Chart Card ---- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('asset.priceHistory')}</Text>
          <View style={styles.chartRangeRow}>
            {(['1M', '3M', '6M', '1A'] as ChartRange[]).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.rangeChip, chartRange === r && styles.rangeChipActive]}
                onPress={() => setChartRange(r)}
              >
                <Text style={[styles.rangeChipText, chartRange === r && styles.rangeChipTextActive]}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.chartContainer}>
            <PriceChart data={chartData} width={Dimensions.get('window').width - (spacing.xl * 4 + 2)} height={160} colors={colors} />
          </View>
        </View>

        {/* ---- Dividends Card ---- */}
        {dividends.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('asset.dividends')}</Text>
            {dividends.map((d, i) => (
              <View key={i} style={styles.dividendRow}>
                <View style={styles.dividendLeft}>
                  <Text style={styles.dividendDate}>
                    {d.paymentDate ? formatDate(d.paymentDate) : '-'}
                  </Text>
                  <Text style={styles.dividendType}>{d.type ?? 'Dividendo'}</Text>
                </View>
                <Text style={styles.dividendValue}>
                  R$ {formatNumber(d.rate, 4)}{t('asset.perShare')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ---- About Card ---- */}
        {profile?.longBusinessSummary && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('asset.about')}</Text>
            <Text
              style={styles.aboutText}
              numberOfLines={showFullDescription ? undefined : 4}
            >
              {profile.longBusinessSummary}
            </Text>
            <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
              <Text style={styles.seeMoreText}>
                {showFullDescription ? t('asset.seeLess') : t('asset.seeMore')}
              </Text>
            </TouchableOpacity>

            <View style={styles.aboutDetails}>
              {profile.sector && (
                <View style={styles.aboutRow}>
                  <Text style={styles.aboutLabel}>{t('asset.sector')}</Text>
                  <Text style={styles.aboutValue}>{profile.sector}</Text>
                </View>
              )}
              {profile.industry && (
                <View style={styles.aboutRow}>
                  <Text style={styles.aboutLabel}>{t('asset.industry')}</Text>
                  <Text style={styles.aboutValue}>{profile.industry}</Text>
                </View>
              )}
              {profile.fullTimeEmployees && (
                <View style={styles.aboutRow}>
                  <Text style={styles.aboutLabel}>{t('asset.employees')}</Text>
                  <Text style={styles.aboutValue}>
                    {profile.fullTimeEmployees.toLocaleString('pt-BR')}
                  </Text>
                </View>
              )}
              {profile.website && (
                <View style={styles.aboutRow}>
                  <Text style={styles.aboutLabel}>Website</Text>
                  <Text style={[styles.aboutValue, { color: colors.accent }]}>
                    {profile.website}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ===========================================================================
// Styles
// ===========================================================================

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  // Header bar
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, color: colors.text.primary },
  headerBarTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },

  // Loading & Error
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { fontSize: 14, color: colors.text.secondary },
  errorText: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing.lg },
  retryBtn: { backgroundColor: colors.accent, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.md },
  retryText: { fontSize: 14, fontWeight: '600', color: colors.background },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.xl },

  // Hero
  heroSection: { marginBottom: spacing.xl },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  logo: { width: 48, height: 48, borderRadius: 24, marginRight: spacing.md, backgroundColor: colors.card },
  logoFallback: { width: 48, height: 48, borderRadius: 24, marginRight: spacing.md, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  logoFallbackText: { fontSize: 24 },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 16, fontWeight: '600', color: colors.text.primary, lineHeight: 22 },
  heroTicker: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  heroPrice: { fontSize: 32, fontWeight: '700', color: colors.text.primary, fontVariant: ['tabular-nums'] as any },
  heroChange: { fontSize: 16, fontWeight: '600', marginTop: 4, fontVariant: ['tabular-nums'] as any },

  // Card
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.lg },

  // Quote grid
  quoteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  quoteItem: { width: '46%' as any },
  quoteLabel: { fontSize: 11, color: colors.text.secondary, marginBottom: 2 },
  quoteValue: { fontSize: 14, fontWeight: '600', color: colors.text.primary, fontVariant: ['tabular-nums'] as any },

  // Indicator grid
  indicatorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  // Chart
  chartRangeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  rangeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeChipActive: { borderColor: colors.accent, backgroundColor: colors.accent + '20' },
  rangeChipText: { fontSize: 12, color: colors.text.secondary, fontWeight: '600' },
  rangeChipTextActive: { color: colors.accent },
  chartContainer: { alignItems: 'center' },

  // Dividends
  dividendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border + '40',
  },
  dividendLeft: {},
  dividendDate: { fontSize: 13, color: colors.text.primary },
  dividendType: { fontSize: 11, color: colors.text.muted, marginTop: 2 },
  dividendValue: { fontSize: 14, fontWeight: '600', color: colors.positive, fontVariant: ['tabular-nums'] as any },

  // About
  aboutText: { fontSize: 13, color: colors.text.secondary, lineHeight: 20 },
  seeMoreText: { fontSize: 13, color: colors.accent, fontWeight: '600', marginTop: spacing.sm, marginBottom: spacing.lg },
  aboutDetails: { gap: spacing.sm },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between' },
  aboutLabel: { fontSize: 13, color: colors.text.secondary },
  aboutValue: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
});
