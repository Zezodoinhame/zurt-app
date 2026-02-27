import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
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
import type { BrapiQuote } from '../../src/types/brapi';

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

  const addToWatchlist = useMarketStore((s) => s.addToWatchlist);
  const removeFromWatchlist = useMarketStore((s) => s.removeFromWatchlist);
  const isInWatchlist = useMarketStore((s) => s.userWatchlist.includes(ticker || ''));

  const [quote, setQuote] = useState<BrapiQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<RangeKey>('1mo');
  const [chartLoading, setChartLoading] = useState(false);
  const [showFullSummary, setShowFullSummary] = useState(false);

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

  const handleAskAgent = useCallback(() => {
    router.push({
      pathname: '/(tabs)/agent',
      params: { message: `Analise o ativo ${ticker} para mim. Quais são os pontos positivos e negativos?` },
    });
  }, [ticker, router]);

  // Chart data
  const chartData = useMemo(() => {
    if (!quote?.historicalDataPrice) return [];
    return quote.historicalDataPrice.map((h) => ({
      label: new Date(h.date * 1000).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      }),
      value: Number(h.close || 0),
    }));
  }, [quote?.historicalDataPrice]);

  const isPositive = Number(quote?.regularMarketChangePercent || 0) >= 0;
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

  // Key statistics
  const stats = quote?.defaultKeyStatistics;

  if (loading) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Carregando {ticker}...</Text>
      </View>
    );
  }

  if (!quote) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <AppIcon name="warning" size={40} color={colors.text.muted} />
        <Text style={styles.errorText}>Ativo não encontrado</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.errorBtn}>
          <Text style={styles.errorLink}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Drag indicator */}
      <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
      </View>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <AppIcon name="back" size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTicker}>{quote.symbol}</Text>
          <Text style={styles.headerName} numberOfLines={1}>{quote.shortName || quote.longName}</Text>
        </View>
        <TouchableOpacity onPress={handleWatchlistToggle} style={styles.backBtn}>
          <AppIcon
            name={isInWatchlist ? 'star-filled' : 'star-outline'}
            size={22}
            color={isInWatchlist ? '#F59E0B' : colors.text.secondary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ================================================================ */}
        {/* Price Hero                                                       */}
        {/* ================================================================ */}
        <View style={styles.priceHero}>
          <Text style={styles.priceValue}>{formatBRL(Number(quote.regularMarketPrice || 0))}</Text>
          <View style={styles.priceChangeRow}>
            <Text style={[styles.priceChange, { color: changeColor }]}>
              {isPositive ? '+' : ''}
              {formatBRL(Number(quote.regularMarketChange || 0))}
            </Text>
            <View style={[styles.priceBadge, { backgroundColor: changeColor + '20' }]}>
              <Text style={[styles.priceBadgeText, { color: changeColor }]}>
                {isPositive ? '\u25B2' : '\u25BC'} {formatPct(Number(quote.regularMarketChangePercent || 0))}
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
              <AppIcon name="trending" size={32} color={colors.text.muted} />
              <Text style={styles.noDataText}>Sem dados para o período</Text>
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
        {/* Trading Data (2x3 grid)                                          */}
        {/* ================================================================ */}
        <View style={styles.dataCard}>
          <Text style={styles.dataCardTitle}>Dados do Pregão</Text>
          <View style={styles.gridRow}>
            <GridItem label="Abertura" value={formatBRL(Number(quote.regularMarketOpen || 0))} colors={colors} />
            <GridItem label="Máxima" value={formatBRL(Number(quote.regularMarketDayHigh || 0))} colors={colors} />
          </View>
          <View style={styles.gridRow}>
            <GridItem label="Mínima" value={formatBRL(Number(quote.regularMarketDayLow || 0))} colors={colors} />
            <GridItem label="Volume" value={formatVolume(Number(quote.regularMarketVolume || 0))} colors={colors} />
          </View>
          <View style={styles.gridRow}>
            <GridItem label="Fech. Anterior" value={formatBRL(Number(quote.regularMarketPreviousClose || 0))} colors={colors} />
            <GridItem
              label="Market Cap"
              value={Number(quote.marketCap || 0) > 0 ? formatMarketCap(Number(quote.marketCap || 0)) : '---'}
              colors={colors}
            />
          </View>
          <View style={styles.gridRow}>
            <GridItem label="52 sem Máx" value={formatBRL(Number(quote.fiftyTwoWeekHigh || 0))} colors={colors} />
            <GridItem label="52 sem Mín" value={formatBRL(Number(quote.fiftyTwoWeekLow || 0))} colors={colors} />
          </View>
        </View>

        {/* ================================================================ */}
        {/* Fundamentals                                                     */}
        {/* ================================================================ */}
        {(quote.priceEarnings || quote.financialData || stats) && (
          <View style={styles.dataCard}>
            <Text style={styles.dataCardTitle}>Fundamentalista</Text>

            {/* P/L */}
            {quote.priceEarnings != null && (
              <DataRow label="P/L" value={formatNumber(Number(quote.priceEarnings || 0), 2)} colors={colors} />
            )}
            {!quote.priceEarnings && stats?.earningsTrailingPE != null && (
              <DataRow label="P/L" value={formatNumber(Number(stats.earningsTrailingPE || 0), 2)} colors={colors} />
            )}

            {/* P/VP */}
            {stats?.priceToBook != null && (
              <DataRow label="P/VP" value={formatNumber(Number(stats.priceToBook || 0), 2)} colors={colors} />
            )}

            {/* ROE */}
            {quote.financialData?.returnOnEquity != null && (
              <DataRow label="ROE" value={formatPct(Number(quote.financialData.returnOnEquity || 0) * 100, false)} colors={colors} />
            )}

            {/* Margem Líquida */}
            {quote.financialData?.profitMargins != null && (
              <DataRow label="Margem Líquida" value={formatPct(Number(quote.financialData.profitMargins || 0) * 100, false)} colors={colors} />
            )}

            {/* Dívida/PL */}
            {quote.financialData?.debtToEquity != null && (
              <DataRow label="Dívida/PL" value={formatNumber(Number(quote.financialData.debtToEquity || 0), 2)} colors={colors} />
            )}

            {/* LPA */}
            {(quote.earningsPerShare != null || stats?.trailingEps != null) && (
              <DataRow
                label="LPA"
                value={formatBRL(Number(quote.earningsPerShare || stats?.trailingEps || 0))}
                colors={colors}
              />
            )}

            {/* DY */}
            {(dividendYield != null || stats?.lastDividendValue != null) && (
              <DataRow
                label="DY (12m)"
                value={dividendYield != null ? formatPct(dividendYield, false) : `R$ ${Number(stats?.lastDividendValue || 0).toFixed(2).replace('.', ',')}`}
                colors={colors}
              />
            )}

            {/* EV/EBITDA */}
            {stats?.enterpriseToEbitda != null && (
              <DataRow label="EV/EBITDA" value={formatNumber(Number(stats.enterpriseToEbitda || 0), 2)} colors={colors} />
            )}

            {/* Margem EBITDA */}
            {quote.financialData?.ebitdaMargins != null && (
              <DataRow label="Margem EBITDA" value={formatPct(Number(quote.financialData.ebitdaMargins || 0) * 100, false)} colors={colors} />
            )}

            {/* Beta */}
            {stats?.beta != null && (
              <DataRow label="Beta" value={formatNumber(Number(stats.beta || 0), 2)} colors={colors} />
            )}

            {/* Receita */}
            {quote.financialData?.totalRevenue != null && Number(quote.financialData.totalRevenue) > 0 && (
              <DataRow label="Receita" value={formatMarketCap(Number(quote.financialData.totalRevenue || 0))} colors={colors} />
            )}

            {/* EBITDA */}
            {quote.financialData?.ebitda != null && Number(quote.financialData.ebitda) > 0 && (
              <DataRow label="EBITDA" value={formatMarketCap(Number(quote.financialData.ebitda || 0))} colors={colors} />
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
            {quote.summaryProfile.sector && (
              <DataRow label="Setor" value={quote.summaryProfile.sector} colors={colors} />
            )}
            {quote.summaryProfile.industry && (
              <DataRow label="Indústria" value={quote.summaryProfile.industry} colors={colors} />
            )}
            {quote.summaryProfile.city && (
              <DataRow
                label="Sede"
                value={`${quote.summaryProfile.city}${quote.summaryProfile.state ? `, ${quote.summaryProfile.state}` : ''}`}
                colors={colors}
              />
            )}
            {Number(quote.summaryProfile.fullTimeEmployees || 0) > 0 && (
              <DataRow
                label="Funcionários"
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
              <>
                <Text
                  style={styles.summary}
                  numberOfLines={showFullSummary ? undefined : 4}
                >
                  {quote.summaryProfile.longBusinessSummary}
                </Text>
                <TouchableOpacity onPress={() => setShowFullSummary(!showFullSummary)}>
                  <Text style={styles.readMore}>
                    {showFullSummary ? 'Ver menos' : 'Ler mais'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* ================================================================ */}
        {/* Action Buttons                                                   */}
        {/* ================================================================ */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: isInWatchlist ? '#F59E0B20' : colors.accent }]}
            onPress={handleWatchlistToggle}
            activeOpacity={0.8}
          >
            <AppIcon
              name={isInWatchlist ? 'star-filled' : 'star-outline'}
              size={18}
              color={isInWatchlist ? '#F59E0B' : colors.background}
            />
            <Text style={[styles.actionBtnText, { color: isInWatchlist ? '#F59E0B' : colors.background }]}>
              {isInWatchlist ? 'Remover da Watchlist' : 'Adicionar à Watchlist'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.info + '20' }]}
            onPress={handleAskAgent}
            activeOpacity={0.8}
          >
            <AppIcon name="agent" size={18} color={colors.info} />
            <Text style={[styles.actionBtnText, { color: colors.info }]}>
              Perguntar ao ZURT Agent
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// GridItem helper (2-column grid)
// ---------------------------------------------------------------------------

function GridItem({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ThemeColors;
}) {
  return (
    <View style={gridStyles(colors).item}>
      <Text style={gridStyles(colors).label}>{label}</Text>
      <Text style={gridStyles(colors).value}>{value}</Text>
    </View>
  );
}

const gridStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    item: {
      flex: 1,
      paddingVertical: spacing.sm,
    },
    label: {
      fontSize: 11,
      color: colors.text.muted,
      marginBottom: 2,
    },
    value: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
  });

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
      gap: spacing.md,
    },
    loadingText: {
      color: colors.text.secondary,
      fontSize: 14,
      marginTop: spacing.md,
    },
    errorText: {
      color: colors.text.secondary,
      fontSize: 16,
      marginTop: spacing.md,
    },
    errorBtn: {
      marginTop: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      backgroundColor: colors.accent + '20',
      borderRadius: radius.md,
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
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    headerTicker: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
    },
    headerName: {
      fontSize: 11,
      color: colors.text.secondary,
      marginTop: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
    },

    // -- Price Hero -------------------------------------------------------
    priceHero: {
      marginBottom: spacing.xl,
    },
    priceValue: {
      fontSize: 34,
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
      fontSize: 15,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    priceBadge: {
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
    },
    priceBadgeText: {
      fontSize: 13,
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
      gap: spacing.sm,
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
    gridRow: {
      flexDirection: 'row',
      gap: spacing.md,
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
    readMore: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
      marginTop: spacing.sm,
    },

    // -- Action Buttons ---------------------------------------------------
    actionsRow: {
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.lg,
      borderRadius: radius.lg,
    },
    actionBtnText: {
      fontSize: 15,
      fontWeight: '700',
    },
  });
