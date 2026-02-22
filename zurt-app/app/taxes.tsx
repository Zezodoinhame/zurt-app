// =============================================================================
// ZURT Wealth Intelligence - Tax Calculation Screen
// Brazilian investment tax calculator with DARF generation and AI analysis
// =============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { AppIcon } from '../src/hooks/useIcon';
import { usePortfolioStore } from '../src/stores/portfolioStore';
import { sendAIChat } from '../src/services/api';
import {
  calculateTaxes,
  getRendaFixaAliquota,
  isAcoesIsento,
  isCriptoIsento,
  type TaxResult,
} from '../src/utils/taxCalculator';

// =============================================================================
// Helpers
// =============================================================================

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });

const MONTH_NAMES_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

function getMonthLabel(month: number, year: number): string {
  return `${MONTH_NAMES_SHORT[month - 1]}/${year}`;
}

function buildMonthOptions(): { month: number; year: number }[] {
  const now = new Date();
  const result: { month: number; year: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ month: d.getMonth() + 1, year: d.getFullYear() });
  }
  return result;
}

// =============================================================================
// Main Screen Component
// =============================================================================

export default function TaxesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useSettingsStore((s) => s.t);
  const colors = useSettingsStore((s) => s.colors);
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { assets } = usePortfolioStore();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });
  const [askingAI, setAskingAI] = useState(false);

  const monthOptions = useMemo(() => buildMonthOptions(), []);

  // Calculate taxes - portfolioStore does not have transactions on state,
  // so we pass an empty array. The calculator handles this gracefully.
  const taxResult: TaxResult = useMemo(() => {
    return calculateTaxes([], assets ?? [], selectedMonth);
  }, [assets, selectedMonth]);

  // ---- Handlers ----

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [router]);

  const handleMonthSelect = useCallback(
    (m: { month: number; year: number }) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedMonth(m);
    },
    [],
  );

  const handleGenerateDARF = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL('https://sicalc.receita.economia.gov.br/sicalc/principal');
  }, []);

  const handleAskAI = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAskingAI(true);
    try {
      const monthLabel = getMonthLabel(selectedMonth.month, selectedMonth.year);
      const contextMessage =
        `Analise minha situacao tributaria do mes ${monthLabel}. ` +
        `Resumo: IR total estimado: ${fmt(taxResult.totalIR)}. ` +
        `Acoes - Vendas: ${fmt(taxResult.rendaVariavel.vendasMes)}, ` +
        `Lucro: ${fmt(taxResult.rendaVariavel.lucro)}, ` +
        `IR devido: ${fmt(taxResult.rendaVariavel.irDevido)}, ` +
        `Isento: ${taxResult.rendaVariavel.isento ? 'Sim' : 'Nao'}. ` +
        `FIIs - Rendimentos: ${fmt(taxResult.fiis.rendimentos)}, ` +
        `Lucro venda: ${fmt(taxResult.fiis.lucroVenda)}, ` +
        `IR devido: ${fmt(taxResult.fiis.irDevido)}. ` +
        `Renda Fixa - Rendimentos: ${fmt(taxResult.rendaFixa.rendimentos)}, ` +
        `IR retido: ${fmt(taxResult.rendaFixa.irRetido)}. ` +
        `Cripto - Vendas: ${fmt(taxResult.cripto.vendasMes)}, ` +
        `IR devido: ${fmt(taxResult.cripto.irDevido)}, ` +
        `Isento: ${taxResult.cripto.isento ? 'Sim' : 'Nao'}. ` +
        `Me de orientacoes sobre como otimizar meus impostos e se preciso emitir DARF.`;

      await sendAIChat(contextMessage);
      router.push('/(tabs)/agent');
    } catch {
      // Silently fail - user can try again
    } finally {
      setAskingAI(false);
    }
  }, [selectedMonth, taxResult, router]);

  // ---- Render ----

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <AppIcon name="back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.headerBarTitle}>
            {t('taxes.title')}
          </Text>
          <AppIcon name="taxes" size={18} color={colors.text.primary} />
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Month Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthSelectorContent}
          style={styles.monthSelector}
        >
          {monthOptions.map((m) => {
            const isSelected =
              m.month === selectedMonth.month && m.year === selectedMonth.year;
            return (
              <TouchableOpacity
                key={`${m.month}-${m.year}`}
                style={[styles.monthPill, isSelected && styles.monthPillActive]}
                onPress={() => handleMonthSelect(m)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.monthPillText,
                    isSelected && styles.monthPillTextActive,
                  ]}
                >
                  {getMonthLabel(m.month, m.year)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Card 1: Monthly Tax Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {t('taxes.monthSummary')}
          </Text>

          <Text style={styles.totalIRValue}>{fmt(taxResult.totalIR)}</Text>
          <Text style={styles.totalIRLabel}>{t('taxes.totalEstimated')}</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('taxes.paymentDeadline')}</Text>
            <Text style={styles.summaryValue}>
              {t('taxes.deadlineDesc')}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('taxes.status')}</Text>
            {taxResult.totalIR === 0 ? (
              <View style={[styles.badge, styles.badgeGreen]}>
                <Text style={styles.badgeGreenText}>
                  {t('taxes.upToDate')}
                </Text>
              </View>
            ) : (
              <View style={[styles.badge, styles.badgeYellow]}>
                <Text style={styles.badgeYellowText}>
                  {t('taxes.pending')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Card 2: Stocks (Renda Variavel) */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>
              {t('taxes.stocks')}
            </Text>
            {taxResult.rendaVariavel.isento ? (
              <View style={[styles.chipBadge, styles.chipGreen]}>
                <Text style={styles.chipGreenText}>
                  {t('taxes.exempt')}
                </Text>
              </View>
            ) : (
              <View style={[styles.chipBadge, styles.chipYellow]}>
                <Text style={styles.chipYellowText}>
                  {t('taxes.taxable')}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>
              {t('taxes.sales')}
            </Text>
            <Text style={styles.dataValue}>
              {fmt(taxResult.rendaVariavel.vendasMes)}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>
              {t('taxes.profit')}
            </Text>
            <Text
              style={[
                styles.dataValue,
                taxResult.rendaVariavel.lucro >= 0
                  ? styles.textPositive
                  : styles.textNegative,
              ]}
            >
              {fmt(taxResult.rendaVariavel.lucro)}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>
              {t('taxes.accLoss')}
            </Text>
            <Text style={styles.dataValue}>
              {fmt(taxResult.rendaVariavel.prejuizoAcumulado)}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>{t('taxes.irDue')}</Text>
            {taxResult.rendaVariavel.isento ? (
              <View style={[styles.badge, styles.badgeGreen]}>
                <Text style={styles.badgeGreenText}>{t('taxes.exempt')}</Text>
              </View>
            ) : (
              <Text style={styles.dataValue}>
                {fmt(taxResult.rendaVariavel.irDevido)}
              </Text>
            )}
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>{t('taxes.rate')}</Text>
            <Text style={styles.dataValue}>
              {(taxResult.rendaVariavel.aliquota * 100).toFixed(0)}% ({t('taxes.swingTrade')})
            </Text>
          </View>

          <View style={styles.infoNote}>
            <Text style={styles.infoNoteText}>
              {t('taxes.exemptNote')}
            </Text>
          </View>
        </View>

        {/* Card 3: FIIs */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {t('taxes.fiis')}
          </Text>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>{t('taxes.income')}</Text>
            <View style={styles.rowValueBadge}>
              <Text style={styles.dataValue}>
                {fmt(taxResult.fiis.rendimentos)}
              </Text>
              <View style={[styles.miniBadge, styles.badgeGreen]}>
                <Text style={styles.badgeGreenText}>{t('taxes.exemptPlural')}</Text>
              </View>
            </View>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>{t('taxes.saleProfit')}</Text>
            <Text style={styles.dataValue}>
              {fmt(taxResult.fiis.lucroVenda)}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>{t('taxes.irDue20')}</Text>
            <Text style={styles.dataValue}>
              {fmt(taxResult.fiis.irDevido)}
            </Text>
          </View>

          <View style={styles.infoNote}>
            <Text style={styles.infoNoteText}>
              {t('taxes.fiisNote')}
            </Text>
          </View>
        </View>

        {/* Card 4: Fixed Income (Renda Fixa) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {t('taxes.fixedIncome')}
          </Text>

          <Text style={styles.sectionSubtitle}>
            {t('taxes.regressiveTable')}
          </Text>

          {/* Regressive tax table */}
          <View style={styles.taxTable}>
            <View style={styles.taxTableHeader}>
              <Text style={[styles.taxTableHeaderText, { flex: 2 }]}>
                {t('taxes.term')}
              </Text>
              <Text
                style={[
                  styles.taxTableHeaderText,
                  { flex: 1, textAlign: 'right' },
                ]}
              >
                {t('taxes.rate')}
              </Text>
            </View>
            {[
              { label: t('taxes.termUpTo180'), rate: '22,5%' },
              { label: t('taxes.term181_360'), rate: '20%' },
              { label: t('taxes.term361_720'), rate: '17,5%' },
              { label: t('taxes.termOver720'), rate: '15%' },
            ].map((tier, idx) => (
              <View
                key={tier.label}
                style={[
                  styles.taxTableRow,
                  idx % 2 === 0
                    ? styles.taxTableRowEven
                    : styles.taxTableRowOdd,
                ]}
              >
                <Text style={[styles.taxTableCell, { flex: 2 }]}>
                  {tier.label}
                </Text>
                <Text
                  style={[
                    styles.taxTableCellBold,
                    { flex: 1, textAlign: 'right' },
                  ]}
                >
                  {tier.rate}
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.dataRow, { marginTop: spacing.md }]}>
            <Text style={styles.dataLabel}>{t('taxes.withheldTax')}</Text>
            <Text style={styles.dataValue}>
              {fmt(taxResult.rendaFixa.irRetido)}
            </Text>
          </View>

          <View style={styles.infoNote}>
            <Text style={styles.infoNoteText}>
              {t('taxes.exempt_list_full')}
            </Text>
          </View>
        </View>

        {/* Card 5: Crypto */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>
              {t('taxes.crypto')}
            </Text>
            {taxResult.cripto.isento ? (
              <View style={[styles.chipBadge, styles.chipGreen]}>
                <Text style={styles.chipGreenText}>
                  {t('taxes.exempt')}
                </Text>
              </View>
            ) : (
              <View style={[styles.chipBadge, styles.chipYellow]}>
                <Text style={styles.chipYellowText}>
                  {t('taxes.taxable')}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>
              {t('taxes.sales')}
            </Text>
            <Text style={styles.dataValue}>
              {fmt(taxResult.cripto.vendasMes)}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>{t('taxes.irDue')}</Text>
            <Text style={styles.dataValue}>
              {fmt(taxResult.cripto.irDevido)}
            </Text>
          </View>

          <View style={styles.infoNote}>
            <Text style={styles.infoNoteText}>
              {t('taxes.cryptoNote')}
            </Text>
          </View>
        </View>

        {/* Buttons */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleGenerateDARF}
          activeOpacity={0.8}
        >
          <AppIcon name="report" size={20} color={colors.background} />
          <Text style={styles.primaryButtonText}>{t('taxes.generateDARF')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleAskAI}
          activeOpacity={0.8}
          disabled={askingAI}
        >
          {askingAI ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <>
              <AppIcon name="agent" size={20} color={colors.accent} />
              <Text style={styles.secondaryButtonText}>
                {t('taxes.askAI')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Bottom spacing */}
        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
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
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backIcon: {
      fontSize: 22,
      color: colors.text.primary,
    },
    headerBarTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
    },

    // Scroll
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.xl,
    },

    // Month Selector
    monthSelector: {
      marginBottom: spacing.xl,
      marginHorizontal: -spacing.xl,
    },
    monthSelectorContent: {
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
    },
    monthPill: {
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.full,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    monthPillActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent + '15',
    },
    monthPillText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    monthPillTextActive: {
      color: colors.accent,
    },

    // Card
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xl,
      marginBottom: spacing.lg,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.md,
    },
    sectionSubtitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.secondary,
      marginBottom: spacing.md,
    },

    // Total IR
    totalIRValue: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
    totalIRLabel: {
      fontSize: 13,
      color: colors.text.muted,
      marginBottom: spacing.lg,
    },

    // Summary rows
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderTopWidth: 0.5,
      borderTopColor: colors.border,
    },
    summaryLabel: {
      fontSize: 13,
      color: colors.text.secondary,
    },
    summaryValue: {
      fontSize: 13,
      color: colors.text.primary,
      fontWeight: '500',
      flexShrink: 1,
      textAlign: 'right',
      maxWidth: '60%',
    },

    // Data rows
    dataRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    dataLabel: {
      fontSize: 14,
      color: colors.text.secondary,
    },
    dataValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
    },
    rowValueBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    textPositive: {
      color: colors.positive,
    },
    textNegative: {
      color: colors.negative,
    },

    // Badges
    badge: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
    },
    badgeGreen: {
      backgroundColor: colors.positive + '20',
    },
    badgeGreenText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.positive,
    },
    badgeYellow: {
      backgroundColor: colors.warning + '20',
    },
    badgeYellowText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.warning,
    },
    miniBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.sm,
    },

    // Chip badges (for card header)
    chipBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
      marginBottom: spacing.md,
    },
    chipGreen: {
      backgroundColor: colors.positive + '20',
    },
    chipGreenText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.positive,
    },
    chipYellow: {
      backgroundColor: colors.warning + '20',
    },
    chipYellowText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.warning,
    },

    // Info note
    infoNote: {
      marginTop: spacing.md,
      paddingLeft: spacing.md,
      borderLeftWidth: 3,
      borderLeftColor: colors.accent + '60',
    },
    infoNoteText: {
      fontSize: 12,
      color: colors.text.muted,
      lineHeight: 18,
    },

    // Tax table
    taxTable: {
      borderRadius: radius.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    taxTableHeader: {
      flexDirection: 'row',
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.cardAlt,
    },
    taxTableHeaderText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text.secondary,
      textTransform: 'uppercase',
    },
    taxTableRow: {
      flexDirection: 'row',
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
    },
    taxTableRowEven: {
      backgroundColor: colors.card,
    },
    taxTableRowOdd: {
      backgroundColor: colors.cardAlt,
    },
    taxTableCell: {
      fontSize: 13,
      color: colors.text.secondary,
    },
    taxTableCellBold: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text.primary,
    },

    // Buttons
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg + 2,
      paddingHorizontal: spacing.xxl,
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    primaryButtonEmoji: {
      fontSize: 20,
    },
    primaryButtonText: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.background,
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: colors.accent,
      paddingVertical: spacing.lg + 2,
      paddingHorizontal: spacing.xxl,
      gap: spacing.sm,
    },
    secondaryButtonEmoji: {
      fontSize: 20,
    },
    secondaryButtonText: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.accent,
    },
  });
