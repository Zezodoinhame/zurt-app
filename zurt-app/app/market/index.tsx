import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
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
import { formatBRL, formatPct, formatVolume, formatMarketCap } from '../../src/utils/formatters';

// ---------------------------------------------------------------------------
// Filter chips
// ---------------------------------------------------------------------------
const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'stock', label: 'Ações' },
  { key: 'fund', label: 'FIIs' },
  { key: 'bdr', label: 'BDRs' },
];

// ---------------------------------------------------------------------------
// Type badge colors
// ---------------------------------------------------------------------------
const TYPE_COLORS: Record<string, string> = {
  stock: '#3A86FF',
  fund: '#00D4AA',
  bdr: '#FFD93D',
};

// ===========================================================================
// MarketScreen
// ===========================================================================

export default function MarketScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    allStocks,
    stocksPage,
    stocksTotal,
    stocksLoading,
    activeFilter,
    searchQuery,
    ibovespa,
    currencies,
    selic,
    inflation,
    loading,
    loadAllStocks,
    loadMarketOverview,
  } = useMarketStore();

  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived macro data
  const usdBrl = currencies.find(
    (c) => c.fromCurrency === 'USD' && c.toCurrency === 'BRL',
  );
  const latestSelic = selic.length > 0 ? selic[0] : null;
  const latestIpca = inflation.length > 0 ? inflation[0] : null;

  // Initial load
  useEffect(() => {
    loadAllStocks(1, '', 'all');
    loadMarketOverview();
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadAllStocks(1, search, activeFilter);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const handleFilterChange = useCallback(
    (filter: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      loadAllStocks(1, search, filter);
    },
    [search, loadAllStocks],
  );

  const handleLoadMore = useCallback(() => {
    if (stocksLoading) return;
    if (allStocks.length >= stocksTotal) return;
    loadAllStocks(stocksPage + 1, searchQuery, activeFilter);
  }, [stocksLoading, allStocks.length, stocksTotal, stocksPage, searchQuery, activeFilter, loadAllStocks]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      loadAllStocks(1, search, activeFilter),
      loadMarketOverview(),
    ]);
    setRefreshing(false);
  }, [search, activeFilter, loadAllStocks, loadMarketOverview]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderStockItem = useCallback(
    ({ item }: { item: any }) => {
      const change = Number(item.change || 0);
      const changeColor = change >= 0 ? colors.positive : colors.negative;
      const dotColor = change > 0 ? colors.positive : change < 0 ? colors.negative : colors.text.muted;
      const typeColor = TYPE_COLORS[item.type] || colors.text.muted;

      return (
        <TouchableOpacity
          style={styles.stockRow}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/market/${item.stock}`);
          }}
        >
          {/* Left: dot + ticker + type + name */}
          <View style={styles.stockLeft}>
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <View style={styles.stockInfo}>
              <View style={styles.stockTickerRow}>
                <Text style={styles.stockTicker}>{item.stock}</Text>
                {item.type && (
                  <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
                    <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                      {item.type === 'stock' ? 'Ação' : item.type === 'fund' ? 'FII' : 'BDR'}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.stockName} numberOfLines={1}>
                {item.name || item.stock}
              </Text>
            </View>
          </View>

          {/* Right: price + change + volume + mcap */}
          <View style={styles.stockRight}>
            <Text style={styles.stockPrice}>
              {formatBRL(Number(item.close || 0))}
            </Text>
            <Text style={[styles.stockChange, { color: changeColor }]}>
              {formatPct(change)}
            </Text>
            <Text style={styles.stockMeta}>
              Vol: {formatVolume(Number(item.volume || 0))}
              {'  '}MC: {formatMarketCap(Number(item.market_cap_basic || 0))}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [colors, styles, router],
  );

  const renderHeader = useCallback(
    () => (
      <View>
        {/* Macro indicators */}
        <View style={styles.macroRow}>
          {/* IBOV */}
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
                    Number(ibovespa?.regularMarketChangePercent || 0) >= 0
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
            <Text style={styles.macroLabel}>USD</Text>
            <Text style={styles.macroValue}>
              {usdBrl ? `R$ ${Number(usdBrl.bidPrice || 0).toFixed(2).replace('.', ',')}` : '---'}
            </Text>
            <Text
              style={[
                styles.macroChange,
                {
                  color:
                    Number(usdBrl?.regularMarketChangePercent || 0) >= 0
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
              {latestSelic ? `${Number(latestSelic.value).toFixed(2).replace('.', ',')}%` : '---'}
            </Text>
            <Text style={[styles.macroChange, { color: colors.warning }]}>a.a.</Text>
          </View>

          {/* IPCA */}
          <View style={styles.macroCard}>
            <Text style={styles.macroLabel}>IPCA</Text>
            <Text style={styles.macroValue}>
              {latestIpca ? `${Number(latestIpca.value).toFixed(2).replace('.', ',')}%` : '---'}
            </Text>
            <Text style={[styles.macroChange, { color: colors.warning }]}>mensal</Text>
          </View>
        </View>

        {/* Results count */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {stocksTotal > 0 ? `${stocksTotal} ativos` : 'Carregando...'}
          </Text>
        </View>
      </View>
    ),
    [ibovespa, usdBrl, latestSelic, latestIpca, stocksTotal, colors, styles],
  );

  const renderFooter = useCallback(() => {
    if (!stocksLoading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.footerText}>Carregando mais...</Text>
      </View>
    );
  }, [stocksLoading, colors, styles]);

  const renderEmpty = useCallback(() => {
    if (stocksLoading || loading) return null;
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>Nenhum ativo encontrado</Text>
      </View>
    );
  }, [stocksLoading, loading, styles]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <AppIcon name="back" size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mercado</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <AppIcon name="search" size={16} color={colors.text.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar ativos..."
          placeholderTextColor={colors.text.muted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <AppIcon name="close" size={16} color={colors.text.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                active && { backgroundColor: colors.accent },
              ]}
              onPress={() => handleFilterChange(f.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && { color: colors.background },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Stock list */}
      <FlatList
        data={allStocks}
        keyExtractor={(item) => item.stock}
        renderItem={renderStockItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            progressBackgroundColor={colors.card}
            colors={[colors.accent]}
          />
        }
      />
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

    // -- Search bar -----------------------------------------------------------
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginHorizontal: spacing.xl,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
      height: 44,
    },
    searchInput: {
      flex: 1,
      color: colors.text.primary,
      fontSize: 14,
      paddingVertical: 0,
    },

    // -- Filter chips ---------------------------------------------------------
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    filterChip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.secondary,
    },

    // -- List -----------------------------------------------------------------
    listContent: {
      paddingBottom: 100,
    },

    // -- Macro indicators -----------------------------------------------------
    macroRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    macroCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      alignItems: 'center',
    },
    macroLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.text.muted,
      marginBottom: 2,
    },
    macroValue: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
      marginBottom: 2,
    },
    macroChange: {
      fontSize: 10,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },

    // -- Results header -------------------------------------------------------
    resultsHeader: {
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.sm,
    },
    resultsCount: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.secondary,
    },

    // -- Stock row ------------------------------------------------------------
    stockRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    stockLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: spacing.md,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: spacing.sm,
    },
    stockInfo: {
      flex: 1,
    },
    stockTickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    stockTicker: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text.primary,
    },
    typeBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
    },
    typeBadgeText: {
      fontSize: 9,
      fontWeight: '700',
    },
    stockName: {
      fontSize: 11,
      color: colors.text.secondary,
      marginTop: 2,
    },
    stockRight: {
      alignItems: 'flex-end',
    },
    stockPrice: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    stockChange: {
      fontSize: 12,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      marginTop: 1,
    },
    stockMeta: {
      fontSize: 9,
      color: colors.text.muted,
      fontVariant: ['tabular-nums'],
      marginTop: 2,
    },

    // -- Footer / Empty -------------------------------------------------------
    footerLoader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.sm,
    },
    footerText: {
      color: colors.text.secondary,
      fontSize: 13,
    },
    emptyWrap: {
      alignItems: 'center',
      paddingTop: 60,
    },
    emptyText: {
      color: colors.text.secondary,
      fontSize: 14,
    },
  });
