import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useSubscriptionStore } from '../src/stores/subscriptionStore';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { BottomSheet } from '../src/components/shared/BottomSheet';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { AppIcon } from '../src/hooks/useIcon';
import { SkeletonList } from '../src/components/skeletons/Skeleton';
import { formatCurrency, maskValue } from '../src/utils/formatters';
import type { SubscriptionBilling, SubscriptionCategory } from '../src/types';

// =============================================================================
// Constants
// =============================================================================

const CATEGORY_COLORS: Record<SubscriptionCategory, string> = {
  entertainment: '#E50914',
  productivity: '#10A37F',
  health: '#FFD700',
  education: '#3A86FF',
  cloud: '#007AFF',
  other: '#999',
};

const CATEGORY_ICONS: Record<SubscriptionCategory, string> = {
  entertainment: '\uD83C\uDFAC',
  productivity: '\u26A1',
  health: '\uD83D\uDCAA',
  education: '\uD83D\uDCDA',
  cloud: '\u2601\uFE0F',
  other: '\uD83D\uDCCB',
};

const BILLING_OPTIONS: SubscriptionBilling[] = ['monthly', 'yearly', 'weekly'];
const CATEGORY_OPTIONS: SubscriptionCategory[] = ['entertainment', 'productivity', 'health', 'education', 'cloud', 'other'];

// =============================================================================
// SubscriptionsScreen
// =============================================================================

export default function SubscriptionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const { valuesHidden } = useAuthStore();

  const {
    subscriptions,
    isLoading,
    loadSubscriptions,
    addSubscription,
    editSubscription,
    removeSubscription,
    toggleStatus,
    getTotalMonthly,
    getTotalYearly,
    getActiveCount,
    getByCategory,
  } = useSubscriptionStore();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formBilling, setFormBilling] = useState<SubscriptionBilling>('monthly');
  const [formCategory, setFormCategory] = useState<SubscriptionCategory>('entertainment');

  useEffect(() => { loadSubscriptions(); }, []);

  const totalMonthly = useMemo(() => getTotalMonthly(), [subscriptions]);
  const totalYearly = useMemo(() => getTotalYearly(), [subscriptions]);
  const activeCount = useMemo(() => getActiveCount(), [subscriptions]);
  const categoryBreakdown = useMemo(() => getByCategory(), [subscriptions]);

  const displayVal = useCallback(
    (v: number) => (valuesHidden ? maskValue('', currency) : formatCurrency(v, currency)),
    [valuesHidden, currency],
  );

  const maxCategoryTotal = useMemo(() => {
    if (categoryBreakdown.length === 0) return 1;
    return Math.max(...categoryBreakdown.map((c) => c.total));
  }, [categoryBreakdown]);

  // =========================================================================
  // Form Handlers
  // =========================================================================

  const resetForm = useCallback(() => {
    setEditingId(null);
    setFormName('');
    setFormAmount('');
    setFormBilling('monthly');
    setFormCategory('entertainment');
  }, []);

  const handleOpenAdd = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetForm();
    setSheetVisible(true);
  }, [resetForm]);

  const handleOpenEdit = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const sub = subscriptions.find((s) => s.id === id);
    if (!sub) return;
    setEditingId(id);
    setFormName(sub.name);
    setFormAmount(String(sub.amount));
    setFormBilling(sub.billing);
    setFormCategory(sub.category);
    setSheetVisible(true);
  }, [subscriptions]);

  const handleSave = useCallback(() => {
    if (!formName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const data = {
      name: formName.trim(),
      amount: parseFloat(formAmount) || 0,
      billing: formBilling,
      category: formCategory,
      status: 'active' as const,
      nextBilling: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      icon: CATEGORY_ICONS[formCategory],
      color: CATEGORY_COLORS[formCategory],
    };
    if (editingId) {
      editSubscription(editingId, data);
    } else {
      addSubscription(data);
    }
    setSheetVisible(false);
    resetForm();
  }, [editingId, formName, formAmount, formBilling, formCategory, addSubscription, editSubscription, resetForm]);

  const handleDelete = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t('subscriptions.delete'), t('subscriptions.deleteConfirm'), [
      { text: t('subscriptions.cancel'), style: 'cancel' },
      { text: 'OK', style: 'destructive', onPress: () => removeSubscription(id) },
    ]);
  }, [removeSubscription, t]);

  // =========================================================================
  // Loading
  // =========================================================================

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <AppIcon name="back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('subscriptions.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <SkeletonList />
      </View>
    );
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('subscriptions.title')}</Text>
        <TouchableOpacity onPress={handleOpenAdd} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[styles.addButtonText, { color: accentColor }]}>+ {t('subscriptions.addSubscription')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <Card variant="glow">
          <Text style={styles.heroLabel}>{t('subscriptions.totalMonthly')}</Text>
          <Text style={styles.heroValue}>{displayVal(totalMonthly)}</Text>
          <Text style={styles.heroSubtext}>{displayVal(totalYearly)} / {t('subscriptions.year')}</Text>
          <View style={styles.heroActiveRow}>
            <Text style={styles.heroActiveLabel}>{t('subscriptions.activeCount')}</Text>
            <Badge value={String(activeCount)} variant="positive" size="sm" />
          </View>
        </Card>

        {/* Category Breakdown */}
        {categoryBreakdown.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('subscriptions.byCategory')}</Text>
            <Card style={styles.categoryCard}>
              {categoryBreakdown.map((cat) => {
                const barWidth = maxCategoryTotal > 0 ? (cat.total / maxCategoryTotal) * 100 : 0;
                const catColor = CATEGORY_COLORS[cat.category] || '#999';
                return (
                  <View key={cat.category} style={styles.categoryRow}>
                    <View style={styles.categoryLabelRow}>
                      <Text style={styles.categoryIcon}>{CATEGORY_ICONS[cat.category] || '\uD83D\uDCCB'}</Text>
                      <Text style={styles.categoryName}>{t(`subscriptions.cat_${cat.category}`)}</Text>
                      <Text style={styles.categoryTotal}>{displayVal(cat.total)}</Text>
                    </View>
                    <View style={styles.categoryBarBg}>
                      <View
                        style={[
                          styles.categoryBarFill,
                          { width: `${Math.round(barWidth)}%`, backgroundColor: catColor },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </Card>
          </>
        )}

        {/* Subscription List */}
        <Text style={styles.sectionTitle}>{t('subscriptions.list')}</Text>
        {subscriptions.map((sub, index) => {
          const isActive = sub.status === 'active';
          return (
            <TouchableOpacity
              key={sub.id}
              onPress={() => handleOpenEdit(sub.id)}
              onLongPress={() => handleDelete(sub.id)}
              activeOpacity={0.7}
            >
              <Card delay={index * 60}>
                <View style={styles.subRow}>
                  {/* Left: icon + name + category badge */}
                  <View style={styles.subLeft}>
                    <Text style={styles.subIcon}>{sub.icon || CATEGORY_ICONS[sub.category]}</Text>
                    <View style={styles.subInfo}>
                      <Text style={styles.subName}>{sub.name}</Text>
                      <Badge
                        value={t(`subscriptions.cat_${sub.category}`)}
                        variant="neutral"
                        size="sm"
                      />
                    </View>
                  </View>

                  {/* Right: amount + status badge */}
                  <View style={styles.subRight}>
                    <Text style={styles.subAmount}>{displayVal(sub.amount)}</Text>
                    <Text style={styles.subBilling}>/{t(`subscriptions.billing_${sub.billing}`)}</Text>
                    <Badge
                      value={isActive ? t('subscriptions.active') : t('subscriptions.cancelled')}
                      variant={isActive ? 'positive' : 'negative'}
                      size="sm"
                      style={styles.statusBadge}
                    />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

        {subscriptions.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{'\uD83D\uDCE6'}</Text>
            <Text style={styles.emptyText}>{t('subscriptions.empty')}</Text>
            <Text style={styles.emptySub}>{t('subscriptions.emptyCta')}</Text>
          </View>
        )}

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>

      {/* Add/Edit Sheet */}
      <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} title={editingId ? t('subscriptions.editSubscription') : t('subscriptions.addSubscription')}>
        <View style={styles.sheetContent}>
          <Input label={t('subscriptions.name')} value={formName} onChangeText={setFormName} placeholder="Ex: Netflix" />
          <Input label={t('subscriptions.amount')} value={formAmount} onChangeText={setFormAmount} keyboardType="numeric" placeholder="0.00" />

          {/* Billing Pills */}
          <Text style={styles.formLabel}>{t('subscriptions.billing')}</Text>
          <View style={styles.pillRow}>
            {BILLING_OPTIONS.map((b) => (
              <TouchableOpacity
                key={b}
                style={[styles.pill, formBilling === b && { backgroundColor: accentColor }]}
                onPress={() => setFormBilling(b)}
              >
                <Text style={[styles.pillText, formBilling === b && { color: '#FFF' }]}>{t(`subscriptions.billing_${b}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category Pills */}
          <Text style={styles.formLabel}>{t('subscriptions.category')}</Text>
          <View style={styles.categoryPillRow}>
            {CATEGORY_OPTIONS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.categoryPill, formCategory === c && { backgroundColor: accentColor }]}
                onPress={() => setFormCategory(c)}
              >
                <Text style={styles.categoryPillIcon}>{CATEGORY_ICONS[c]}</Text>
                <Text style={[styles.categoryPillLabel, formCategory === c && { color: '#FFF' }]}>{t(`subscriptions.cat_${c}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button title={editingId ? t('subscriptions.editSubscription') : t('subscriptions.addSubscription')} onPress={handleSave} style={{ marginTop: spacing.md }} />
          {editingId && (
            <Button title={t('subscriptions.delete')} onPress={() => { handleDelete(editingId); setSheetVisible(false); }} variant="danger" style={{ marginTop: spacing.sm }} />
          )}
        </View>
      </BottomSheet>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
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
      fontSize: 20,
      fontWeight: '700',
      color: colors.text.primary,
    },
    addButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 100,
      gap: spacing.md,
    },

    // Hero Card
    heroLabel: {
      color: colors.text.muted,
      fontSize: 13,
      marginBottom: 4,
    },
    heroValue: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    heroSubtext: {
      fontSize: 14,
      color: colors.text.secondary,
      fontVariant: ['tabular-nums'],
      marginTop: 2,
      marginBottom: spacing.md,
    },
    heroActiveRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.md,
    },
    heroActiveLabel: {
      fontSize: 13,
      color: colors.text.muted,
    },

    // Section
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text.primary,
    },

    // Category Breakdown
    categoryCard: {
      padding: spacing.md,
    },
    categoryRow: {
      marginBottom: spacing.md,
    },
    categoryLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    categoryIcon: {
      fontSize: 16,
      marginRight: 6,
    },
    categoryName: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.primary,
    },
    categoryTotal: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    categoryBarBg: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
      overflow: 'hidden',
    },
    categoryBarFill: {
      height: 6,
      borderRadius: 3,
    },

    // Subscription List
    subRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    subLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: spacing.sm,
    },
    subIcon: {
      fontSize: 28,
    },
    subInfo: {
      flex: 1,
      gap: 4,
    },
    subName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
    },
    subRight: {
      alignItems: 'flex-end',
    },
    subAmount: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    subBilling: {
      fontSize: 11,
      color: colors.text.muted,
      marginBottom: 4,
    },
    statusBadge: {
      marginTop: 2,
    },

    // Empty State
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: spacing.md,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.secondary,
      textAlign: 'center',
    },
    emptySub: {
      fontSize: 13,
      color: colors.text.muted,
      marginTop: spacing.sm,
      textAlign: 'center',
    },

    // Sheet
    sheetContent: {
      padding: spacing.md,
      gap: spacing.md,
    },
    formLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 4,
    },
    pillRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    pill: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    categoryPillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    categoryPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radius.full,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryPillIcon: {
      fontSize: 14,
    },
    categoryPillLabel: {
      fontSize: 12,
      color: colors.text.secondary,
    },
  });
}
