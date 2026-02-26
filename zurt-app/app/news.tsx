import React, { useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useNewsStore } from '../src/stores/newsStore';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { AppIcon } from '../src/hooks/useIcon';
import { SkeletonList } from '../src/components/skeletons/Skeleton';
import { ErrorState } from '../src/components/shared/ErrorState';
import type { NewsCategory } from '../src/types';

// =============================================================================
// Helpers
// =============================================================================

const CATEGORY_PILLS: { key: NewsCategory | 'all'; labelKey: string }[] = [
  { key: 'all', labelKey: 'news.all' },
  { key: 'market', labelKey: 'news.market' },
  { key: 'economy', labelKey: 'news.economy' },
  { key: 'stocks', labelKey: 'news.stocks' },
  { key: 'crypto', labelKey: 'news.crypto' },
  { key: 'funds', labelKey: 'news.funds' },
];

const HTML_NAMED_ENTITIES: Record<string, string> = {
  '&amp;': '&', '&quot;': '"', '&lt;': '<', '&gt;': '>',
  '&apos;': "'", '&#39;': "'", '&nbsp;': ' ',
  '&ndash;': '\u2013', '&mdash;': '\u2014',
  '&lsquo;': '\u2018', '&rsquo;': '\u2019',
  '&ldquo;': '\u201C', '&rdquo;': '\u201D',
  '&hellip;': '\u2026', '&copy;': '\u00A9',
  '&reg;': '\u00AE', '&trade;': '\u2122',
};

function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  let result = text
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '');
  // Named entities
  result = result.replace(/&[a-zA-Z]+;/g, (match) => HTML_NAMED_ENTITIES[match] ?? match);
  // Numeric decimal entities: &#8216;
  result = result.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
  // Numeric hex entities: &#x2018;
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  return result;
}

function getRelativeTime(dateStr: string, t: (k: string) => string): string {
  const now = new Date();
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t('news.today');
  if (diffMin < 60) return `${diffMin}min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}${t('news.hoursAgo')}`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return t('news.yesterday');
  if (diffDays < 7) return `${diffDays}${t('news.daysAgo')}`;
  return date.toLocaleDateString('pt-BR');
}

// =============================================================================
// Main Screen Component
// =============================================================================

export default function NewsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    isLoading,
    isRefreshing,
    error,
    selectedCategory,
    loadNews,
    refreshNews,
    setCategory,
    getFilteredArticles,
  } = useNewsStore();

  const filteredArticles = getFilteredArticles();

  useEffect(() => {
    loadNews();
  }, []);

  const handleCategoryPress = useCallback(
    (category: NewsCategory | 'all') => {
      Haptics.selectionAsync();
      setCategory(category);
    },
    [setCategory],
  );

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [router]);

  const handleArticlePress = useCallback((url?: string) => {
    if (url) {
      Haptics.selectionAsync();
      Linking.openURL(url);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    refreshNews();
  }, [refreshNews]);

  // ---- Render helpers ----

  const renderCategoryPills = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      {CATEGORY_PILLS.map((pill) => {
        const isActive = selectedCategory === pill.key;
        return (
          <TouchableOpacity
            key={pill.key}
            style={[styles.filterPill, isActive && styles.filterPillActive]}
            onPress={() => handleCategoryPress(pill.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterPillText,
                isActive && styles.filterPillTextActive,
              ]}
            >
              {t(pill.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderArticleCard = useCallback(
    ({ item, index }: { item: (typeof filteredArticles)[0]; index: number }) => (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleArticlePress(item.url)}
      >
        <Card delay={index * 60} style={styles.articleCard}>
          {/* Title */}
          <Text style={styles.articleTitle} numberOfLines={2}>
            {decodeHtmlEntities(item.title)}
          </Text>

          {/* Source + time row */}
          <View style={styles.metaRow}>
            <Text style={styles.metaSource}>{item.source}</Text>
            <Text style={styles.metaDot}>{' \u00B7 '}</Text>
            <Text style={styles.metaTime}>
              {getRelativeTime(item.date, t)}
            </Text>
          </View>

          {/* Summary */}
          <Text style={styles.articleSummary} numberOfLines={2}>
            {decodeHtmlEntities(item.summary)}
          </Text>

          {/* Bottom row: category badge + tickers */}
          <View style={styles.bottomRow}>
            <Badge value={t(`news.${item.category}`)} size="sm" variant="info" />
            {item.relatedTickers && item.relatedTickers.length > 0 && (
              <View style={styles.tickerRow}>
                {item.relatedTickers.map((ticker) => (
                  <Badge
                    key={ticker}
                    value={ticker}
                    size="sm"
                    variant="neutral"
                  />
                ))}
              </View>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    ),
    [colors, styles, t, handleArticlePress],
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <AppIcon name="news" size={40} color={colors.text.muted} />
      <Text style={styles.emptyText}>
        {t('news.noArticles')}
      </Text>
    </View>
  );

  // ---- Main render ----

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('news.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Category Filter Pills */}
      {renderCategoryPills()}

      {/* Content */}
      {isLoading ? (
        <View style={styles.skeletonContainer}>
          <SkeletonList count={5} />
        </View>
      ) : error && filteredArticles.length === 0 ? (
        <ErrorState message={error} onRetry={loadNews} />
      ) : (
        <FlatList
          data={filteredArticles}
          keyExtractor={(item) => item.id}
          renderItem={renderArticleCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        />
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

    // Header
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

    // Filter pills
    filterRow: {
      paddingLeft: spacing.xl,
      paddingRight: spacing.xl * 3,
      paddingBottom: spacing.md,
      gap: spacing.sm,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    filterPill: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      minHeight: 38,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      flexShrink: 0,
    },
    filterPillActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    filterPillText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.secondary,
      lineHeight: 20,
      includeFontPadding: false,
      textAlignVertical: 'center',
      textAlign: 'center' as const,
    },
    filterPillTextActive: {
      color: colors.background,
    },

    // List
    listContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 100,
    },
    skeletonContainer: {
      paddingHorizontal: spacing.xl,
    },

    // Article card
    articleCard: {
      marginBottom: spacing.sm,
    },
    articleTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text.primary,
      lineHeight: 21,
      marginBottom: spacing.xs,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    metaSource: {
      fontSize: 12,
      color: colors.text.secondary,
    },
    metaDot: {
      fontSize: 12,
      color: colors.text.muted,
    },
    metaTime: {
      fontSize: 12,
      color: colors.text.secondary,
    },
    articleSummary: {
      fontSize: 13,
      color: colors.text.secondary,
      lineHeight: 19,
      marginBottom: spacing.md,
    },

    // Bottom row
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    tickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },

    // Empty state
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
      gap: spacing.md,
    },
    emptyText: {
      fontSize: 14,
      color: colors.text.muted,
      textAlign: 'center',
    },
  });
