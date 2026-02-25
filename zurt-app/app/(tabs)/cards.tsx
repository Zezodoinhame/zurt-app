// app/(tabs)/cards.tsx
// Tela principal de Cartões — estilo Apple Wallet
// Stack empilhado → toque expande → painel de detalhes

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
import CardDetailPanel from '../../src/components/cards/CardDetailPanel';
import MiniCardRow from '../../src/components/cards/MiniCardRow';
import SpendingCategories from '../../src/components/cards/SpendingCategories';
import { DEMO_CARDS, DEMO_SPENDING, adaptStoreCard, adaptCategorySpending } from '../../src/data/cardsData';
import type { CreditCard as VisualCreditCard, SpendingCategory as VisualSpendingCategory } from '../../src/data/cardsData';
import { useCardsStore } from '../../src/stores/cardsStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useAgentStore } from '../../src/stores/agentStore';
import { type ThemeColors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { formatCurrency, maskValue } from '../../src/utils/formatters';
import { SkeletonCard, SkeletonList } from '../../src/components/skeletons/Skeleton';
import { ErrorState } from '../../src/components/shared/ErrorState';
import { AIMarkdown } from '../../src/components/shared/AIMarkdown';
import { AppIcon } from '../../src/hooks/useIcon';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_H = 210;
const COLLAPSED_VISIBLE = 72;

type Tab = 'cartoes' | 'categorias';

export default function CardsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('cartoes');
  const scrollRef = useRef<ScrollView>(null);

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

  // ── AI modal ──
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // ── Effects ──
  useEffect(() => {
    loadCards();
  }, []);

  useEffect(() => {
    if (storeCards.length > 0) {
      loadTransactions();
    }
  }, [storeCards.length]);

  // ── Adapt data: store → visual format ──
  const visualCards: VisualCreditCard[] = useMemo(() => {
    if (isDemoMode || storeCards.length === 0) return DEMO_CARDS;
    return storeCards.map(adaptStoreCard);
  }, [isDemoMode, storeCards]);

  const visualSpending: VisualSpendingCategory[] = useMemo(() => {
    if (isDemoMode || storeSpending.length === 0) return DEMO_SPENDING;
    return adaptCategorySpending(storeSpending);
  }, [isDemoMode, storeSpending]);

  // ── Calculations ──
  const totalFaturas = visualCards.reduce((s, c) => s + c.faturaAtual, 0);
  const totalLimite = visualCards.reduce((s, c) => s + c.limiteTotal, 0);
  const totalUsado = visualCards.reduce((s, c) => s + c.limiteUsado, 0);
  const totalDisponivel = totalLimite - totalUsado;
  const pctGeral = totalLimite > 0 ? totalUsado / totalLimite : 0;

  // ── Handlers ──
  const handleCardPress = useCallback((cardId: string) => {
    if (expandedCardId === cardId) {
      setExpandedCardId(null);
    } else {
      setExpandedCardId(cardId);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  }, [expandedCardId]);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

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

  // ── Value display ──
  const displayValue = useCallback((value: number) =>
    valuesHidden ? maskValue('', currency) : formatCurrency(value, currency),
  [valuesHidden, currency]);

  const mask = useCallback((val: string) =>
    valuesHidden ? maskValue('', currency) : val,
  [valuesHidden, currency]);

  // ── Render Stack View (Apple Wallet) ──
  const renderStackView = () => (
    <View style={styles.stackContainer}>
      {visualCards.map((card, index) => {
        const marginTop = index === 0 ? 0 : -(CARD_H - COLLAPSED_VISIBLE);
        return (
          <TouchableOpacity
            key={card.id}
            activeOpacity={0.9}
            onPress={() => handleCardPress(card.id)}
            style={[styles.stackCard, { marginTop, zIndex: index + 1 }]}
          >
            <CreditCardVisual card={card} />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ── Render Expanded View ──
  const renderExpandedView = () => {
    const selectedCard = visualCards.find(c => c.id === expandedCardId);
    if (!selectedCard) return null;
    const otherCards = visualCards.filter(c => c.id !== expandedCardId);

    return (
      <View>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setExpandedCardId(null)}
          style={styles.expandedCard}
        >
          <CreditCardVisual card={selectedCard} />
        </TouchableOpacity>

        <View style={styles.detailPanelWrapper}>
          <CardDetailPanel card={selectedCard} hideValues={valuesHidden} />
        </View>

        {otherCards.length > 0 && (
          <View style={styles.otherCardsSection}>
            <Text style={styles.otherCardsTitle}>{t('cards.otherCards')}</Text>
            {otherCards.map((card) => (
              <MiniCardRow
                key={card.id}
                card={card}
                onPress={() => handleCardPress(card.id)}
                hideValues={valuesHidden}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

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
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{t('cards.title')}</Text>
            <Text style={styles.headerSubtitle}>
              {visualCards.length} {t('cards.title').toLowerCase()} {'\u2022'} {mask(formatCurrency(totalFaturas, currency))} {t('cards.inInvoices')}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => useAuthStore.setState({ valuesHidden: !valuesHidden })}
              activeOpacity={0.7}
            >
              <Ionicons
                name={valuesHidden ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color={colors.text.primary}
              />
            </TouchableOpacity>
            <LinearGradient
              colors={['#0066FF', '#00AAFF']}
              style={styles.zurtBadge}
            >
              <Text style={styles.zurtBadgeText}>Z</Text>
            </LinearGradient>
          </View>
        </View>

        {/* ── Loading state ── */}
        {isLoading ? (
          <View style={styles.contentPadding}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonList count={3} />
          </View>
        ) : error && visualCards.length === 0 && !isDemoMode ? (
          <ErrorState message={error} onRetry={loadCards} />
        ) : visualCards.length === 0 ? (
          /* ── Empty state ── */
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
            {/* ── Summary card ── */}
            <View style={styles.summaryWrapper}>
              <LinearGradient
                colors={[colors.card, colors.elevated]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.summaryCard}
              >
                <View style={styles.summaryTop}>
                  <View>
                    <Text style={styles.summaryLabel}>{t('cards.totalInvoices')}</Text>
                    <Text style={styles.summaryValue}>{mask(formatCurrency(totalFaturas, currency))}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.summaryLabel}>{t('cards.available')}</Text>
                    <Text style={[styles.summarySecondary, { color: colors.positive }]}>
                      {mask(formatCurrency(totalDisponivel, currency))}
                    </Text>
                  </View>
                </View>

                {/* Usage bar */}
                <View style={styles.summaryBarSection}>
                  <View style={styles.summaryBarLabels}>
                    <Text style={styles.summaryBarText}>
                      {(pctGeral * 100).toFixed(0)}% {t('cards.ofTotalLimit')}
                    </Text>
                    <Text style={styles.summaryBarText}>
                      {mask(formatCurrency(totalLimite, currency))}
                    </Text>
                  </View>
                  <View style={styles.summaryBarBg}>
                    <LinearGradient
                      colors={[colors.positive, colors.info]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.summaryBarFill, { width: `${Math.min(pctGeral * 100, 100)}%` }]}
                    />
                  </View>
                </View>

                {/* Bank badges */}
                <View style={styles.bankBadges}>
                  {visualCards.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.bankBadge}
                      onPress={() => handleCardPress(c.id)}
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
                      <Text style={styles.bankBadgeText}>
                        {c.banco.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </LinearGradient>
            </View>

            {/* ── Tabs ── */}
            <View style={styles.tabsWrapper}>
              <View style={styles.tabBar}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'cartoes' && styles.tabActive]}
                  onPress={() => setActiveTab('cartoes')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, activeTab === 'cartoes' && styles.tabTextActive]}>
                    {t('cards.title')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'categorias' && styles.tabActive]}
                  onPress={() => setActiveTab('categorias')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, activeTab === 'categorias' && styles.tabTextActive]}>
                    {t('cards.categories')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Content ── */}
            <View style={styles.content}>
              {activeTab === 'cartoes' && (
                expandedCardId ? renderExpandedView() : renderStackView()
              )}

              {activeTab === 'categorias' && (
                <>
                  <SpendingCategories
                    categories={visualSpending}
                    hideValues={valuesHidden}
                  />
                  {/* AI analysis button */}
                  {visualSpending.length > 0 && (
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
                  )}
                </>
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
                <AIMarkdown content={aiResponse} />
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

// ─── Styles ─────────────────────────────────────────────────

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
    contentPadding: {
      paddingHorizontal: spacing.xl,
    },

    // Header
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 8,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text.primary,
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.text.secondary,
      marginTop: 2,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    zurtBadge: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    zurtBadgeText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 16,
    },

    // Summary Card
    summaryWrapper: {
      paddingHorizontal: 20,
      paddingTop: 12,
    },
    summaryCard: {
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    summaryLabel: {
      fontSize: 11,
      color: colors.text.muted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 4,
    },
    summaryValue: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.text.primary,
      letterSpacing: -0.5,
      fontVariant: ['tabular-nums'],
    },
    summarySecondary: {
      fontSize: 18,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    summaryBarSection: {
      marginBottom: 14,
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
      gap: 8,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexWrap: 'wrap',
    },
    bankBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.border,
      borderRadius: 6,
      paddingVertical: 4,
      paddingHorizontal: 8,
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
    bankBadgeText: {
      fontSize: 10,
      color: colors.text.secondary,
    },

    // Tabs
    tabsWrapper: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.border,
      borderRadius: 12,
      padding: 3,
      gap: 2,
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

    // Content
    content: {
      paddingHorizontal: 20,
    },

    // Stack
    stackContainer: {
      alignItems: 'center',
    },
    stackCard: {
      alignSelf: 'center',
    },

    // Expanded
    expandedCard: {
      alignSelf: 'center',
    },
    detailPanelWrapper: {
      marginTop: 0,
      marginBottom: 16,
    },
    otherCardsSection: {
      marginTop: 4,
    },
    otherCardsTitle: {
      fontSize: 13,
      color: colors.text.muted,
      marginBottom: 12,
      paddingLeft: 4,
    },

    // Empty state
    emptyState: {
      flex: 1,
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

    // AI button
    aiButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    aiButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },

    // AI Modal
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
      maxHeight: '70%',
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
    aiLoadingContainer: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    aiLoadingText: {
      fontSize: 14,
      color: colors.text.secondary,
      marginTop: spacing.md,
    },
    aiResponseScroll: {
      maxHeight: 300,
    },
    modalClose: {
      marginTop: spacing.lg,
      alignItems: 'center',
      paddingVertical: spacing.md,
      backgroundColor: colors.elevated,
      borderRadius: radius.md,
    },
    modalCloseText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
    },
  });
