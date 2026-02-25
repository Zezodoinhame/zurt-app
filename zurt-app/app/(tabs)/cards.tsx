// app/(tabs)/cards.tsx
// Tela principal de Cartões — Apple Wallet stack + Categorias
// Backend integration: cardsStore, authStore, settingsStore, agentStore

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Dimensions,
  StatusBar,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import CreditCardVisual from '../../src/components/cards/CreditCardVisual';
import {
  DEMO_CARDS,
  DEMO_SPENDING,
  adaptStoreCard,
  adaptCategorySpending,
} from '../../src/data/cardsData';
import type {
  CreditCard as VisualCreditCard,
  SpendingCategory as VisualSpendingCategory,
} from '../../src/data/cardsData';
import { useCardsStore } from '../../src/stores/cardsStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useAgentStore } from '../../src/stores/agentStore';
import { type ThemeColors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { formatCurrency, maskValue, getUsageColor } from '../../src/utils/formatters';
import { SkeletonCard, SkeletonList } from '../../src/components/skeletons/Skeleton';
import { ErrorState } from '../../src/components/shared/ErrorState';
import { AIMarkdown } from '../../src/components/shared/AIMarkdown';
import { AppIcon } from '../../src/hooks/useIcon';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_H = 210;
const COLLAPSED_VISIBLE = 72;

type Tab = 'cartoes' | 'categorias';

// =============================================================================
// Main component
// =============================================================================

export default function CardsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('cartoes');

  // ── Stores ──
  const {
    cards: storeCards,
    categorySpending: storeSpending,
    isLoading,
    isRefreshing,
    error,
    loadCards,
    loadTransactions,
    refresh,
  } = useCardsStore();
  const { valuesHidden, isDemoMode } = useAuthStore();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { sendMessage } = useAgentStore();

  // ── AI modal state ──
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // ── Data load ──
  useEffect(() => {
    loadCards();
  }, []);

  useEffect(() => {
    if (storeCards.length > 0) {
      loadTransactions();
    }
  }, [storeCards.length]);

  // ── Adapt store → visual ──
  const visualCards: VisualCreditCard[] = useMemo(() => {
    if (isDemoMode || storeCards.length === 0) return DEMO_CARDS;
    return storeCards.map(adaptStoreCard);
  }, [isDemoMode, storeCards]);

  const visualSpending: VisualSpendingCategory[] = useMemo(() => {
    if (isDemoMode || storeSpending.length === 0) return DEMO_SPENDING;
    return adaptCategorySpending(storeSpending);
  }, [isDemoMode, storeSpending]);

  // ── Aggregate calculations ──
  const totalFaturas = visualCards.reduce((s, c) => s + c.faturaAtual, 0);
  const totalLimite = visualCards.reduce((s, c) => s + c.limiteTotal, 0);
  const totalUsado = visualCards.reduce((s, c) => s + c.limiteUsado, 0);
  const totalDisponivel = totalLimite - totalUsado;
  const pctGeral = totalLimite > 0 ? totalUsado / totalLimite : 0;

  // ── Display helpers ──
  const display = useCallback(
    (value: number) =>
      valuesHidden ? maskValue('', currency) : formatCurrency(value, currency),
    [valuesHidden, currency],
  );

  // ── Handlers ──
  const handleCardPress = useCallback(
    (cardId: string) => {
      Haptics.selectionAsync();
      if (expandedCardId === cardId) {
        setExpandedCardId(null);
      } else {
        setExpandedCardId(cardId);
        setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
      }
    },
    [expandedCardId],
  );

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleTabChange = useCallback((tab: Tab) => {
    Haptics.selectionAsync();
    setActiveTab(tab);
    setExpandedCardId(null);
  }, []);

  const handleAnalyzeWithAI = useCallback(async () => {
    if (visualSpending.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowAiModal(true);
    setAiLoading(true);
    setAiResponse('');

    const spendingSummary = visualSpending
      .map((c) => `${c.nome}: ${formatCurrency(c.valor, currency)}`)
      .join(', ');

    try {
      await sendMessage(`${t('cards.aiAnalyzePrompt')}: ${spendingSummary}`);
      const msgs = useAgentStore.getState().messages;
      const lastAssistant = [...msgs].reverse().find((m) => m.role === 'assistant');
      setAiResponse(lastAssistant?.content ?? t('cards.aiNoResponse'));
    } catch {
      setAiResponse(t('cards.aiError'));
    } finally {
      setAiLoading(false);
    }
  }, [visualSpending, sendMessage, t, currency]);

  // =====================================================================
  // Sub-renders
  // =====================================================================

  // ── Header ──
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>{t('cards.title')}</Text>
        <Text style={styles.headerSubtitle}>
          {visualCards.length} {t('cards.title').toLowerCase()} {'\u2022'}{' '}
          {display(totalFaturas)} {t('cards.inInvoices')}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.eyeBtn}
        onPress={() => useAuthStore.setState({ valuesHidden: !valuesHidden })}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <AppIcon
          name={valuesHidden ? 'eye' : 'eye'}
          size={20}
          color={colors.text.secondary}
        />
      </TouchableOpacity>
    </View>
  );

  // ── Consolidated Summary Card ──
  const renderSummary = () => (
    <View style={styles.summaryWrapper}>
      <View style={styles.summaryCard}>
        {/* Top row: total invoices + available */}
        <View style={styles.summaryTop}>
          <View>
            <Text style={styles.summaryLabel}>{t('cards.totalInvoices')}</Text>
            <Text style={styles.summaryValue}>{display(totalFaturas)}</Text>
          </View>
          <View style={styles.summaryRight}>
            <Text style={styles.summaryLabel}>{t('cards.available')}</Text>
            <Text style={[styles.summarySecondary, { color: colors.positive }]}>
              {display(totalDisponivel)}
            </Text>
          </View>
        </View>

        {/* Usage bar */}
        <View style={styles.summaryBarSection}>
          <View style={styles.summaryBarLabels}>
            <Text style={styles.summaryBarText}>
              {(pctGeral * 100).toFixed(0)}% {t('cards.ofTotalLimit')}
            </Text>
            <Text style={styles.summaryBarText}>{display(totalLimite)}</Text>
          </View>
          <View style={styles.summaryBarBg}>
            <View
              style={[
                styles.summaryBarFill,
                {
                  width: `${Math.min(pctGeral * 100, 100)}%`,
                  backgroundColor: getUsageColor(pctGeral),
                },
              ]}
            />
          </View>
        </View>

        {/* Bank mini-badges */}
        <View style={styles.bankBadges}>
          {visualCards.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.bankBadge}
              onPress={() => {
                handleTabChange('cartoes');
                handleCardPress(c.id);
              }}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[c.gradientColors[0], c.gradientColors[1]]}
                style={styles.bankBadgeIcon}
              >
                <Text style={[styles.bankBadgeIconText, { color: c.textColor }]}>
                  {c.bancoAbrev.slice(0, 1)}
                </Text>
              </LinearGradient>
              <Text style={styles.bankBadgeLabel} numberOfLines={1}>
                {c.banco.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  // ── Tab bar ──
  const renderTabs = () => (
    <View style={styles.tabsWrapper}>
      <View style={styles.tabBar}>
        {(['cartoes', 'categorias'] as Tab[]).map((tab) => {
          const active = activeTab === tab;
          const label = tab === 'cartoes' ? t('cards.title') : t('cards.categories');
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => handleTabChange(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // ── Apple Wallet Stack (collapsed) ──
  const renderStack = () => (
    <View style={styles.stackContainer}>
      {visualCards.map((card, index) => {
        const mt = index === 0 ? 0 : -(CARD_H - COLLAPSED_VISIBLE);
        return (
          <TouchableOpacity
            key={card.id}
            activeOpacity={0.92}
            onPress={() => handleCardPress(card.id)}
            style={[styles.stackCard, { marginTop: mt, zIndex: index + 1 }]}
          >
            <CreditCardVisual card={card} />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ── Card Detail Panel (expanded) ──
  const renderDetailPanel = (card: VisualCreditCard) => {
    const disponivel = card.limiteTotal - card.limiteUsado;
    const pctUsado = card.limiteTotal > 0 ? card.limiteUsado / card.limiteTotal : 0;
    const barColor = getUsageColor(pctUsado);

    return (
      <View style={styles.detailPanel}>
        {/* Fatura + Disponível */}
        <View style={styles.detailRow}>
          <View>
            <Text style={styles.detailLabel}>{t('cards.currentInvoice')}</Text>
            <Text style={styles.detailValue}>{display(card.faturaAtual)}</Text>
          </View>
          <View style={styles.detailRight}>
            <Text style={styles.detailLabel}>{t('cards.available')}</Text>
            <Text style={[styles.detailValue, { color: colors.positive }]}>
              {display(disponivel)}
            </Text>
          </View>
        </View>

        {/* Usage bar */}
        <View style={styles.detailBarSection}>
          <View style={styles.detailBarLabels}>
            <Text style={styles.detailBarText}>
              {(pctUsado * 100).toFixed(0)}% {t('cards.used')}
            </Text>
            <Text style={styles.detailBarText}>
              {t('cards.limit')} {display(card.limiteTotal)}
            </Text>
          </View>
          <View style={styles.detailBarBg}>
            <View
              style={[
                styles.detailBarFill,
                {
                  width: `${Math.min(pctUsado * 100, 100)}%`,
                  backgroundColor: barColor,
                },
              ]}
            />
          </View>
        </View>

        {/* Dates */}
        <View style={styles.datesRow}>
          <View style={styles.dateItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.text.muted} />
            <Text style={styles.dateLabel}>{t('cards.closingLabel')}</Text>
            <Text style={styles.dateValue}>{card.fechamento}</Text>
          </View>
          <View style={styles.dateItem}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.text.muted} />
            <Text style={styles.dateLabel}>{t('cards.dueLabel')}</Text>
            <Text style={styles.dateValue}>{card.vencimento}</Text>
          </View>
        </View>

        {/* Status badge */}
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                card.faturaStatus === 'fechada'
                  ? colors.negative + '15'
                  : card.faturaStatus === 'paga'
                    ? colors.positive + '15'
                    : colors.info + '10',
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  card.faturaStatus === 'fechada'
                    ? colors.negative
                    : card.faturaStatus === 'paga'
                      ? colors.positive
                      : colors.info,
              },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              {
                color:
                  card.faturaStatus === 'fechada'
                    ? colors.negative
                    : card.faturaStatus === 'paga'
                      ? colors.positive
                      : colors.info,
              },
            ]}
          >
            {card.faturaStatus === 'fechada'
              ? t('cards.invoiceClosedPayBy').replace('{date}', card.vencimento)
              : card.faturaStatus === 'paga'
                ? t('cards.invoicePaid')
                : t('cards.invoiceOpenClosesOn').replace('{date}', card.fechamento)}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.detailActions}>
          <TouchableOpacity style={styles.btnOutline} activeOpacity={0.7}>
            <Ionicons name="receipt-outline" size={16} color={colors.text.primary} />
            <Text style={styles.btnOutlineText}>{t('cards.viewInvoice')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnFilled, { backgroundColor: colors.accent }]}
            activeOpacity={0.7}
          >
            <Ionicons name="card-outline" size={16} color={colors.background} />
            <Text style={[styles.btnFilledText, { color: colors.background }]}>
              {t('cards.pay')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Expanded card view ──
  const renderExpandedView = () => {
    const selectedCard = visualCards.find((c) => c.id === expandedCardId);
    if (!selectedCard) return null;
    const otherCards = visualCards.filter((c) => c.id !== expandedCardId);

    return (
      <View>
        {/* Selected card */}
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => setExpandedCardId(null)}
          style={styles.expandedCardWrap}
        >
          <CreditCardVisual card={selectedCard} />
        </TouchableOpacity>

        {/* Detail panel */}
        {renderDetailPanel(selectedCard)}

        {/* Other cards */}
        {otherCards.length > 0 && (
          <View style={styles.otherSection}>
            <Text style={styles.otherTitle}>{t('cards.otherCards')}</Text>
            {otherCards.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={styles.miniCard}
                onPress={() => handleCardPress(card.id)}
                activeOpacity={0.7}
              >
                <View style={styles.miniCardLeft}>
                  <LinearGradient
                    colors={card.gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.miniCardChip}
                  >
                    <Text style={[styles.miniCardChipText, { color: card.textColor }]}>
                      {card.bancoAbrev.slice(0, 2)}
                    </Text>
                  </LinearGradient>
                  <View>
                    <Text style={styles.miniCardBanco}>{card.banco}</Text>
                    <Text style={styles.miniCardDetail}>
                      {card.tipo} {'\u2022\u2022\u2022\u2022'} {card.ultimos4}
                    </Text>
                  </View>
                </View>
                <View style={styles.miniCardRight}>
                  <Text style={styles.miniCardValor}>{display(card.faturaAtual)}</Text>
                  <Text style={styles.miniCardLabel}>{t('cards.invoice')}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  // ── Tab: Categorias ──
  const renderCategorias = () => {
    const totalSpending = visualSpending.reduce((s, c) => s + c.valor, 0);

    return (
      <View>
        {/* Title + total */}
        <Text style={styles.catSectionTitle}>{t('cards.spendingByCategory')}</Text>
        <Text style={styles.catSectionSubtitle}>
          {t('cards.totalSpending')}: {display(totalSpending)}
        </Text>

        {/* Stacked bar */}
        <View style={styles.stackedBar}>
          {visualSpending.map((cat) => (
            <View
              key={cat.nome}
              style={[
                styles.barSegment,
                { width: `${cat.pct * 100}%`, backgroundColor: cat.cor },
              ]}
            />
          ))}
        </View>

        {/* Category list */}
        {visualSpending.map((cat, i) => (
          <View
            key={cat.nome}
            style={[
              styles.catRow,
              i < visualSpending.length - 1 && styles.catRowBorder,
            ]}
          >
            <View style={styles.catLeft}>
              <View style={[styles.catIcon, { backgroundColor: cat.cor + '20' }]}>
                <Ionicons name={cat.icone as any} size={16} color={cat.cor} />
              </View>
              <View>
                <Text style={styles.catNome}>{cat.nome}</Text>
                <Text style={styles.catPct}>
                  {(cat.pct * 100).toFixed(1)}% {t('cards.ofTotal')}
                </Text>
              </View>
            </View>
            <Text style={styles.catValor}>{display(cat.valor)}</Text>
          </View>
        ))}

        {/* AI analysis button */}
        {visualSpending.length > 0 && (
          <TouchableOpacity
            style={styles.aiButton}
            onPress={handleAnalyzeWithAI}
            activeOpacity={0.7}
          >
            <AppIcon name="idea" size={16} color={colors.accent} />
            <Text style={styles.aiButtonText}>{t('cards.analyzeWithAI')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // =====================================================================
  // Main render
  // =====================================================================

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle={colors.statusBar === 'light' ? 'light-content' : 'dark-content'} />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
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
        {renderHeader()}

        {/* Loading */}
        {isLoading ? (
          <View style={styles.contentPad}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonList count={3} />
          </View>
        ) : error && visualCards.length === 0 && !isDemoMode ? (
          /* Error */
          <ErrorState message={error} onRetry={loadCards} />
        ) : visualCards.length === 0 ? (
          /* Empty */
          <View style={styles.emptyState}>
            <AppIcon name="card" size={48} color={colors.text.muted} />
            <Text style={styles.emptyTitle}>{t('cards.emptyTitle')}</Text>
            <Text style={styles.emptyDesc}>{t('cards.emptyDescription')}</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/connect-bank')}
              activeOpacity={0.7}
            >
              <Text style={styles.emptyBtnText}>{t('cards.emptyButton')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {renderSummary()}
            {renderTabs()}

            <View style={styles.tabContent}>
              {activeTab === 'cartoes' &&
                (expandedCardId ? renderExpandedView() : renderStack())}
              {activeTab === 'categorias' && renderCategorias()}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── AI Analysis Modal ── */}
      <Modal
        visible={showAiModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAiModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowAiModal(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            {/* Modal title */}
            <Text style={styles.modalTitle}>{t('cards.aiAnalysisTitle')}</Text>

            {/* Modal body — scrollable */}
            {aiLoading ? (
              <View style={styles.aiLoadingWrap}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={styles.aiLoadingText}>{t('cards.aiAnalyzing')}</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.aiScroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                <AIMarkdown content={aiResponse} />
                <View style={{ height: 20 }} />
              </ScrollView>
            )}

            {/* Close button — fixed outside scroll */}
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowAiModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseBtnText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 120,
    },
    contentPad: {
      paddingHorizontal: spacing.xl,
    },

    // ── Header ──
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.xxl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    headerLeft: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text.primary,
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.text.secondary,
      marginTop: 2,
    },
    eyeBtn: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      backgroundColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── Summary Card ──
    summaryWrapper: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
    },
    summaryCard: {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    summaryRight: {
      alignItems: 'flex-end',
    },
    summaryLabel: {
      fontSize: 11,
      color: colors.text.muted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 4,
      fontWeight: '500',
    },
    summaryValue: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text.primary,
      letterSpacing: -0.5,
      fontVariant: ['tabular-nums'],
    },
    summarySecondary: {
      fontSize: 17,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    summaryBarSection: {
      marginBottom: spacing.md,
    },
    summaryBarLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    summaryBarText: {
      fontSize: 11,
      color: colors.text.muted,
    },
    summaryBarBg: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
      overflow: 'hidden',
    },
    summaryBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    bankBadges: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    bankBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.elevated,
      borderRadius: 6,
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
    },
    bankBadgeIcon: {
      width: 14,
      height: 14,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bankBadgeIconText: {
      fontSize: 7,
      fontWeight: '700',
    },
    bankBadgeLabel: {
      fontSize: 10,
      color: colors.text.secondary,
      maxWidth: 50,
    },

    // ── Tabs ──
    tabsWrapper: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.elevated,
      borderRadius: radius.md,
      padding: 3,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 10,
    },
    tabActive: {
      backgroundColor: colors.card,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text.muted,
    },
    tabTextActive: {
      color: colors.text.primary,
      fontWeight: '600',
    },

    // ── Tab content ──
    tabContent: {
      paddingHorizontal: spacing.xl,
    },

    // ── Stack (collapsed) ──
    stackContainer: {
      alignItems: 'center',
    },
    stackCard: {
      alignSelf: 'center',
    },

    // ── Expanded card view ──
    expandedCardWrap: {
      alignSelf: 'center',
    },

    // ── Detail panel ──
    detailPanel: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.xl,
      marginTop: spacing.sm,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.xl,
    },
    detailRight: {
      alignItems: 'flex-end',
    },
    detailLabel: {
      fontSize: 11,
      color: colors.text.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 4,
      fontWeight: '500',
    },
    detailValue: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    detailBarSection: {
      marginBottom: spacing.lg,
    },
    detailBarLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    detailBarText: {
      fontSize: 11,
      color: colors.text.muted,
    },
    detailBarBg: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
      overflow: 'hidden',
    },
    detailBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    datesRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    dateItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    dateLabel: {
      fontSize: 12,
      color: colors.text.muted,
    },
    dateValue: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.primary,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: radius.sm,
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    detailActions: {
      flexDirection: 'row',
      gap: 10,
    },
    btnOutline: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 13,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    btnOutlineText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.primary,
    },
    btnFilled: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 13,
      borderRadius: radius.md,
    },
    btnFilledText: {
      fontSize: 13,
      fontWeight: '600',
    },

    // ── Other cards (mini rows) ──
    otherSection: {
      marginTop: spacing.sm,
    },
    otherTitle: {
      fontSize: 13,
      color: colors.text.muted,
      marginBottom: spacing.md,
      paddingLeft: 4,
    },
    miniCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    miniCardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    miniCardChip: {
      width: 42,
      height: 28,
      borderRadius: 5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    miniCardChipText: {
      fontSize: 9,
      fontWeight: '800',
    },
    miniCardBanco: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
    },
    miniCardDetail: {
      fontSize: 11,
      color: colors.text.muted,
      marginTop: 2,
    },
    miniCardRight: {
      alignItems: 'flex-end',
    },
    miniCardValor: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    miniCardLabel: {
      fontSize: 11,
      color: colors.text.muted,
      marginTop: 2,
    },

    // ── Categorias tab ──
    catSectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 4,
    },
    catSectionSubtitle: {
      fontSize: 12,
      color: colors.text.muted,
      marginBottom: spacing.lg,
    },
    stackedBar: {
      flexDirection: 'row',
      height: 10,
      borderRadius: 5,
      overflow: 'hidden',
      marginBottom: spacing.xl,
      backgroundColor: colors.border,
    },
    barSegment: {
      height: '100%',
    },
    catRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
    },
    catRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    catLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    catIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    catNome: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.primary,
    },
    catPct: {
      fontSize: 11,
      color: colors.text.muted,
      marginTop: 2,
    },
    catValor: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },

    // ── AI button ──
    aiButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      marginTop: spacing.xl,
      gap: spacing.sm,
    },
    aiButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.accent,
    },

    // ── Empty state ──
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
      paddingHorizontal: spacing.xl,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: spacing.sm,
      marginTop: spacing.lg,
    },
    emptyDesc: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    emptyBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
    },
    emptyBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.background,
    },

    // ── AI Modal ──
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.xl,
      width: '100%',
      maxHeight: '80%',
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.lg,
      textAlign: 'center',
    },
    aiLoadingWrap: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    aiLoadingText: {
      fontSize: 14,
      color: colors.text.secondary,
      marginTop: spacing.md,
    },
    aiScroll: {
      flex: 1,
    },
    modalCloseBtn: {
      marginTop: spacing.lg,
      alignItems: 'center',
      paddingVertical: spacing.md,
      backgroundColor: colors.elevated,
      borderRadius: radius.md,
    },
    modalCloseBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
    },
  });
