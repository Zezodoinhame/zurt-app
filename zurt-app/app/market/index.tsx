import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { type ThemeColors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useMarketStore } from '../../src/stores/marketStore';
import { AppIcon } from '../../src/hooks/useIcon';
import { MiniLineChart } from '../../src/components/charts/MiniLineChart';
import { formatBRL, formatPct, formatVolume, formatMarketCap } from '../../src/utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Currency flag emoji map
// ---------------------------------------------------------------------------
const FLAG_MAP: Record<string, string> = {
  USD: '\uD83C\uDDFA\uD83C\uDDF8',
  EUR: '\uD83C\uDDEA\uD83C\uDDFA',
  GBP: '\uD83C\uDDEC\uD83C\uDDE7',
  BTC: '\u20BF',
  JPY: '\uD83C\uDDEF\uD83C\uDDF5',
  ARS: '\uD83C\uDDE6\uD83C\uDDF7',
  CNY: '\uD83C\uDDE8\uD83C\uDDF3',
};

// ===========================================================================
// MarketScreen
// ===========================================================================

export default function MarketScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useSettingsStore((s) => s.colors);
  const { t } = useSettingsStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    watchlist,
    cryptos,
    currencies,
    ibovespa,
    inflation,
    selic,
    loading,
    error,
    loadMarketOverview,
    loadInflation,
    loadSelic,
    removeFromWatchlist,
  } = useMarketStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMarketOverview();
    loadInflation();
    loadSelic();
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMarketOverview();
    await Promise.allSettled([loadInflation(), loadSelic()]);
    setRefreshing(false);
  }, [loadMarketOverview, loadInflation, loadSelic]);

  // Derived data for macro cards
  const usdBrl = currencies.find(
    (c) => c.fromCurrency === 'USD' && c.toCurrency === 'BRL',
  );
  const latestSelic = selic.length > 0 ? selic[0] : null;
  const latestIpca = inflation.length > 0 ? inflation[0] : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <AppIcon name="back" size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mercado</Text>
        <TouchableOpacity
          onPress={() => router.push('/market/search')}
          style={styles.searchBtn}
        >
          <AppIcon name="search" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <TouchableOpacity
        style={styles.searchBar}
        activeOpacity={0.7}
        onPress={() => router.push('/market/search')}
      >
        <AppIcon name="search" size={16} color={colors.text.muted} />
        <Text style={styles.searchPlaceholder}>Buscar ativos, criptos, moedas...</Text>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            progressBackgroundColor={colors.card}
            colors={[colors.accent]}
          />
        }
      >
        {loading && watchlist.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Carregando mercado...</Text>
          </View>
        ) : (
          <>
            {/* ============================================================= */}
            {/* SECTION 1 — Macro Indicators                                  */}
            {/* ============================================================= */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.macroRow}
            >
              {/* Ibovespa */}
              <View style={styles.macroCard}>
                <Text style={styles.macroLabel}>IBOV</Text>
                <Text style={styles.macroValue}>
                  {ibovespa
                    ? Number(ibovespa.regularMarketPrice || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
                    : '---'}
                </Text>
                <Text
                  style={[
                    styles.macroChange,
                    {
                      color:
                        (ibovespa?.regularMarketChangePercent ?? 0) >= 0
                          ? colors.positive
                          : colors.negative,
                    },
                  ]}
                >
                  {ibovespa ? formatPct(Number(ibovespa.regularMarketChangePercent || 0)) : '---'}
                </Text>
              </View>

              {/* USD/BRL */}
              <View style={styles.macroCard}>
                <Text style={styles.macroLabel}>USD/BRL</Text>
                <Text style={styles.macroValue}>
                  {usdBrl ? Number(usdBrl.bidPrice || 0).toFixed(2).replace('.', ',') : '---'}
                </Text>
                <Text
                  style={[
                    styles.macroChange,
                    {
                      color:
                        (usdBrl?.regularMarketChangePercent ?? 0) >= 0
                          ? colors.positive
                          : colors.negative,
                    },
                  ]}
                >
                  {usdBrl ? formatPct(Number(usdBrl.regularMarketChangePercent || 0)) : '---'}
                </Text>
              </View>

              {/* SELIC */}
              <View style={styles.macroCard}>
                <Text style={styles.macroLabel}>SELIC</Text>
                <Text style={styles.macroValue}>
                  {latestSelic ? `${parseFloat(latestSelic.value).toFixed(2).replace('.', ',')}%` : '---'}
                </Text>
                <Text style={[styles.macroChange, { color: colors.warning }]}>a.a.</Text>
              </View>

              {/* IPCA */}
              <View style={styles.macroCard}>
                <Text style={styles.macroLabel}>IPCA</Text>
                <Text style={styles.macroValue}>
                  {latestIpca ? `${parseFloat(latestIpca.value).toFixed(2).replace('.', ',')}%` : '---'}
                </Text>
                <Text style={[styles.macroChange, { color: colors.warning }]}>mensal</Text>
              </View>
            </ScrollView>

            {/* ============================================================= */}
            {/* SECTION 2 — Watchlist                                         */}
            {/* ============================================================= */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Watchlist</Text>
                <TouchableOpacity
                  onPress={() => router.push('/market/search')}
                  style={styles.addBtn}
                >
                  <AppIcon name="add" size={18} color={colors.accent} />
                </TouchableOpacity>
              </View>

              {watchlist.length === 0 && !loading ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    Adicione ativos para acompanhar
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyBtn}
                    onPress={() => router.push('/market/search')}
                  >
                    <Text style={styles.emptyBtnText}>Buscar ativos</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.watchlistCard}>
                  {watchlist.map((quote, idx) => (
                    <TouchableOpacity
                      key={quote.symbol}
                      style={[
                        styles.watchlistRow,
                        idx < watchlist.length - 1 && styles.watchlistRowBorder,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(`/market/${quote.symbol}`);
                      }}
                      onLongPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        removeFromWatchlist(quote.symbol);
                      }}
                    >
                      {/* Logo */}
                      <View style={styles.logoWrap}>
                        {quote.logourl ? (
                          <View style={styles.logoImg}>
                            <Text style={styles.logoFallback}>
                              {quote.symbol.substring(0, 2)}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.logoImg}>
                            <Text style={styles.logoFallback}>
                              {quote.symbol.substring(0, 2)}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Ticker + Name */}
                      <View style={styles.watchlistInfo}>
                        <Text style={styles.watchlistTicker}>{quote.symbol}</Text>
                        <Text style={styles.watchlistName} numberOfLines={1}>
                          {quote.shortName || quote.longName}
                        </Text>
                      </View>

                      {/* Sparkline */}
                      {quote.historicalDataPrice && quote.historicalDataPrice.length >= 2 && (
                        <MiniLineChart
                          data={quote.historicalDataPrice.map((h) => h.close)}
                          width={60}
                          height={28}
                        />
                      )}

                      {/* Price + Change */}
                      <View style={styles.watchlistPriceCol}>
                        <Text style={styles.watchlistPrice}>
                          {formatBRL(Number(quote.regularMarketPrice || 0))}
                        </Text>
                        <Text
                          style={[
                            styles.watchlistChange,
                            {
                              color:
                                quote.regularMarketChangePercent >= 0
                                  ? colors.positive
                                  : colors.negative,
                            },
                          ]}
                        >
                          {formatPct(Number(quote.regularMarketChangePercent || 0))}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* ============================================================= */}
            {/* SECTION 3 — Criptomoedas                                      */}
            {/* ============================================================= */}
            {cryptos.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Criptomoedas</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cryptoRow}
                >
                  {cryptos.slice(0, 10).map((coin) => (
                    <View key={coin.coin} style={styles.cryptoCard}>
                      <Text style={styles.cryptoSymbol}>{coin.coin}</Text>
                      <Text style={styles.cryptoName} numberOfLines={1}>
                        {coin.coinName}
                      </Text>
                      <Text style={styles.cryptoPrice}>
                        {formatBRL(Number(coin.regularMarketPrice || 0))}
                      </Text>
                      <Text
                        style={[
                          styles.cryptoChange,
                          {
                            color:
                              coin.regularMarketChangePercent >= 0
                                ? colors.positive
                                : colors.negative,
                          },
                        ]}
                      >
                        {formatPct(Number(coin.regularMarketChangePercent || 0))}
                      </Text>
                      <Text style={styles.cryptoCap}>
                        MC: {formatMarketCap(Number(coin.marketCap || 0))}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ============================================================= */}
            {/* SECTION 4 — Cambio                                            */}
            {/* ============================================================= */}
            {currencies.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Cambio</Text>
                </View>
                <View style={styles.currencyGrid}>
                  {currencies.map((cur) => {
                    const flag = FLAG_MAP[cur.fromCurrency] || '\uD83C\uDF10';
                    return (
                      <View key={`${cur.fromCurrency}-${cur.toCurrency}`} style={styles.currencyCard}>
                        <View style={styles.currencyTop}>
                          <Text style={styles.currencyFlag}>{flag}</Text>
                          <Text style={styles.currencyPair}>
                            {cur.fromCurrency}/{cur.toCurrency}
                          </Text>
                        </View>
                        <Text style={styles.currencyBid}>
                          R$ {Number(cur.bidPrice || 0).toFixed(2).replace('.', ',')}
                        </Text>
                        <Text
                          style={[
                            styles.currencyChange,
                            {
                              color:
                                cur.regularMarketChangePercent >= 0
                                  ? colors.positive
                                  : colors.negative,
                            },
                          ]}
                        >
                          {formatPct(Number(cur.regularMarketChangePercent || 0))}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={{ height: 40 }} />
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
    screen: {
      flex: 1,
      backgroundColor: colors.background,
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
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
    },
    searchBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginHorizontal: spacing.xl,
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    searchPlaceholder: {
      color: colors.text.muted,
      fontSize: 14,
    },
    scrollContent: {
      paddingBottom: 100,
    },
    loadingWrap: {
      alignItems: 'center',
      paddingTop: 80,
      gap: spacing.md,
    },
    loadingText: {
      color: colors.text.secondary,
      fontSize: 14,
    },

    // -- Macro Indicators -------------------------------------------------
    macroRow: {
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    macroCard: {
      width: 130,
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
    },
    macroLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.secondary,
      marginBottom: spacing.xs,
    },
    macroValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
      marginBottom: spacing.xs,
    },
    macroChange: {
      fontSize: 12,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },

    // -- Sections ---------------------------------------------------------
    section: {
      marginBottom: spacing.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text.primary,
    },
    addBtn: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // -- Watchlist --------------------------------------------------------
    watchlistCard: {
      marginHorizontal: spacing.xl,
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    watchlistRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    watchlistRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    logoWrap: {
      marginRight: spacing.md,
    },
    logoImg: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoFallback: {
      color: colors.text.secondary,
      fontSize: 11,
      fontWeight: '700',
    },
    watchlistInfo: {
      flex: 1,
      marginRight: spacing.sm,
    },
    watchlistTicker: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text.primary,
    },
    watchlistName: {
      fontSize: 11,
      color: colors.text.secondary,
      marginTop: 2,
    },
    watchlistPriceCol: {
      alignItems: 'flex-end',
      marginLeft: spacing.sm,
    },
    watchlistPrice: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    watchlistChange: {
      fontSize: 11,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      marginTop: 2,
    },

    // -- Empty state
    emptyCard: {
      marginHorizontal: spacing.xl,
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xxl,
      alignItems: 'center',
    },
    emptyText: {
      color: colors.text.secondary,
      fontSize: 14,
      marginBottom: spacing.lg,
    },
    emptyBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
    },
    emptyBtnText: {
      color: colors.background,
      fontSize: 14,
      fontWeight: '600',
    },

    // -- Cryptos ----------------------------------------------------------
    cryptoRow: {
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    cryptoCard: {
      width: 150,
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
    },
    cryptoSymbol: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text.primary,
      marginBottom: 2,
    },
    cryptoName: {
      fontSize: 11,
      color: colors.text.secondary,
      marginBottom: spacing.sm,
    },
    cryptoPrice: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
      marginBottom: spacing.xs,
    },
    cryptoChange: {
      fontSize: 12,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      marginBottom: spacing.xs,
    },
    cryptoCap: {
      fontSize: 10,
      color: colors.text.muted,
    },

    // -- Currency Grid ----------------------------------------------------
    currencyGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    currencyCard: {
      width: (SCREEN_WIDTH - spacing.xl * 2 - spacing.md) / 2,
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
    },
    currencyTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    currencyFlag: {
      fontSize: 20,
    },
    currencyPair: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    currencyBid: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
      marginBottom: spacing.xs,
    },
    currencyChange: {
      fontSize: 12,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
  });
