import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { useCardsStore } from '../../src/stores/cardsStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { CreditCardVisual } from '../../src/components/cards/CreditCardVisual';
import { SkeletonCard, SkeletonList } from '../../src/components/skeletons/Skeleton';
import { ErrorState } from '../../src/components/shared/ErrorState';
import { formatShortDate, maskValue, formatCurrency } from '../../src/utils/formatters';
import type { TransactionCategory } from '../../src/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 64;
const CARD_SNAP_INTERVAL = CARD_WIDTH + 16; // card width + horizontal gap

// ---------------------------------------------------------------------------
// Category icon map
// ---------------------------------------------------------------------------

const categoryIcons: Record<string, string> = {
  food: '\u{1F355}',
  transport: '\u{1F697}',
  subscriptions: '\u{1F4FA}',
  shopping: '\u{1F6CD}\uFE0F',
  fuel: '\u26FD',
  health: '\u{1F48A}',
  travel: '\u2708\uFE0F',
  tech: '\u{1F4BB}',
};

// ===========================================================================
// CardsScreen
// ===========================================================================

export default function CardsScreen() {
  const insets = useSafeAreaInsets();
  const carouselRef = useRef<ScrollView>(null);

  // ---- Stores -------------------------------------------------------------
  const {
    cards,
    categorySpending,
    isLoading,
    isRefreshing,
    error,
    loadCards,
    refresh,
    selectedCardIndex,
    setSelectedCardIndex,
    getSelectedCard,
  } = useCardsStore();

  const { valuesHidden } = useAuthStore();
  const { t, currency } = useSettingsStore();
  const router = useRouter();

  // ---- Effects ------------------------------------------------------------
  useEffect(() => {
    loadCards();
  }, []);

  // ---- Derived values -----------------------------------------------------
  const selectedCard = getSelectedCard();

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    if (!selectedCard?.transactions) return [];

    const groups: { date: string; transactions: typeof selectedCard.transactions }[] = [];
    const map = new Map<string, typeof selectedCard.transactions>();

    for (const tx of selectedCard.transactions) {
      const key = tx.date;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(tx);
    }

    for (const [date, transactions] of map) {
      groups.push({ date, transactions });
    }

    return groups;
  }, [selectedCard]);

  // ---- Handlers -----------------------------------------------------------
  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / CARD_SNAP_INTERVAL);
      if (index !== selectedCardIndex && index >= 0 && index < cards.length) {
        setSelectedCardIndex(index);
      }
    },
    [selectedCardIndex, cards.length, setSelectedCardIndex],
  );

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  // ---- Value display helpers ----------------------------------------------
  const displayValue = (value: number) =>
    valuesHidden ? maskValue('') : formatCurrency(value, currency);

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            progressBackgroundColor={colors.card}
            colors={[colors.accent]}
          />
        }
      >
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                           */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('cards.title')}</Text>
        </View>

        {/* ---------------------------------------------------------------- */}
        {/* Loading skeleton state                                           */}
        {/* ---------------------------------------------------------------- */}
        {isLoading ? (
          <View style={styles.contentPadding}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonList count={5} />
          </View>
        ) : error && cards.length === 0 ? (
          <ErrorState message={error} onRetry={loadCards} />
        ) : cards.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={styles.emptyTitle}>{t('cards.emptyTitle')}</Text>
            <Text style={styles.emptyDescription}>{t('cards.emptyDescription')}</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/connect-bank')}
              activeOpacity={0.7}
            >
              <Text style={styles.emptyButtonText}>{t('cards.emptyButton')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* -------------------------------------------------------------- */}
            {/* Horizontal card carousel                                        */}
            {/* -------------------------------------------------------------- */}
            {cards.length > 0 && (
              <View>
                <ScrollView
                  ref={carouselRef}
                  horizontal
                  pagingEnabled={false}
                  snapToInterval={CARD_SNAP_INTERVAL}
                  decelerationRate="fast"
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carouselContent}
                  onMomentumScrollEnd={handleScrollEnd}
                >
                  {cards.map((card) => (
                    <View key={card.id} style={styles.cardWrapper}>
                      <CreditCardVisual card={card} />
                    </View>
                  ))}
                </ScrollView>

                {/* Page dots */}
                <View style={styles.dotsRow}>
                  {cards.map((card, index) => (
                    <View
                      key={card.id}
                      style={[
                        styles.dot,
                        {
                          backgroundColor:
                            index === selectedCardIndex
                              ? colors.accent
                              : colors.border,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Invoice summary                                                 */}
            {/* -------------------------------------------------------------- */}
            {selectedCard && (
              <View style={styles.contentPadding}>
                <View style={styles.invoiceCard}>
                  <View style={styles.invoiceColumns}>
                    <View style={styles.invoiceColumn}>
                      <Text style={styles.invoiceLabel}>{t('cards.currentInvoice')}</Text>
                      <Text style={styles.invoiceValueLarge}>
                        {displayValue(selectedCard.currentInvoice)}
                      </Text>
                    </View>
                    <View style={styles.invoiceColumn}>
                      <Text style={styles.invoiceLabel}>{t('cards.nextInvoice')}</Text>
                      <Text style={styles.invoiceValueSecondary}>
                        {displayValue(selectedCard.nextInvoice)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Category spending                                               */}
            {/* -------------------------------------------------------------- */}
            {categorySpending.length > 0 && (
              <View style={styles.contentPadding}>
                <Text style={styles.sectionTitle}>{t('cards.spendingByCategory')}</Text>

                {categorySpending
                  .filter((cat) => cat.total > 0)
                  .map((cat, index) => (
                    <View
                      key={cat.category}
                      style={styles.categoryRow}
                    >
                      <Text style={styles.categoryIcon}>
                        {categoryIcons[cat.category] ?? cat.icon}
                      </Text>
                      <Text style={styles.categoryLabel}>{cat.label}</Text>
                      <View style={styles.categoryBarTrack}>
                        <View
                          style={[
                            styles.categoryBarFill,
                            {
                              width: `${cat.percentage}%` as any,
                              backgroundColor: cat.color,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.categoryValue}>
                        {displayValue(cat.total)}
                      </Text>
                    </View>
                  ))}
              </View>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Transactions                                                    */}
            {/* -------------------------------------------------------------- */}
            {selectedCard && selectedCard.transactions.length > 0 && (
              <View style={styles.contentPadding}>
                <Text style={styles.sectionTitle}>{t('cards.transactions')}</Text>

                {groupedTransactions.map((group) => (
                  <View key={group.date} style={styles.transactionGroup}>
                    <Text style={styles.dateHeader}>
                      {formatShortDate(group.date)}
                    </Text>

                    {group.transactions.map((tx, txIndex) => (
                      <View
                        key={tx.id}
                        style={styles.transactionRow}
                      >
                        <Text style={styles.transactionIcon}>
                          {categoryIcons[tx.category] ?? '\u{1F4B3}'}
                        </Text>
                        <View style={styles.transactionInfo}>
                          <Text style={styles.transactionDescription}>
                            {tx.description}
                          </Text>
                          {tx.installment ? (
                            <Text style={styles.transactionInstallment}>
                              {tx.installment}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={styles.transactionAmount}>
                          {displayValue(tx.amount)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ===========================================================================
// Styles
// ===========================================================================

const styles = StyleSheet.create({
  // -- Layout ---------------------------------------------------------------
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  contentPadding: {
    paddingHorizontal: spacing.xl,
  },

  // -- Header ---------------------------------------------------------------
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },

  // -- Carousel -------------------------------------------------------------
  carouselContent: {
    paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginHorizontal: 8,
  },

  // -- Page dots -------------------------------------------------------------
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 4,
  },

  // -- Invoice summary -------------------------------------------------------
  invoiceCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  invoiceColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  invoiceColumn: {
    flex: 1,
  },
  invoiceLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  invoiceValueLarge: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  invoiceValueSecondary: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.secondary,
    fontVariant: ['tabular-nums'],
  },

  // -- Section titles --------------------------------------------------------
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },

  // -- Category spending -----------------------------------------------------
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  categoryIcon: {
    fontSize: 18,
    width: 28,
  },
  categoryLabel: {
    fontSize: 14,
    color: colors.text.primary,
    width: 100,
  },
  categoryBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.elevated,
    borderRadius: 3,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    minWidth: 80,
  },

  // -- Transactions ----------------------------------------------------------
  transactionGroup: {
    marginBottom: spacing.lg,
  },
  dateHeader: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  transactionIcon: {
    fontSize: 20,
    width: 32,
  },
  transactionInfo: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  transactionDescription: {
    fontSize: 14,
    color: colors.text.primary,
  },
  transactionInstallment: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    minWidth: 90,
  },

  // -- Empty state -----------------------------------------------------------
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background,
  },
});
