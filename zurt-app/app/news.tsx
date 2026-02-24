import React, { useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useNewsStore } from '../src/stores/newsStore';
import { useAuthStore } from '../src/stores/authStore';
import { Header } from '../src/components/shared/Header';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { AppIcon } from '../src/hooks/useIcon';
import { SkeletonList } from '../src/components/skeletons/Skeleton';
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

function getRelativeTime(dateStr: string, t: (k: string) => string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return t('news.today');
  if (diffHours < 24) return `${diffHours}${t('news.hoursAgo')}`;
  if (diffDays === 1) return t('news.yesterday');
  return `${diffDays}${t('news.daysAgo')}`;
}

// =============================================================================
// Main Screen Component
// =============================================================================

export default function NewsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const { isDemoMode } = useAuthStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    isLoading,
    selectedCategory,
    loadNews,
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
      <Card delay={index * 60} style={styles.articleCard}>
        {/* Title */}
        <Text style={styles.articleTitle} numberOfLines={2}>
          {item.title}
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
          {item.summary}
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
    ),
    [colors, styles, t],
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <AppIcon name="alert" size={40} color={colors.text.muted} />
      <Text style={styles.emptyText}>{t('news.noArticles')}</Text>
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

      {/* Demo disclaimer */}
      {isDemoMode && (
        <View style={styles.demoBanner}>
          <AppIcon name="info" size={14} color={colors.warning} />
          <Text style={styles.demoBannerText}>{t('news.demoDisclaimer')}</Text>
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={styles.skeletonContainer}>
          <SkeletonList count={5} />
        </View>
      ) : (
        <FlatList
          data={filteredArticles}
          keyExtractor={(item) => item.id}
          renderItem={renderArticleCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
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
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.md,
      gap: spacing.sm,
    },
    filterPill: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    filterPillActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    filterPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    filterPillTextActive: {
      color: colors.background,
    },

    // Demo banner
    demoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.xl,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.warning + '15',
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.warning + '30',
    },
    demoBannerText: {
      flex: 1,
      fontSize: 12,
      color: colors.warning,
      lineHeight: 16,
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
