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
  ScrollView,
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
import type { StockListItem } from '../../src/types/brapi';

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
    searchResults,
    currentPage,
    hasMore,
    isLoading,
    isSearching,
    activeFilter,
    ibovespa,
    usdBrl,
    eurBrl,
    btcBrl,
    currentSelic,
    currentInflation,
    loadAllStocks,
    loadMarketOverview,
    searchAssets,
    clearSearch,
  } = useMarketStore();

  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSearchMode = search.length >= 2;

  // Initial load
  useEffect(() => {
    loadAllStocks(1, 'all');
    loadMarketOverview();
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (search.length >= 2) {
      debounceRef.current = setTimeout(() => {
        searchAssets(search);
      }, 400);
    } else {
      clearSearch();
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const handleFilterChange = useCallback(
    (filter: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      loadAllStocks(1, filter as any);
    },
    [loadAllStocks],
  );

  const handleLoadMore = useCallback(() => {
    if (isLoading || !hasMore || isSearchMode) return;
    loadAllStocks(currentPage + 1, activeFilter);
  }, [isLoading, hasMore, isSearchMode, currentPage, activeFilter, loadAllStocks]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      loadAllStocks(1, activeFilter),
      loadMarketOverview(),
    ]);
    setRefreshing(false);
  }, [activeFilter, loadAllStocks, loadMarketOverview]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderStockItem = useCallback(
    ({ item }: { item: StockListItem }) => {
      const change = Number(item.change || 0);
      const changeColor = change >= 0 ? colors.positive : colors.negative;
      const arrow = change > 0 ? '\u25B2' : change < 0 ? '\u25BC' : '';
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
          {/* Left: ticker + type + name */}
          <View style={styles.stockLeft}>
            {item.logo ? (
              <View style={styles.logoWrap}>
                <Text style={styles.logoFallback}>{item.stock?.[0] || '?'}</Text>
              </View>
            ) : (
              <View style={styles.logoWrap}>
                <Text style={styles.logoFallback}>{item.stock?.[0] || '?'}</Text>
              </View>
            )}
            <View style={styles.stockInfo}>
              <View style={styles.stockTickerRow}>
                <Text style={styles.stockTicker}>{item.stock}</Text>
                {item.type && (
                  <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
                    <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                      {item.type === 'stock' ? 'AÇÃO' : item.type === 'fund' ? 'FII' : 'BDR'}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.stockName} numberOfLines={1}>
                {item.name || item.stock}
              </Text>
            </View>
          </View>

          {/* Right: price + change + volume */}
          <View style={styles.stockRight}>
            <Text style={styles.stockPrice}>
              {formatBRL(Number(item.close || 0))}
            </Text>
            <Text style={[styles.stockChange, { color: changeColor }]}>
              {arrow} {formatPct(change)}
            </Text>
            <Text style={styles.stockMeta}>
              Vol {formatVolume(Number(item.volume || 0))}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [colors, styles, router],
  );

  // Search result item
  const renderSearchItem = useCallback(
    ({ item }: { item: StockListItem }) => {
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
          <View style={styles.stockLeft}>
            <View style={styles.logoWrap}>
              <Text style={styles.logoFallback}>{item.stock?.[0] || '?'}</Text>
            </View>
            <View style={styles.stockInfo}>
              <View style={styles.stockTickerRow}>
                <Text style={styles.stockTicker}>{item.stock}</Text>
                {item.type && (
                  <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
                    <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                      {item.type === 'stock' ? 'AÇÃO' : item.type === 'fund' ? 'FII' : 'BDR'}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.stockName} numberOfLines={1}>
                {item.name || item.stock}
              </Text>
            </View>
          </View>
          <View style={styles.stockRight}>
            <Text style={styles.stockPrice}>
              {formatBRL(Number(item.close || 0))}
            </Text>
            {item.sector && (
              <Text style={styles.stockMeta} numberOfLines={1}>{item.sector}</Text>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [colors, styles, router],
  );

  const renderMacroIndicators = useCallback(
    () => (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.macroScroll}
      >
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
                color: Number(ibovespa?.regularMarketChangePercent || 0) >= 0
                  ? colors.positive
                  : colors.negative,
              },
            ]}
          >
            {ibovespa
              ? `${Number(ibovespa.regularMarketChangePercent || 0) >= 0 ? '\u25B2' : '\u25BC'} ${formatPct(Number(ibovespa.regularMarketChangePercent || 0))}`
              : '---'}
          </Text>
        </View>

        {/* USD/BRL */}
        <View style={styles.macroCard}>
          <Text style={styles.macroLabel}>USD/BRL</Text>
          <Text style={styles.macroValue}>
            {usdBrl ? `R$ ${Number(usdBrl.bidPrice || 0).toFixed(2).replace('.', ',')}` : '---'}
          </Text>
          <Text
            style={[
              styles.macroChange,
              {
                color: Number(usdBrl?.regularMarketChangePercent || 0) >= 0
                  ? colors.positive
                  : colors.negative,
              },
            ]}
          >
            {usdBrl
              ? `${Number(usdBrl.regularMarketChangePercent || 0) >= 0 ? '\u25B2' : '\u25BC'} ${formatPct(Number(usdBrl.regularMarketChangePercent || 0))}`
              : '---'}
          </Text>
        </View>

        {/* EUR/BRL */}
        <View style={styles.macroCard}>
          <Text style={styles.macroLabel}>EUR/BRL</Text>
          <Text style={styles.macroValue}>
            {eurBrl ? `R$ ${Number(eurBrl.bidPrice || 0).toFixed(2).replace('.', ',')}` : '---'}
          </Text>
          <Text
            style={[
              styles.macroChange,
              {
                color: Number(eurBrl?.regularMarketChangePercent || 0) >= 0
                  ? colors.positive
                  : colors.negative,
              },
            ]}
          >
            {eurBrl
              ? `${Number(eurBrl.regularMarketChangePercent || 0) >= 0 ? '\u25B2' : '\u25BC'} ${formatPct(Number(eurBrl.regularMarketChangePercent || 0))}`
              : '---'}
          </Text>
        </View>

        {/* BTC */}
        <View style={styles.macroCard}>
          <Text style={styles.macroLabel}>BTC</Text>
          <Text style={styles.macroValue}>
            {btcBrl
              ? `R$ ${(Number(btcBrl.regularMarketPrice || 0) / 1000).toFixed(1).replace('.', ',')}K`
              : '---'}
          </Text>
          <Text
            style={[
              styles.macroChange,
              {
                color: Number(btcBrl?.regularMarketChangePercent || 0) >= 0
                  ? colors.positive
                  : colors.negative,
              },
            ]}
          >
            {btcBrl
              ? `${Number(btcBrl.regularMarketChangePercent || 0) >= 0 ? '\u25B2' : '\u25BC'} ${formatPct(Number(btcBrl.regularMarketChangePercent || 0))}`
              : '---'}
          </Text>
        </View>

        {/* SELIC */}
        <View style={styles.macroCard}>
          <Text style={styles.macroLabel}>SELIC</Text>
          <Text style={styles.macroValue}>
            {currentSelic != null ? `${Number(currentSelic).toFixed(2).replace('.', ',')}%` : '---'}
          </Text>
          <Text style={[styles.macroChange, { color: colors.info }]}>a.a.</Text>
        </View>
      </ScrollView>
    ),
    [ibovespa, usdBrl, eurBrl, btcBrl, currentSelic, colors, styles],
  );

  const renderHeader = useCallback(
    () => (
      <View>
        {renderMacroIndicators()}

        {/* Results count */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {allStocks.length > 0 ? `${allStocks.length} ativos` : 'Carregando...'}
          </Text>
        </View>
      </View>
    ),
    [allStocks.length, renderMacroIndicators, styles],
  );

  const renderFooter = useCallback(() => {
    if (!isLoading || isSearchMode) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.footerText}>Carregando mais...</Text>
      </View>
    );
  }, [isLoading, isSearchMode, colors, styles]);

  const renderEmpty = useCallback(() => {
    if (isLoading || isSearching) return null;
    return (
      <View style={styles.emptyWrap}>
        <AppIcon name="search" size={40} color={colors.text.muted} />
        <Text style={styles.emptyTitle}>
          {isSearchMode ? 'Nenhum resultado' : 'Nenhum ativo encontrado'}
        </Text>
        <Text style={styles.emptyText}>
          {isSearchMode
            ? `Nenhum ativo encontrado para "${search}"`
            : 'Tente novamente em instantes'}
        </Text>
      </View>
    );
  }, [isLoading, isSearching, isSearchMode, search, colors, styles]);

  // Data to display
  const listData = isSearchMode ? searchResults : allStocks;

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
          <AppIcon name="trending" size={18} color={colors.accent} />
          <Text style={styles.headerTitle}>Mercado</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <AppIcon name="search" size={16} color={colors.text.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar ações, FIIs, BDRs..."
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
        {isSearching && <ActivityIndicator size="small" color={colors.accent} />}
      </View>

      {/* Filter chips (hidden during search) */}
      {!isSearchMode && (
        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterChip,
                  active && { backgroundColor: colors.accent, borderColor: colors.accent },
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
      )}

      {/* Search results label */}
      {isSearchMode && (
        <View style={styles.searchResultsLabel}>
          <Text style={styles.resultsCount}>
            {isSearching
              ? 'Buscando...'
              : `${searchResults.length} resultado${searchResults.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
      )}

      {/* Stock list */}
      <FlatList
        data={listData}
        keyExtractor={(item) => item.stock}
        renderItem={isSearchMode ? renderSearchItem : renderStockItem}
        ListHeaderComponent={isSearchMode ? undefined : renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
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
    headerCenter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
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

    // -- Search results label -------------------------------------------------
    searchResultsLabel: {
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.sm,
    },

    // -- List -----------------------------------------------------------------
    listContent: {
      paddingBottom: 100,
    },

    // -- Macro indicators (horizontal scroll) ---------------------------------
    macroScroll: {
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    macroCard: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      alignItems: 'center',
      minWidth: 100,
    },
    macroLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.text.muted,
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    macroValue: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
      marginBottom: 2,
    },
    macroChange: {
      fontSize: 11,
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
    logoWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.elevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm,
    },
    logoFallback: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.accent,
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
      letterSpacing: 0.3,
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
      gap: spacing.sm,
    },
    emptyTitle: {
      color: colors.text.primary,
      fontSize: 16,
      fontWeight: '600',
      marginTop: spacing.md,
    },
    emptyText: {
      color: colors.text.secondary,
      fontSize: 13,
      textAlign: 'center',
      paddingHorizontal: spacing.xxl,
    },
  });
