import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  LayoutAnimation,
  UIManager,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { type ThemeColors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { useCardsStore } from '../../src/stores/cardsStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { formatCurrency, maskValue } from '../../src/utils/formatters';
import { AppIcon } from '../../src/hooks/useIcon';
import { SkeletonCard, SkeletonList } from '../../src/components/skeletons/Skeleton';
import { ErrorState } from '../../src/components/shared/ErrorState';
import { usePlanStore } from '../../src/stores/planStore';
import { exportService, type CardExpenseRow } from '../../src/services/exportService';
import { useRouter } from 'expo-router';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ---------------------------------------------------------------------------
// Display types
// ---------------------------------------------------------------------------

interface CardDisplay {
  id: string;
  name: string;
  lastFour: string;
  brand: string;
  invoice: number;
  limit: number;
  dueDate: string;
  color: string;
  gradientEnd: string;
  accentColor: string;
}

interface CategoryDisplay {
  name: string;
  icon: string;
  value: number;
  pct: number;
  color: string;
}

interface TxDisplay {
  name: string;
  time: string;
  value: number;
  icon: string;
}

// ---------------------------------------------------------------------------
// Emoji maps
// ---------------------------------------------------------------------------

const CAT_EMOJI: Record<string, string> = {
  food: '\uD83C\uDF55',
  transport: '\uD83D\uDE97',
  subscriptions: '\uD83D\uDCF1',
  shopping: '\uD83D\uDECD\uFE0F',
  fuel: '\u26FD',
  health: '\uD83D\uDC8A',
  travel: '\u2708\uFE0F',
  tech: '\uD83D\uDCBB',
};

// ---------------------------------------------------------------------------
// Placeholder data (used when store is empty)
// ---------------------------------------------------------------------------

const FALLBACK_CARDS: CardDisplay[] = [
  {
    id: 'fb1',
    name: 'BTG Pactual',
    lastFour: '4921',
    brand: 'Mastercard',
    invoice: 66.2,
    limit: 15000,
    dueDate: '15 Mar',
    color: '#001845',
    gradientEnd: '#001845CC',
    accentColor: '#0066FF',
  },
  {
    id: 'fb2',
    name: 'Itaú',
    lastFour: '8834',
    brand: 'Visa',
    invoice: 21498.36,
    limit: 45000,
    dueDate: '22 Mar',
    color: '#FF6B00',
    gradientEnd: '#FF6B00CC',
    accentColor: '#FF8C00',
  },
];

const FALLBACK_CATEGORIES: CategoryDisplay[] = [
  { name: 'Alimentação', icon: '\uD83C\uDF55', value: 2847.3, pct: 28, color: '#F59E0B' },
  { name: 'Transporte', icon: '\uD83D\uDE97', value: 1890.0, pct: 19, color: '#3B82F6' },
  { name: 'Assinaturas', icon: '\uD83D\uDCF1', value: 1245.6, pct: 12, color: '#8B5CF6' },
  { name: 'Compras', icon: '\uD83D\uDECD\uFE0F', value: 3100.0, pct: 31, color: '#EC4899' },
];

const FALLBACK_TX: TxDisplay[] = [
  { name: 'iFood', value: 45.9, time: 'Hoje, 13:42', icon: '\uD83C\uDF55' },
  { name: 'Uber', value: 23.5, time: 'Hoje, 10:15', icon: '\uD83D\uDE97' },
  { name: 'Amazon Prime', value: 14.9, time: 'Ontem', icon: '\uD83D\uDCF1' },
  { name: 'Mercado Livre', value: 189.9, time: '24 Fev', icon: '\uD83D\uDECD\uFE0F' },
];

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const formatCardDate = (raw: string): string => {
  if (!raw) return '--';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

const formatTxDate = (raw: string): string => {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0)
    return `Hoje, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (diffDays === 1) return 'Ontem';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

// ===========================================================================
// CardsScreen — Wallet Stack
// ===========================================================================

export default function CardsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useSettingsStore((s) => s.colors);
  const { currency } = useSettingsStore();
  const { valuesHidden } = useAuthStore();
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
  } = useCardsStore();

  const checkLimit = usePlanStore((s) => s.checkLimit);
  const { t } = useSettingsStore();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  // ---- Effects ------------------------------------------------------------
  useEffect(() => {
    loadCards();
    loadTransactions();
  }, []);

  // ---- Handlers -----------------------------------------------------------
  const handleToggleCard = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCard((prev) => (prev === index ? null : index));
  }, []);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    refresh();
  }, [refresh]);

  const handleExportCSV = useCallback(async () => {
    if (!checkLimit('exportData')) {
      Alert.alert(
        t('export.proRequired'),
        t('export.upgradeMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('export.seePlans'), onPress: () => router.push('/plans') },
        ],
      );
      return;
    }
    try {
      const rows: CardExpenseRow[] = dashboardTransactions.map((tx) => ({
        date: tx.date,
        description: tx.description || tx.merchant || '',
        category: tx.category || '',
        amount: Math.abs(tx.amount),
        card: tx.account_name || tx.institution_name || '',
      }));
      await exportService.exportCardExpensesCSV(rows);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message ?? 'Export failed');
    }
  }, [dashboardTransactions, checkLimit, t, router]);

  // ---- Derived data -------------------------------------------------------
  const displayCards: CardDisplay[] = useMemo(() => {
    if (cards.length > 0) {
      return cards.map((c) => ({
        id: c.id,
        name: c.name,
        lastFour: c.lastFour,
        brand: c.brand,
        invoice: Math.abs(c.currentInvoice),
        limit: c.limit,
        dueDate: formatCardDate(c.dueDate),
        color: c.color || '#0D1520',
        gradientEnd: c.secondaryColor || (c.color ? c.color + 'CC' : '#0D1520CC'),
        accentColor: c.color || '#00D4AA',
      }));
    }
    return FALLBACK_CARDS;
  }, [cards]);

  const displayCategories: CategoryDisplay[] = useMemo(() => {
    if (categorySpending.length > 0) {
      return categorySpending.map((c) => ({
        name: c.label,
        icon: CAT_EMOJI[c.category] || c.icon || '\uD83D\uDCCA',
        value: c.total,
        pct: c.percentage,
        color: c.color,
      }));
    }
    return FALLBACK_CATEGORIES;
  }, [categorySpending]);

  const displayTx: TxDisplay[] = useMemo(() => {
    if (dashboardTransactions.length > 0) {
      return dashboardTransactions.slice(0, 5).map((tx) => ({
        name: tx.description || tx.merchant || 'Transação',
        time: formatTxDate(tx.date),
        value: Math.abs(tx.amount),
        icon: CAT_EMOJI[tx.category || ''] || '\uD83D\uDCB3',
      }));
    }
    return FALLBACK_TX;
  }, [dashboardTransactions]);

  const totalInvoice = displayCards.reduce((s, c) => s + c.invoice, 0);
  const totalLimit = displayCards.reduce((s, c) => s + c.limit, 0);
  const availableLimit = totalLimit - totalInvoice;

  // ---- Display helpers ----------------------------------------------------
  const fmtVal = (v: number) => (valuesHidden ? maskValue('') : formatCurrency(v, currency));

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
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
          <Text style={styles.headerTitle}>Cartões</Text>
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.7}>
            <AppIcon name="add" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* ---------------------------------------------------------------- */}
        {/* Loading / Error                                                  */}
        {/* ---------------------------------------------------------------- */}
        {isLoading ? (
          <View style={styles.padH}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonList count={4} />
          </View>
        ) : error && cards.length === 0 ? (
          <View style={styles.padH}>
            <ErrorState message={error} onRetry={loadCards} />
          </View>
        ) : (
          <>
            {/* -------------------------------------------------------------- */}
            {/* Summary                                                        */}
            {/* -------------------------------------------------------------- */}
            <View style={styles.summary}>
              <View>
                <Text style={styles.summaryLabelUpper}>FATURA TOTAL</Text>
                <Text style={styles.summaryValue}>{fmtVal(totalInvoice)}</Text>
              </View>
              <View style={styles.summaryRight}>
                <Text style={styles.summaryLabel}>Limite disponível</Text>
                <Text style={styles.summaryLimitVal}>{fmtVal(availableLimit)}</Text>
              </View>
            </View>

            {/* -------------------------------------------------------------- */}
            {/* Wallet Stack — Stacked Cards                                   */}
            {/* -------------------------------------------------------------- */}
            <View style={styles.cardsStack}>
              {displayCards.map((card, i) => {
                const isExp = expandedCard === i;
                const usage = card.limit > 0 ? card.invoice / card.limit : 0;

                return (
                  <TouchableOpacity
                    key={card.id}
                    activeOpacity={0.95}
                    onPress={() => handleToggleCard(i)}
                    style={[
                      styles.cardWrap,
                      {
                        marginTop: i === 0 ? 0 : expandedCard === null ? -28 : 8,
                        zIndex: isExp ? 10 : displayCards.length - i,
                        borderColor: isExp ? card.accentColor + '60' : colors.border,
                        transform: [{ scale: isExp ? 1.02 : 1 }],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={[card.color, card.gradientEnd]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.cardFace, { paddingVertical: isExp ? 16 : 14 }]}
                    >
                      {/* Top: bank name + digits + flag */}
                      <View style={styles.cardTopRow}>
                        <Text style={styles.cardBank}>{card.name}</Text>
                        <View style={styles.cardTopRight}>
                          <Text style={styles.cardDigits}>
                            {'\u2022\u2022\u2022\u2022 '}{card.lastFour}
                          </Text>
                          <View style={styles.flagBadge}>
                            <Text style={styles.flagText}>{card.brand}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Bottom: invoice + due date */}
                      <View style={styles.cardBottomRow}>
                        <View>
                          <Text style={styles.invoiceLabel}>FATURA ATUAL</Text>
                          <Text
                            style={[
                              styles.invoiceValue,
                              { fontSize: isExp ? 24 : 20 },
                            ]}
                          >
                            {fmtVal(card.invoice)}
                          </Text>
                        </View>
                        <View style={styles.dueCol}>
                          <Text style={styles.dueLabel}>Venc.</Text>
                          <Text style={styles.dueValue}>{card.dueDate}</Text>
                        </View>
                      </View>

                      {/* Usage bar */}
                      <View style={styles.usageWrap}>
                        <View style={styles.usageBarBg}>
                          <View
                            style={[
                              styles.usageBarFill,
                              {
                                width: `${Math.min(usage * 100, 100)}%`,
                                backgroundColor:
                                  usage > 0.8
                                    ? '#FF4D4D'
                                    : 'rgba(255,255,255,0.5)',
                              },
                            ]}
                          />
                        </View>
                        <View style={styles.usageLabels}>
                          <Text style={styles.usageText}>
                            {valuesHidden
                              ? '\u2022\u2022%'
                              : `${(usage * 100).toFixed(0)}% usado`}
                          </Text>
                          <Text style={styles.usageText}>
                            Limite {fmtVal(card.limit)}
                          </Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* -------------------------------------------------------------- */}
            {/* Gastos por Categoria                                           */}
            {/* -------------------------------------------------------------- */}
            <View style={styles.catSection}>
              <View style={styles.secHeader}>
                <Text style={styles.secTitle}>Gastos por categoria</Text>
                <View style={styles.secHeaderRight}>
                  <TouchableOpacity style={styles.csvBtn} onPress={handleExportCSV} activeOpacity={0.7}>
                    <AppIcon name="share" size={14} color={colors.accent} />
                    <Text style={styles.csvBtnText}>CSV</Text>
                  </TouchableOpacity>
                  <TouchableOpacity>
                    <Text style={styles.secAction}>Este mês ›</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {displayCategories.map((cat, i) => (
                <View key={i} style={styles.catRow}>
                  <Text style={styles.catEmoji}>{cat.icon}</Text>
                  <View style={styles.catInfo}>
                    <View style={styles.catTextRow}>
                      <Text style={styles.catName}>{cat.name}</Text>
                      <Text style={styles.catVal}>{fmtVal(cat.value)}</Text>
                    </View>
                    <View style={styles.catBarBg}>
                      <View
                        style={[
                          styles.catBarFill,
                          {
                            width: `${Math.min(cat.pct, 100)}%`,
                            backgroundColor: cat.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* -------------------------------------------------------------- */}
            {/* Transações Recentes                                          */}
            {/* -------------------------------------------------------------- */}
            <View style={styles.txSection}>
              <Text style={styles.txTitle}>Transações recentes</Text>

              {displayTx.map((tx, i) => (
                <View key={i} style={styles.txRow}>
                  <View style={styles.txIconWrap}>
                    <Text style={styles.txIcon}>{tx.icon}</Text>
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txName}>{tx.name}</Text>
                    <Text style={styles.txTime}>{tx.time}</Text>
                  </View>
                  <Text style={styles.txValue}>{fmtVal(tx.value)}</Text>
                </View>
              ))}
            </View>
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
    padH: {
      paddingHorizontal: 20,
    },

    // -- Header ---------------------------------------------------------------
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text.primary,
    },
    addBtn: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // -- Summary --------------------------------------------------------------
    summary: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingVertical: 16,
      paddingHorizontal: 20,
    },
    summaryLabelUpper: {
      fontSize: 10,
      letterSpacing: 2,
      color: colors.text.muted,
      marginBottom: 4,
    },
    summaryLabel: {
      fontSize: 10,
      color: colors.text.muted,
      marginBottom: 4,
    },
    summaryValue: {
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -1,
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    summaryRight: {
      alignItems: 'flex-end',
    },
    summaryLimitVal: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.accent,
      fontVariant: ['tabular-nums'],
    },

    // -- Cards Stack ----------------------------------------------------------
    cardsStack: {
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    cardWrap: {
      borderRadius: 20,
      overflow: 'hidden',
      borderWidth: 1,
    },
    cardFace: {
      paddingHorizontal: 18,
    },
    cardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    cardBank: {
      fontSize: 12,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.7)',
    },
    cardTopRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardDigits: {
      fontSize: 11,
      color: 'rgba(255,255,255,0.4)',
    },
    flagBadge: {
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    flagText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#fff',
    },
    cardBottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    invoiceLabel: {
      fontSize: 9,
      letterSpacing: 1,
      color: 'rgba(255,255,255,0.4)',
      marginBottom: 4,
    },
    invoiceValue: {
      fontWeight: '800',
      color: '#fff',
      fontVariant: ['tabular-nums'],
    },
    dueCol: {
      alignItems: 'flex-end',
    },
    dueLabel: {
      fontSize: 9,
      color: 'rgba(255,255,255,0.4)',
      marginBottom: 4,
    },
    dueValue: {
      fontSize: 12,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.8)',
    },
    usageWrap: {
      marginTop: 10,
    },
    usageBarBg: {
      height: 4,
      borderRadius: 2,
      backgroundColor: 'rgba(255,255,255,0.1)',
      overflow: 'hidden',
    },
    usageBarFill: {
      height: 4,
      borderRadius: 2,
    },
    usageLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    usageText: {
      fontSize: 9,
      color: 'rgba(255,255,255,0.35)',
    },

    // -- Categories -----------------------------------------------------------
    catSection: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    secHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    secTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text.primary,
    },
    secHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    csvBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.accent + '40',
      backgroundColor: colors.accent + '10',
    },
    csvBtnText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.accent,
    },
    secAction: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.accent,
    },
    catRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 14,
    },
    catEmoji: {
      fontSize: 18,
    },
    catInfo: {
      flex: 1,
    },
    catTextRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    catName: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text.primary,
    },
    catVal: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    catBarBg: {
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.border,
      overflow: 'hidden',
    },
    catBarFill: {
      height: 3,
      borderRadius: 2,
    },

    // -- Transactions ---------------------------------------------------------
    txSection: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    txTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 12,
    },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    txIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.cardAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    txIcon: {
      fontSize: 16,
    },
    txInfo: {
      flex: 1,
    },
    txName: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text.primary,
    },
    txTime: {
      fontSize: 10,
      color: colors.text.muted,
      marginTop: 2,
    },
    txValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
  });
