import React, { useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useWatchlistStore } from '../src/stores/watchlistStore';
import { Header } from '../src/components/shared/Header';
import { Input } from '../src/components/ui/Input';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { AppIcon } from '../src/hooks/useIcon';
import { MiniLineChart } from '../src/components/charts/MiniLineChart';
import { SkeletonList } from '../src/components/skeletons/Skeleton';
import type { WatchlistItem } from '../src/types';

// =============================================================================
// WatchlistScreen
// =============================================================================

export default function WatchlistScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const {
    items,
    searchQuery,
    searchResults,
    isLoading,
    loadWatchlist,
    addItem,
    removeItem,
    searchAssets,
    clearSearch,
  } = useWatchlistStore();

  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    loadWatchlist();
  }, []);

  const handleAdd = useCallback(
    (item: WatchlistItem) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      addItem(item);
    },
    [addItem],
  );

  const handleRemove = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      removeItem(id);
    },
    [removeItem],
  );

  const formatPrice = useCallback((price: number) => {
    return price.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  }, []);

  const renderSearchResult = useCallback(
    ({ item }: { item: WatchlistItem }) => (
      <TouchableOpacity
        style={styles.searchRow}
        onPress={() => handleAdd(item)}
        activeOpacity={0.7}
      >
        <View style={styles.searchInfo}>
          <Text style={styles.searchTicker}>{item.ticker}</Text>
          <Text style={styles.searchName} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        <View style={styles.addCircle}>
          <AppIcon name="add" size={18} color={colors.background} />
        </View>
      </TouchableOpacity>
    ),
    [styles, colors, handleAdd],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: WatchlistItem; index: number }) => {
      const isPositive = item.dailyChange >= 0;
      const changeText = `${isPositive ? '+' : ''}${item.dailyChange.toFixed(1)}%`;

      return (
        <Card delay={index * 60}>
          <View style={styles.row}>
            {/* Left: ticker + name */}
            <View style={styles.tickerCol}>
              <Text style={styles.ticker}>{item.ticker}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
            </View>

            {/* Center: sparkline */}
            <View style={styles.chartCol}>
              <MiniLineChart
                data={item.priceHistory}
                width={60}
                height={24}
                color={isPositive ? colors.positive : colors.negative}
                strokeWidth={1.5}
              />
            </View>

            {/* Right: price + badge */}
            <View style={styles.priceCol}>
              <Text style={styles.price}>R$ {formatPrice(item.currentPrice)}</Text>
              <Badge
                value={changeText}
                variant={isPositive ? 'positive' : 'negative'}
                size="sm"
              />
            </View>

            {/* Far right: remove button */}
            <TouchableOpacity
              onPress={() => handleRemove(item.id)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.removeBtn}
              accessibilityLabel={t('watchlist.removeAsset')}
            >
              <AppIcon name="close" size={16} color={colors.text.muted} />
            </TouchableOpacity>
          </View>
        </Card>
      );
    },
    [styles, colors, formatPrice, handleRemove, t],
  );

  const keyExtractor = useCallback((item: WatchlistItem) => item.id, []);

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel={t('common.back')}
        >
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('watchlist.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Input
          placeholder={t('watchlist.searchPlaceholder')}
          value={searchQuery}
          onChangeText={searchAssets}
          icon={<AppIcon name="search" size={18} color={colors.text.muted} />}
          rightIcon={
            searchQuery.length > 0 ? (
              <AppIcon name="close" size={16} color={colors.text.muted} />
            ) : undefined
          }
          onRightIconPress={clearSearch}
        />
      </View>

      {/* Search Results */}
      {searchQuery.length > 0 && (
        <View style={styles.searchResultsContainer}>
          {searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              style={styles.searchList}
            />
          ) : (
            <Text style={styles.noResults}>{t('watchlist.searchNoResults')}</Text>
          )}
        </View>
      )}

      {/* Loading */}
      {isLoading && searchQuery.length === 0 && (
        <View style={styles.loadingContainer}>
          <SkeletonList count={5} />
        </View>
      )}

      {/* Watchlist Items */}
      {!isLoading && searchQuery.length === 0 && (
        <>
          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <AppIcon name="chart" size={56} color={colors.text.muted} />
              <Text style={styles.emptyText}>{t('watchlist.empty')}</Text>
              <Text style={styles.emptySub}>{t('watchlist.emptyCta')}</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

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
      paddingVertical: spacing.lg,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
    },
    searchContainer: {
      paddingHorizontal: spacing.xl,
    },
    searchResultsContainer: {
      paddingHorizontal: spacing.xl,
      maxHeight: 240,
    },
    searchList: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border + '40',
    },
    searchInfo: {
      flex: 1,
      marginRight: spacing.md,
    },
    searchTicker: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text.primary,
    },
    searchName: {
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 2,
    },
    addCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noResults: {
      fontSize: 13,
      color: colors.text.muted,
      textAlign: 'center',
      paddingVertical: spacing.lg,
    },
    loadingContainer: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
    },
    listContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 100,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tickerCol: {
      flex: 1,
      marginRight: spacing.sm,
    },
    ticker: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text.primary,
    },
    name: {
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 2,
    },
    chartCol: {
      marginHorizontal: spacing.sm,
    },
    priceCol: {
      alignItems: 'flex-end',
      marginRight: spacing.sm,
    },
    price: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
      marginBottom: 4,
    },
    removeBtn: {
      padding: spacing.xs,
      marginLeft: spacing.xs,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxl,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.secondary,
      marginTop: spacing.lg,
      textAlign: 'center',
    },
    emptySub: {
      fontSize: 13,
      color: colors.text.muted,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
  });
