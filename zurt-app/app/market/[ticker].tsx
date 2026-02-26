import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { type ThemeColors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useMarketStore } from '../../src/stores/marketStore';
import { brapiService } from '../../src/services/brapiService';
import { AppIcon } from '../../src/hooks/useIcon';
import { LineChart } from '../../src/components/charts/LineChart';
import {
  formatBRL,
  formatPct,
  formatNumber,
  formatVolume,
  formatMarketCap,
  formatDate,
} from '../../src/utils/formatters';
import type { BrapiQuote, HistoricalPrice } from '../../src/types/brapi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Chart range config
// ---------------------------------------------------------------------------
type RangeKey = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y' | 'max';

const RANGES: { key: RangeKey; label: string; interval: string }[] = [
  { key: '1d', label: '1D', interval: '15m' },
  { key: '5d', label: '5D', interval: '1h' },
  { key: '1mo', label: '1M', interval: '1d' },
  { key: '3mo', label: '3M', interval: '1d' },
  { key: '6mo', label: '6M', interval: '1d' },
  { key: '1y', label: '1A', interval: '1wk' },
  { key: '5y', label: '5A', interval: '1mo' },
  { key: 'max', label: 'MAX', interval: '1mo' },
];

// ===========================================================================
// TickerDetailScreen
// ===========================================================================

export default function TickerDetailScreen() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { watchlist, addToWatchlist, removeFromWatchlist } = useMarketStore();

  const [quote, setQuote] = useState<BrapiQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<RangeKey>('1mo');
  const [chartLoading, setChartLoading] = useState(false);

  const isInWatchlist = watchlist.some((q) => q.symbol === ticker);

  // Load quote data
  const loadQuote = useCallback(
    async (range: RangeKey) => {
      if (!ticker) return;
      try {
        const rangeConfig = RANGES.find((r) => r.key === range);
        const results = await brapiService.getQuote(ticker, {
          range,
          interval: rangeConfig?.interval as any,
          fundamental: true,
          dividends: true,
          modules: ['summaryProfile', 'financialData', 'defaultKeyStatistics'],
        });
        if (results?.[0]) setQuote(results[0]);
      } catch (err: any) {
        console.log('[TickerDetail] Error:', err.message);
      }
    },
    [ticker],
  );

  useEffect(() => {
    setLoading(true);
    loadQuote(selectedRange).finally(() => setLoading(false));
  }, [ticker]);

  const handleRangeChange = useCallback(
    async (range: RangeKey) => {
      setSelectedRange(range);
      setChartLoading(true);
      await loadQuote(range);
      setChartLoading(false);
    },
    [loadQuote],
  );

  const handleWatchlistToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isInWatchlist) {
      removeFromWatchlist(ticker!);
    } else {
      addToWatchlist(ticker!);
    }
  }, [isInWatchlist, ticker, addToWatchlist, removeFromWatchlist]);

  // Chart data
  const chartData = useMemo(() => {
    if (!quote?.historicalDataPrice) return [];
    return quote.historicalDataPrice.map((h) => ({
      label: new Date(h.date * 1000).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      }),
      value: h.close,
    }));
  }, [quote?.historicalDataPrice]);

  const isPositive = (quote?.regularMarketChangePercent ?? 0) >= 0;
  const changeColor = isPositive ? colors.positive : colors.negative;

  // Dividend yield calc
  const dividendYield = useMemo(() => {
    if (!quote?.dividendsData?.cashDividends || !quote.regularMarketPrice) return null;
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const last12m = quote.dividendsData.cashDividends.filter(
      (d) => new Date(d.paymentDate) >= oneYearAgo,
    );
    const totalDiv = last12m.reduce((sum, d) => sum + Number(d.rate || 0), 0);
    return totalDiv > 0 ? (totalDiv / Number(quote.regularMarketPrice || 1)) * 100 : null;
  }, [quote?.dividendsData, quote?.regularMarketPrice]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!quote) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Ativo nao encontrado</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.errorLink}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <AppIcon name="back" size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTicker}>{quote.symbol}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ================================================================ */}
        {/* Price Hero                                                       */}
        {/* ================================================================ */}
        <View style={styles.priceHero}>
          <Text style={styles.priceName}>{quote.shortName || quote.longName}</Text>
          <Text style={styles.priceValue}>{formatBRL(Number(quote.regularMarketPrice || 0))}</Text>
          <View style={styles.priceChangeRow}>
            <Text style={[styles.priceChange, { color: changeColor }]}>
              {isPositive ? '+' : ''}
              {formatBRL(Number(quote.regularMarketChange || 0))}
            </Text>
            <View style={[styles.priceBadge, { backgroundColor: changeColor + '20' }]}>
              <Text style={[styles.priceBadgeText, { color: changeColor }]}>
                {formatPct(Number(quote.regularMarketChangePercent || 0))}
              </Text>
            </View>
          </View>
        </View>

        {/* ================================================================ */}
        {/* Chart                                                            */}
        {/* ================================================================ */}
        <View style={styles.chartSection}>
          {chartLoading ? (
            <View style={styles.chartLoading}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : chartData.length >= 2 ? (
            <LineChart
              data={chartData}
              height={200}
              color={changeColor}
            />
          ) : (
            <View style={styles.chartLoading}>
              <Text style={styles.noDataText}>Sem dados para o periodo</Text>
            </View>
          )}

          {/* Range selector */}
          <View style={styles.rangeRow}>
            {RANGES.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={[
                  styles.rangeBtn,
                  selectedRange === r.key && styles.rangeBtnActive,
                ]}
                onPress={() => handleRangeChange(r.key)}
              >
                <Text
                  style={[
                    styles.rangeBtnText,
                    selectedRange === r.key && styles.rangeBtnTextActive,
                  ]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ================================================================ */}
        {/* Trading Data                                                     */}
        {/* ================================================================ */}
        <View style={styles.dataCard}>
          <Text style={styles.dataCardTitle}>Dados do Pregao</Text>
          <DataRow label="Abertura" value={formatBRL(Number(quote.regularMarketOpen || 0))} colors={colors} />
          <DataRow label="Maxima" value={formatBRL(Number(quote.regularMarketDayHigh || 0))} colors={colors} />
          <DataRow label="Minima" value={formatBRL(Number(quote.regularMarketDayLow || 0))} colors={colors} />
          <DataRow label="Volume" value={formatVolume(Number(quote.regularMarketVolume || 0))} colors={colors} />
          <DataRow label="Anterior" value={formatBRL(Number(quote.regularMarketPreviousClose || 0))} colors={colors} />
          <DataRow label="52 sem max" value={formatBRL(Number(quote.fiftyTwoWeekHigh || 0))} colors={colors} />
          <DataRow label="52 sem min" value={formatBRL(Number(quote.fiftyTwoWeekLow || 0))} colors={colors} />
          {quote.marketCap > 0 && (
            <DataRow label="Market Cap" value={formatMarketCap(Number(quote.marketCap || 0))} colors={colors} />
          )}
        </View>

        {/* ================================================================ */}
        {/* Fundamentals                                                     */}
        {/* ================================================================ */}
        {(quote.priceEarnings || quote.financialData) && (
          <View style={styles.dataCard}>
            <Text style={styles.dataCardTitle}>Fundamentalista</Text>
            {quote.priceEarnings != null && (
              <DataRow label="P/L" value={formatNumber(quote.priceEarnings, 2)} colors={colors} />
            )}
            {quote.earningsPerShare != null && (
              <DataRow label="LPA" value={formatBRL(Number(quote.earningsPerShare || 0))} colors={colors} />
            )}
            {quote.financialData && (
              <>
                {quote.financialData.returnOnEquity != null && (
                  <DataRow label="ROE" value={formatPct(Number(quote.financialData.returnOnEquity || 0) * 100, false)} colors={colors} />
                )}
                {quote.financialData.returnOnAssets != null && (
                  <DataRow label="ROA" value={formatPct(Number(quote.financialData.returnOnAssets || 0) * 100, false)} colors={colors} />
                )}
                {quote.financialData.profitMargins != null && (
                  <DataRow label="Margem Liquida" value={formatPct(Number(quote.financialData.profitMargins || 0) * 100, false)} colors={colors} />
                )}
                {quote.financialData.ebitdaMargins != null && (
                  <DataRow label="Margem EBITDA" value={formatPct(Number(quote.financialData.ebitdaMargins || 0) * 100, false)} colors={colors} />
                )}
                {quote.financialData.debtToEquity != null && (
                  <DataRow label="Div/PL" value={formatNumber(quote.financialData.debtToEquity, 2)} colors={colors} />
                )}
                {quote.financialData.totalRevenue != null && quote.financialData.totalRevenue > 0 && (
                  <DataRow label="Receita" value={formatMarketCap(Number(quote.financialData.totalRevenue || 0))} colors={colors} />
                )}
                {quote.financialData.ebitda != null && quote.financialData.ebitda > 0 && (
                  <DataRow label="EBITDA" value={formatMarketCap(Number(quote.financialData.ebitda || 0))} colors={colors} />
                )}
                {quote.financialData.freeCashflow != null && (
                  <DataRow label="Free Cash Flow" value={formatMarketCap(Number(quote.financialData.freeCashflow || 0))} colors={colors} />
                )}
              </>
            )}
          </View>
        )}

        {/* ================================================================ */}
        {/* Dividends                                                        */}
        {/* ================================================================ */}
        {quote.dividendsData?.cashDividends && quote.dividendsData.cashDividends.length > 0 && (
          <View style={styles.dataCard}>
            <View style={styles.divHeader}>
              <Text style={styles.dataCardTitle}>Dividendos</Text>
              {dividendYield != null && (
                <View style={[styles.yieldBadge, { backgroundColor: colors.positive + '20' }]}>
                  <Text style={[styles.yieldText, { color: colors.positive }]}>
                    DY {dividendYield.toFixed(2).replace('.', ',')}%
                  </Text>
                </View>
              )}
            </View>
            {quote.dividendsData.cashDividends.slice(0, 5).map((div, idx) => (
              <View
                key={idx}
                style={[
                  styles.divRow,
                  idx < Math.min(quote.dividendsData!.cashDividends.length, 5) - 1 &&
                    styles.divRowBorder,
                ]}
              >
                <View>
                  <Text style={styles.divLabel}>{div.label || 'DIVIDENDO'}</Text>
                  <Text style={styles.divDate}>
                    {formatDate(div.paymentDate)}
                  </Text>
                </View>
                <Text style={styles.divAmount}>
                  R$ {Number(div.rate || 0).toFixed(4).replace('.', ',')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ================================================================ */}
        {/* About the Company                                                */}
        {/* ================================================================ */}
        {quote.summaryProfile && (
          <View style={styles.dataCard}>
            <Text style={styles.dataCardTitle}>Sobre a Empresa</Text>
            <DataRow label="Setor" value={quote.summaryProfile.sector} colors={colors} />
            <DataRow label="Industria" value={quote.summaryProfile.industry} colors={colors} />
            {quote.summaryProfile.city && (
              <DataRow
                label="Sede"
                value={`${quote.summaryProfile.city}, ${quote.summaryProfile.state}`}
                colors={colors}
              />
            )}
            {quote.summaryProfile.fullTimeEmployees > 0 && (
              <DataRow
                label="Funcionarios"
                value={Number(quote.summaryProfile.fullTimeEmployees || 0).toLocaleString('pt-BR')}
                colors={colors}
              />
            )}
            {quote.summaryProfile.website && (
              <TouchableOpacity
                onPress={() => Linking.openURL(quote.summaryProfile!.website)}
                style={styles.websiteRow}
              >
                <Text style={styles.websiteLabel}>Website</Text>
                <Text style={styles.websiteLink} numberOfLines={1}>
                  {quote.summaryProfile.website.replace(/^https?:\/\//, '')}
                </Text>
              </TouchableOpacity>
            )}
            {quote.summaryProfile.longBusinessSummary && (
              <Text style={styles.summary} numberOfLines={6}>
                {quote.summaryProfile.longBusinessSummary}
              </Text>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating watchlist button */}
      <View style={[styles.fabWrap, { paddingBottom: insets.bottom + spacing.lg }]}>
        <TouchableOpacity
          style={[
            styles.fab,
            {
              backgroundColor: isInWatchlist ? colors.negative + '20' : colors.accent,
            },
          ]}
          onPress={handleWatchlistToggle}
          activeOpacity={0.8}
        >
          <AppIcon
            name={isInWatchlist ? 'close' : 'add'}
            size={18}
            color={isInWatchlist ? colors.negative : colors.background}
          />
          <Text
            style={[
              styles.fabText,
              { color: isInWatchlist ? colors.negative : colors.background },
            ]}
          >
            {isInWatchlist ? 'Remover da Watchlist' : 'Adicionar a Watchlist'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// DataRow helper
// ---------------------------------------------------------------------------

function DataRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ThemeColors;
}) {
  return (
    <View style={dataRowStyles(colors).row}>
      <Text style={dataRowStyles(colors).label}>{label}</Text>
      <Text style={dataRowStyles(colors).value}>{value}</Text>
    </View>
  );
}

const dataRowStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm + 2,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border + '60',
    },
    label: {
      fontSize: 13,
      color: colors.text.secondary,
    },
    value: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
  });

// ===========================================================================
// Styles
// ===========================================================================

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      color: colors.text.secondary,
      fontSize: 16,
      marginBottom: spacing.md,
    },
    errorLink: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: '600',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    backBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTicker: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
    },

    // -- Price Hero -------------------------------------------------------
    priceHero: {
      marginBottom: spacing.xl,
    },
    priceName: {
      fontSize: 14,
      color: colors.text.secondary,
      marginBottom: spacing.xs,
    },
    priceValue: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
      marginBottom: spacing.sm,
    },
    priceChangeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    priceChange: {
      fontSize: 14,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    priceBadge: {
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
    },
    priceBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },

    // -- Chart ------------------------------------------------------------
    chartSection: {
      marginBottom: spacing.xl,
    },
    chartLoading: {
      height: 200,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noDataText: {
      color: colors.text.muted,
      fontSize: 13,
    },
    rangeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.md,
      gap: spacing.xs,
    },
    rangeBtn: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      alignItems: 'center',
    },
    rangeBtnActive: {
      backgroundColor: colors.accent + '20',
    },
    rangeBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.muted,
    },
    rangeBtnTextActive: {
      color: colors.accent,
      fontWeight: '700',
    },

    // -- Data Cards -------------------------------------------------------
    dataCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    dataCardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.md,
    },

    // -- Dividends --------------------------------------------------------
    divHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    yieldBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
    },
    yieldText: {
      fontSize: 12,
      fontWeight: '700',
    },
    divRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm + 2,
    },
    divRowBorder: {
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border + '60',
    },
    divLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.primary,
    },
    divDate: {
      fontSize: 11,
      color: colors.text.muted,
      marginTop: 2,
    },
    divAmount: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.positive,
      fontVariant: ['tabular-nums'],
    },

    // -- Company profile --------------------------------------------------
    websiteRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm + 2,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border + '60',
    },
    websiteLabel: {
      fontSize: 13,
      color: colors.text.secondary,
    },
    websiteLink: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
      maxWidth: 200,
    },
    summary: {
      fontSize: 13,
      color: colors.text.secondary,
      lineHeight: 20,
      marginTop: spacing.md,
    },

    // -- FAB --------------------------------------------------------------
    fabWrap: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: spacing.xl,
    },
    fab: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.lg,
      borderRadius: radius.lg,
    },
    fabText: {
      fontSize: 15,
      fontWeight: '700',
    },
  });
