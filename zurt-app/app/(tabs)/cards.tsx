import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
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
  Modal,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { type ThemeColors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { useCardsStore } from '../../src/stores/cardsStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useAgentStore } from '../../src/stores/agentStore';
import { AppIcon } from '../../src/hooks/useIcon';
import { CreditCardVisual } from '../../src/components/cards/CreditCardVisual';
import { SkeletonCard, SkeletonList } from '../../src/components/skeletons/Skeleton';
import { ErrorState } from '../../src/components/shared/ErrorState';
import { formatShortDate, formatDate, maskValue, formatCurrency } from '../../src/utils/formatters';
import { categorizeTransaction } from '../../src/utils/transactionCategories';
import type { TransactionCategory, CategorySpending } from '../../src/types';
import type { DashboardTransaction } from '../../src/services/api';
import { logger } from '../../src/utils/logger';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 64;
const CARD_SNAP_INTERVAL = CARD_WIDTH + 16;

// ===========================================================================
// DonutChart (SVG)
// ===========================================================================

function DonutChart({
  data,
  size = 160,
  strokeWidth = 28,
  totalLabel,
  totalValue,
  colors: themeColors,
}: {
  data: { percentage: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  totalLabel?: string;
  totalValue?: string;
  colors: ThemeColors;
}) {
  const center = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  let accumulated = 0;
  const segments = data
    .filter((d) => d.percentage > 0)
    .map((d) => {
      const dashLength = (d.percentage / 100) * circumference;
      const dashOffset = circumference - ((accumulated / 100) * circumference);
      accumulated += d.percentage;
      return { ...d, dashLength, dashOffset };
    });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <SvgCircle
          cx={center}
          cy={center}
          r={r}
          stroke={themeColors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Data segments */}
        {segments.map((seg, i) => (
          <SvgCircle
            key={i}
            cx={center}
            cy={center}
            r={r}
            stroke={seg.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
            strokeDashoffset={seg.dashOffset}
            strokeLinecap="butt"
            rotation={-90}
            origin={`${center}, ${center}`}
          />
        ))}
      </Svg>
      {/* Center text */}
      {totalLabel && totalValue && (
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{ fontSize: 10, color: themeColors.text.muted, marginBottom: 2 }}>
            {totalLabel}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: themeColors.text.primary }}>
            {totalValue}
          </Text>
        </View>
      )}
    </View>
  );
}

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
    dashboardTransactions,
    isLoading,
    isRefreshing,
    error,
    loadCards,
    loadTransactions,
    refresh,
    selectedCardIndex,
    setSelectedCardIndex,
    getSelectedCard,
  } = useCardsStore();

  const { valuesHidden } = useAuthStore();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { sendMessage } = useAgentStore();
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // ---- Effects ------------------------------------------------------------
  useEffect(() => {
    loadCards();
  }, []);

  // Fetch transactions from /finance/transactions if dashboard didn't provide them
  useEffect(() => {
    if (cards.length > 0) {
      logger.log('[Cards] dashboardTransactions:', dashboardTransactions.length);
      if (dashboardTransactions.length === 0) {
        logger.log('[Cards] No dashboard TX, fetching from /finance/transactions...');
        loadTransactions();
      }
    }
  }, [cards.length, dashboardTransactions.length]);

  // ---- Derived values -----------------------------------------------------
  const selectedCard = getSelectedCard();

  // All transactions (card-embedded + dashboard) unified and grouped by date
  const allTransactions = useMemo(() => {
    // Collect card-embedded transactions
    const cardTx: DashboardTransaction[] = (selectedCard?.transactions ?? []).map((tx) => ({
      id: tx.id,
      date: tx.date,
      amount: tx.amount,
      description: tx.description,
      merchant: '',
      account_name: selectedCard?.name ?? '',
      institution_name: selectedCard?.name ?? '',
      category: tx.category ?? '',
    }));

    // Dashboard transactions (filtered to selected card if possible)
    let dashTx: DashboardTransaction[] = [];
    if (dashboardTransactions.length > 0) {
      if (selectedCard) {
        const cardName = (selectedCard.name ?? '').toLowerCase();
        const cardLast4 = selectedCard.lastFour;
        const matched = dashboardTransactions.filter((tx) => {
          const instName = (tx.institution_name ?? '').toLowerCase();
          const accName = (tx.account_name ?? '').toLowerCase();
          return (
            (cardName && (instName.includes(cardName) || accName.includes(cardName))) ||
            (cardLast4 && (accName.includes(cardLast4) || instName.includes(cardLast4)))
          );
        });
        dashTx = matched.length > 0 ? matched : dashboardTransactions;
      } else {
        dashTx = dashboardTransactions;
      }
    }

    // Merge: card-embedded first, then dashboard (dedup by id)
    const seenIds = new Set(cardTx.map((t) => t.id));
    const merged = [...cardTx];
    for (const tx of dashTx) {
      if (!seenIds.has(tx.id)) {
        merged.push(tx);
        seenIds.add(tx.id);
      }
    }

    // Sort by date descending
    merged.sort((a, b) => {
      const da = new Date(a.date).getTime() || 0;
      const db = new Date(b.date).getTime() || 0;
      return db - da;
    });

    // Limit to 30
    return merged.slice(0, 30);
  }, [selectedCard, dashboardTransactions]);

  // Group transactions by date
  const groupedAllTransactions = useMemo(() => {
    if (allTransactions.length === 0) return [];

    const groups: { date: string; transactions: DashboardTransaction[] }[] = [];
    const map = new Map<string, DashboardTransaction[]>();

    for (const tx of allTransactions) {
      // Normalize date to YYYY-MM-DD
      const dateKey = tx.date ? tx.date.substring(0, 10) : 'unknown';
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(tx);
    }

    for (const [date, transactions] of map) {
      groups.push({ date, transactions });
    }

    return groups;
  }, [allTransactions]);

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

  const handleAnalyzeWithAI = useCallback(async () => {
    if (categorySpending.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowAiModal(true);
    setAiLoading(true);
    setAiResponse('');

    const spendingSummary = categorySpending
      .filter((c) => c.total > 0)
      .map((c) => `${c.label}: R$ ${c.total.toLocaleString('pt-BR')}`)
      .join(', ');

    try {
      await sendMessage(
        `Analise meus gastos deste mês: ${spendingSummary}. Me dê 3 sugestões de economia.`,
      );
      // Get the latest assistant message
      const msgs = useAgentStore.getState().messages;
      const lastAssistant = [...msgs].reverse().find((m) => m.role === 'assistant');
      setAiResponse(lastAssistant?.content ?? 'Sem resposta disponível.');
    } catch {
      setAiResponse('Erro ao analisar gastos. Tente novamente.');
    } finally {
      setAiLoading(false);
    }
  }, [categorySpending, sendMessage]);

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('cards.title')}</Text>
        </View>

        {/* Loading */}
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
            <AppIcon name="card" size={48} color={colors.text.secondary} />
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
            {/* Card Carousel */}
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

            {/* Invoice Summary */}
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

            {/* Spending Analysis with Donut Chart */}
            {categorySpending.length > 0 && categorySpending.some((c) => c.total > 0) && (
              <View style={styles.contentPadding}>
                <Text style={styles.sectionTitle}>{t('cards.spendingAnalysis')}</Text>

                {/* Donut Chart */}
                <View style={styles.donutSection}>
                  <DonutChart
                    data={categorySpending.filter((c) => c.total > 0)}
                    size={160}
                    strokeWidth={26}
                    totalLabel={t('cards.totalSpending')}
                    totalValue={
                      valuesHidden
                        ? '•••••'
                        : formatCurrency(
                            categorySpending.reduce((sum, c) => sum + c.total, 0),
                            currency,
                          )
                    }
                    colors={colors}
                  />
                </View>

                {/* Category list with percentages */}
                {categorySpending
                  .filter((cat) => cat.total > 0)
                  .map((cat) => (
                    <View key={cat.category} style={styles.categoryRow}>
                      <View style={[styles.catIconCircle, { backgroundColor: (cat.color ?? '#95A5A6') + '25' }]}>
                        <Text style={styles.catEmoji}>{cat.icon}</Text>
                      </View>
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

                {/* Analyze with AI button */}
                <TouchableOpacity
                  style={[styles.aiButton, { borderColor: colors.accent }]}
                  onPress={handleAnalyzeWithAI}
                  activeOpacity={0.7}
                >
                  <AppIcon name="idea" size={16} color={colors.accent} />
                  <Text style={[styles.aiButtonText, { color: colors.accent }]}>
                    {t('cards.analyzeWithAI')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ============================================================= */}
            {/* Transactions (unified: card-embedded + dashboard, grouped)     */}
            {/* ============================================================= */}
            <View style={styles.contentPadding}>
              <Text style={styles.sectionTitle}>{t('cards.recentTransactions')}</Text>

              {groupedAllTransactions.length === 0 ? (
                <View style={styles.txEmptyState}>
                  <AppIcon name="wallet" size={40} color={colors.text.secondary} />
                  <Text style={styles.txEmptyText}>{t('cards.noTransactions')}</Text>
                </View>
              ) : (
                groupedAllTransactions.map((group) => (
                  <View key={group.date} style={styles.txGroup}>
                    <Text style={styles.txDateHeader}>
                      {group.date !== 'unknown' ? formatDate(group.date) : '-'}
                    </Text>

                    {group.transactions.map((tx) => {
                      const cat = categorizeTransaction(
                        tx.description || tx.merchant || tx.category || '',
                      );
                      return (
                        <View key={tx.id} style={styles.txRow}>
                          <View style={[styles.txIconCircle, { backgroundColor: cat.color + '25' }]}>
                            <Text style={styles.txEmoji}>{cat.emoji}</Text>
                          </View>
                          <View style={styles.txInfo}>
                            <Text style={styles.txDescription} numberOfLines={1}>
                              {cleanDescription(tx.description || tx.merchant || '-')}
                            </Text>
                            <Text style={styles.txSubtext}>
                              {cat.label}
                              {tx.institution_name ? ` \u2022 ${tx.institution_name}` : ''}
                            </Text>
                          </View>
                          <Text style={styles.txAmount}>
                            {valuesHidden
                              ? maskValue('')
                              : formatCurrency(Math.abs(tx.amount), currency)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* AI Analysis Modal */}
      <Modal visible={showAiModal} transparent animationType="fade" onRequestClose={() => setShowAiModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAiModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{t('cards.aiAnalysisTitle')}</Text>
            {aiLoading ? (
              <View style={styles.aiLoadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={styles.aiLoadingText}>{t('cards.aiAnalyzing')}</Text>
              </View>
            ) : (
              <ScrollView style={styles.aiResponseScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.aiResponseText}>{aiResponse}</Text>
              </ScrollView>
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowAiModal(false)}>
              <Text style={styles.modalCloseText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ===========================================================================
// Helpers
// ===========================================================================

/** Remove internal codes and clean up transaction descriptions */
function cleanDescription(desc: string): string {
  // Remove common prefixes like "COMPRA CARTAO -", "PAG*", "PG *"
  let cleaned = desc
    .replace(/^(COMPRA CARTAO\s*-?\s*)/i, '')
    .replace(/^(PAG\*|PG\s*\*|PAGTO\s*)/i, '')
    .replace(/^(PIX\s*(ENVIADO|RECEBIDO)?\s*-?\s*)/i, 'PIX ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Capitalize first letter, lowercase the rest if ALL CAPS
  if (cleaned === cleaned.toUpperCase() && cleaned.length > 3) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  }

  return cleaned || desc;
}

// ===========================================================================
// Styles
// ===========================================================================

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingBottom: 100 },
    contentPadding: { paddingHorizontal: spacing.xl },

    // Header
    header: { paddingTop: spacing.md, paddingBottom: spacing.xl, alignItems: 'center' },
    headerTitle: { fontSize: 24, fontWeight: '700', color: colors.text.primary },

    // Carousel
    carouselContent: { paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2 },
    cardWrapper: { width: CARD_WIDTH, marginHorizontal: 8 },

    // Page dots
    dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.xl },
    dot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 4 },

    // Invoice
    invoiceCard: {
      backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
      padding: spacing.xl, marginBottom: spacing.xl,
    },
    invoiceColumns: { flexDirection: 'row', justifyContent: 'space-between' },
    invoiceColumn: { flex: 1 },
    invoiceLabel: { fontSize: 12, color: colors.text.secondary, marginBottom: spacing.xs },
    invoiceValueLarge: { fontSize: 22, fontWeight: '700', color: colors.text.primary, fontVariant: ['tabular-nums'] },
    invoiceValueSecondary: { fontSize: 18, fontWeight: '600', color: colors.text.secondary, fontVariant: ['tabular-nums'] },

    // Section title
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.md, marginTop: spacing.sm },

    // Category spending
    categoryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
    catIconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
    catEmoji: { fontSize: 16 },
    categoryLabel: { fontSize: 14, color: colors.text.primary, width: 90 },
    categoryBarTrack: { flex: 1, height: 6, backgroundColor: colors.elevated, borderRadius: 3, marginHorizontal: spacing.sm, overflow: 'hidden' },
    categoryBarFill: { height: '100%', borderRadius: 3 },
    categoryValue: { fontSize: 13, fontWeight: '600', color: colors.text.secondary, fontVariant: ['tabular-nums'], textAlign: 'right', minWidth: 80 },

    // Transactions
    txGroup: { marginBottom: spacing.lg },
    txDateHeader: { fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: spacing.sm },
    txRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.card, borderRadius: radius.md,
      padding: spacing.md, marginBottom: spacing.xs,
      borderWidth: 1, borderColor: colors.border,
    },
    txIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
    txEmoji: { fontSize: 18 },
    txInfo: { flex: 1 },
    txDescription: { fontSize: 14, fontWeight: '500', color: colors.text.primary },
    txSubtext: { fontSize: 12, color: colors.text.muted, marginTop: 2 },
    txAmount: { fontSize: 14, fontWeight: '600', color: colors.negative, fontVariant: ['tabular-nums'], textAlign: 'right', minWidth: 80 },

    // Transaction empty state
    txEmptyState: { alignItems: 'center', paddingVertical: spacing.xxxl },
    txEmptyIcon: { fontSize: 40, marginBottom: spacing.md },
    txEmptyText: { fontSize: 14, color: colors.text.secondary, textAlign: 'center' },

    // Empty state
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: spacing.xl },
    emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary, textAlign: 'center', marginBottom: spacing.sm },
    emptyDescription: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing.xl },
    emptyButton: { backgroundColor: colors.accent, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, borderRadius: radius.md },
    emptyButtonText: { fontSize: 14, fontWeight: '600', color: colors.background },

    // Donut chart section
    donutSection: { alignItems: 'center', marginBottom: spacing.xl },

    // AI button
    aiButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderRadius: radius.md,
      paddingVertical: spacing.md, marginTop: spacing.md, gap: spacing.sm,
    },
    aiButtonText: { fontSize: 14, fontWeight: '600' },

    // AI Analysis Modal
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center', alignItems: 'center', padding: spacing.xl,
    },
    modalContent: {
      backgroundColor: colors.card, borderRadius: radius.lg,
      padding: spacing.xl, width: '100%', maxHeight: '70%',
      borderWidth: 1, borderColor: colors.border,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.lg, textAlign: 'center' },
    aiLoadingContainer: { alignItems: 'center', paddingVertical: spacing.xxxl },
    aiLoadingText: { fontSize: 14, color: colors.text.secondary, marginTop: spacing.md },
    aiResponseScroll: { maxHeight: 300 },
    aiResponseText: { fontSize: 14, color: colors.text.primary, lineHeight: 22 },
    modalClose: {
      marginTop: spacing.lg, alignItems: 'center',
      paddingVertical: spacing.md, backgroundColor: colors.elevated,
      borderRadius: radius.md,
    },
    modalCloseText: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  });
