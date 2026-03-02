import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../../../src/theme/colors';
import { spacing, radius } from '../../../src/theme/spacing';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { useAuthStore } from '../../../src/stores/authStore';
import { AppIcon } from '../../../src/hooks/useIcon';
import { ErrorState } from '../../../src/components/shared/ErrorState';
import { SkeletonCard } from '../../../src/components/skeletons/Skeleton';
import { formatCurrency, maskValue } from '../../../src/utils/formatters';
import { fetchMemberProfile, isDemoMode } from '../../../src/services/api';
import { logger } from '../../../src/utils/logger';

// =============================================================================
// Constants
// =============================================================================

const ROLE_COLORS: Record<string, string> = {
  owner: '#FFD700',
  admin: '#00D4AA',
  member: '#3A86FF',
  viewer: '#64748B',
  spouse: '#45B7D1',
  child: '#FFD93D',
};

const CLASS_COLORS: Record<string, string> = {
  fixedIncome: '#3A86FF',
  stocks: '#00D4AA',
  international: '#A855F7',
  realEstate: '#FF6B6B',
  crypto: '#FFD93D',
  pension: '#60A5FA',
};

// =============================================================================
// Component
// =============================================================================

type TabKey = 'home' | 'cards';

export default function MemberPortfolioScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ userId: string; name?: string }>();
  const t = useSettingsStore((s) => s.t);
  const colors = useSettingsStore((s) => s.colors);
  const currency = useSettingsStore((s) => s.currency);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { valuesHidden } = useAuthStore();
  const isDemo = isDemoMode();

  const memberName = params.name || t('family.defaultMember');
  const memberId = params.userId;

  // State
  const [tab, setTab] = useState<TabKey>('home');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const display = useCallback(
    (value: number) => valuesHidden ? maskValue('', currency) : formatCurrency(value, currency),
    [valuesHidden, currency],
  );

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    try {
      setError(null);
      if (!memberId) {
        setError('No member ID');
        return;
      }
      const profile = await fetchMemberProfile(memberId);
      setData(profile);
    } catch (err: any) {
      logger.log('[MemberPortfolio] Error:', err?.message);
      setError(err?.message || 'Error loading member profile');
    }
  }, [memberId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    })();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
  }, [router]);

  // Derived
  const roleColor = ROLE_COLORS[data?.role] || ROLE_COLORS.member;
  const netWorth = data?.netWorth || 0;
  const accounts = data?.accounts || [];
  const investments = data?.investments || [];
  const cards = data?.cards || [];

  // Build allocation data from investments
  const allocations = useMemo(() => {
    if (!investments.length) return [];
    const byType: Record<string, number> = {};
    let total = 0;
    for (const inv of investments) {
      const t = inv.type || 'other';
      byType[t] = (byType[t] || 0) + inv.value;
      total += inv.value;
    }
    return Object.entries(byType).map(([type, value]) => ({
      label: type,
      value,
      pct: total > 0 ? (value / total) * 100 : 0,
      color: CLASS_COLORS[type] || colors.text.muted,
    }));
  }, [investments, colors]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppIcon name="back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {t('family.portfolioOf').replace('{name}', memberName.split(' ')[0])}
          </Text>
          {data?.role && (
            <View style={[styles.headerRoleBadge, { backgroundColor: roleColor + '30' }]}>
              <Text style={[styles.headerRoleBadgeText, { color: roleColor }]}>
                {t(`family.${data.role}`)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Tab selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'home' && styles.tabBtnActive]}
          onPress={() => { setTab('home'); Haptics.selectionAsync(); }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, tab === 'home' && styles.tabTextActive]}>
            {t('family.home')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'cards' && styles.tabBtnActive]}
          onPress={() => { setTab('cards'); Haptics.selectionAsync(); }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, tab === 'cards' && styles.tabTextActive]}>
            {t('family.cardsTab')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
              progressBackgroundColor={colors.card}
            />
          }
        >
          {tab === 'home' ? (
            <>
              {/* Portfolio summary */}
              <View style={styles.card}>
                <Text style={styles.cardLabel}>{t('family.consolidatedPatrimony')}</Text>
                <Text style={styles.cardValue}>{display(netWorth)}</Text>
              </View>

              {/* Allocations */}
              {allocations.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>{t('family.allocations')}</Text>
                  <View style={styles.allocationBar}>
                    {allocations.map((a, i) => (
                      <View
                        key={i}
                        style={[
                          styles.allocationSegment,
                          {
                            flex: a.pct || 1,
                            backgroundColor: a.color,
                            borderTopLeftRadius: i === 0 ? 4 : 0,
                            borderBottomLeftRadius: i === 0 ? 4 : 0,
                            borderTopRightRadius: i === allocations.length - 1 ? 4 : 0,
                            borderBottomRightRadius: i === allocations.length - 1 ? 4 : 0,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  {allocations.map((a, i) => (
                    <View key={i} style={styles.allocationRow}>
                      <View style={[styles.allocationDot, { backgroundColor: a.color }]} />
                      <Text style={styles.allocationLabel}>{a.label}</Text>
                      <Text style={styles.allocationValue}>{display(a.value)}</Text>
                      <Text style={styles.allocationPct}>{a.pct.toFixed(1)}%</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Institutions */}
              {accounts.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>{t('family.institutions')}</Text>
                  {accounts.map((acc: any, i: number) => (
                    <View key={i} style={styles.institutionRow}>
                      <Text style={styles.institutionName}>{acc.name}</Text>
                      <Text style={styles.institutionBalance}>{display(acc.balance)}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Empty portfolio state */}
              {!investments.length && !accounts.length && (
                <View style={styles.emptyTab}>
                  <AppIcon name="info" size={32} color={colors.text.muted} />
                  <Text style={styles.emptyTabText}>{t('family.noSharePortfolio')}</Text>
                </View>
              )}
            </>
          ) : (
            <>
              {/* Cards tab */}
              {cards.length > 0 ? (
                <>
                  {/* Summary */}
                  <View style={styles.card}>
                    <Text style={styles.cardLabel}>{t('family.totalInvoices')}</Text>
                    <Text style={styles.cardValue}>
                      {display(cards.reduce((s: number, c: any) => s + (c.used || 0), 0))}
                    </Text>
                    <Text style={styles.cardSubLabel}>{t('family.available')}</Text>
                    <Text style={[styles.cardSubValue, { color: colors.positive }]}>
                      {display(cards.reduce((s: number, c: any) => s + ((c.limit || 0) - (c.used || 0)), 0))}
                    </Text>

                    {/* Usage bar */}
                    {(() => {
                      const totalLimit = cards.reduce((s: number, c: any) => s + (c.limit || 0), 0);
                      const totalUsed = cards.reduce((s: number, c: any) => s + (c.used || 0), 0);
                      const usagePct = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
                      return (
                        <View style={styles.usageBarWrap}>
                          <View style={styles.usageBarTrack}>
                            <View
                              style={[
                                styles.usageBarFill,
                                {
                                  width: `${Math.min(usagePct, 100)}%`,
                                  backgroundColor: usagePct > 80 ? colors.negative : colors.accent,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.usageBarLabel}>
                            {t('family.usagePercent').replace('{pct}', usagePct.toFixed(0))}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>

                  {/* Card list */}
                  {cards.map((card: any, i: number) => (
                    <View key={i} style={styles.cardItem}>
                      <View style={styles.cardItemLeft}>
                        <AppIcon name="card" size={20} color={colors.accent} />
                        <View>
                          <Text style={styles.cardItemName}>{card.name}</Text>
                          <Text style={styles.cardItemLast4}>**** {card.lastFour}</Text>
                        </View>
                      </View>
                      <View style={styles.cardItemRight}>
                        <Text style={styles.cardItemInvoiceLabel}>{t('family.invoice')}</Text>
                        <Text style={styles.cardItemInvoice}>{display(card.used || 0)}</Text>
                        <Text style={styles.cardItemLimitLabel}>{t('family.limit')}</Text>
                        <Text style={styles.cardItemLimit}>{display(card.limit || 0)}</Text>
                      </View>
                    </View>
                  ))}
                </>
              ) : (
                <View style={styles.emptyTab}>
                  <AppIcon name="info" size={32} color={colors.text.muted} />
                  <Text style={styles.emptyTabText}>{t('family.noShareCards')}</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      gap: spacing.md,
    },
    backBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.xs,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text.primary,
      textAlign: 'center',
    },
    headerRoleBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.sm,
    },
    headerRoleBadgeText: {
      fontSize: 10,
      fontWeight: '600',
    },
    placeholder: {
      width: 36,
    },

    // Tab selector
    tabContainer: {
      flexDirection: 'row',
      marginHorizontal: spacing.xl,
      marginBottom: spacing.lg,
      backgroundColor: colors.elevated,
      borderRadius: radius.md,
      padding: spacing.xs,
    },
    tabBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
    },
    tabBtnActive: {
      backgroundColor: colors.accent,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    tabTextActive: {
      color: colors.background,
    },

    loadingWrap: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 100,
    },

    // Card container
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xl,
      marginBottom: spacing.lg,
    },
    cardLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text.secondary,
      marginBottom: spacing.xs,
    },
    cardValue: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
      marginBottom: spacing.md,
    },
    cardSubLabel: {
      fontSize: 12,
      color: colors.text.muted,
      marginTop: spacing.xs,
    },
    cardSubValue: {
      fontSize: 18,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },

    // Allocation
    allocationBar: {
      flexDirection: 'row',
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
      marginVertical: spacing.md,
      gap: 2,
    },
    allocationSegment: {
      height: 8,
    },
    allocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.xs,
      gap: spacing.sm,
    },
    allocationDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    allocationLabel: {
      flex: 1,
      fontSize: 13,
      color: colors.text.primary,
    },
    allocationValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    allocationPct: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.muted,
      width: 42,
      textAlign: 'right',
      fontVariant: ['tabular-nums'],
    },

    // Institutions
    institutionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border + '40',
    },
    institutionName: {
      fontSize: 14,
      color: colors.text.primary,
    },
    institutionBalance: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },

    // Usage bar
    usageBarWrap: {
      marginTop: spacing.lg,
    },
    usageBarTrack: {
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: spacing.xs,
    },
    usageBarFill: {
      height: 8,
      borderRadius: 4,
    },
    usageBarLabel: {
      fontSize: 11,
      color: colors.text.muted,
      textAlign: 'right',
    },

    // Card items
    cardItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      marginBottom: spacing.sm,
    },
    cardItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    cardItemName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
    },
    cardItemLast4: {
      fontSize: 12,
      color: colors.text.muted,
    },
    cardItemRight: {
      alignItems: 'flex-end',
    },
    cardItemInvoiceLabel: {
      fontSize: 10,
      color: colors.text.muted,
    },
    cardItemInvoice: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    cardItemLimitLabel: {
      fontSize: 10,
      color: colors.text.muted,
      marginTop: spacing.xs,
    },
    cardItemLimit: {
      fontSize: 12,
      color: colors.text.secondary,
      fontVariant: ['tabular-nums'],
    },

    // Empty tab
    emptyTab: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
      gap: spacing.md,
    },
    emptyTabText: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      paddingHorizontal: spacing.xl,
    },
  });
