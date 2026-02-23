import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useBillsStore } from '../src/stores/billsStore';
import { Header } from '../src/components/shared/Header';
import { Card } from '../src/components/ui/Card';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { Toggle } from '../src/components/ui/Toggle';
import { Badge } from '../src/components/ui/Badge';
import { BottomSheet } from '../src/components/shared/BottomSheet';
import { AppIcon } from '../src/hooks/useIcon';
import { SkeletonList } from '../src/components/skeletons/Skeleton';
import type { Bill, BillStatus, BillFrequency } from '../src/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type StatusFilter = BillStatus | 'all';

const FREQUENCIES: { key: BillFrequency; label: string }[] = [
  { key: 'monthly', label: 'bills.monthly' },
  { key: 'yearly', label: 'bills.yearly' },
  { key: 'weekly', label: 'bills.weekly' },
  { key: 'one-time', label: 'bills.oneTime' },
];

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'bills.statusAll' },
  { key: 'paid', label: 'bills.statusPaid' },
  { key: 'pending', label: 'bills.statusPending' },
  { key: 'overdue', label: 'bills.statusOverdue' },
];

const formatCurrencyBRL = (value: number): string =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ===========================================================================
// BillsScreen
// ===========================================================================

export default function BillsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const { valuesHidden } = useAuthStore();

  const {
    bills,
    isLoading,
    loadBills,
    addBill,
    editBill,
    removeBill,
    togglePaid,
    getTotalMonthly,
    getPaidCount,
    getNextDue,
    getBillsByStatus,
  } = useBillsStore();

  const styles = useMemo(() => createStyles(colors), [colors]);

  // State
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formFrequency, setFormFrequency] = useState<BillFrequency>('monthly');
  const [formReminder, setFormReminder] = useState(true);

  useEffect(() => {
    loadBills();
  }, []);

  // -------------------------------------------------------------------------
  // Derived
  // -------------------------------------------------------------------------

  const filteredBills = useMemo(() => getBillsByStatus(statusFilter), [bills, statusFilter]);
  const totalMonthly = useMemo(() => getTotalMonthly(), [bills]);
  const paidCount = useMemo(() => getPaidCount(), [bills]);
  const nextDue = useMemo(() => getNextDue(), [bills]);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const statusColor = useCallback(
    (status: BillStatus) => {
      if (status === 'paid') return colors.positive;
      if (status === 'pending') return colors.warning;
      return colors.negative;
    },
    [colors],
  );

  const statusVariant = useCallback((status: BillStatus): 'positive' | 'warning' | 'negative' => {
    if (status === 'paid') return 'positive';
    if (status === 'pending') return 'warning';
    return 'negative';
  }, []);

  const frequencyLabel = useCallback(
    (freq: BillFrequency) => {
      const found = FREQUENCIES.find((f) => f.key === freq);
      return found ? t(found.label) : freq;
    },
    [t],
  );

  // -------------------------------------------------------------------------
  // Form
  // -------------------------------------------------------------------------

  const resetForm = useCallback(() => {
    setFormName('');
    setFormAmount('');
    setFormDueDate('');
    setFormFrequency('monthly');
    setFormReminder(true);
    setEditingId(null);
  }, []);

  const handleCreate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetForm();
    setSheetVisible(true);
  }, [resetForm]);

  const handleEdit = useCallback(
    (bill: Bill) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setEditingId(bill.id);
      setFormName(bill.name);
      setFormAmount(String(bill.amount));
      setFormDueDate(bill.dueDate);
      setFormFrequency(bill.frequency);
      setFormReminder(bill.reminder);
      setSheetVisible(true);
    },
    [],
  );

  const handleSave = useCallback(() => {
    const amount = parseFloat(formAmount.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (!formName.trim() || isNaN(amount) || amount <= 0) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (editingId) {
      editBill(editingId, {
        name: formName.trim(),
        amount,
        dueDate: formDueDate || '2026-03-15',
        frequency: formFrequency,
        reminder: formReminder,
      });
    } else {
      addBill({
        name: formName.trim(),
        amount,
        dueDate: formDueDate || '2026-03-15',
        frequency: formFrequency,
        category: 'subscriptions',
        status: 'pending',
        icon: '\uD83D\uDCCB',
        color: colors.accent,
        reminder: formReminder,
      });
    }
    setSheetVisible(false);
    resetForm();
  }, [editingId, formName, formAmount, formDueDate, formFrequency, formReminder, editBill, addBill, resetForm, colors]);

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert(t('bills.deleteBill'), t('bills.deleteConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('bills.deleteBill'),
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            removeBill(id);
          },
        },
      ]);
    },
    [t, removeBill],
  );

  const handleTogglePaid = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      togglePaid(id);
    },
    [togglePaid],
  );

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const renderBillItem = useCallback(
    ({ item, index }: { item: Bill; index: number }) => (
      <Card key={item.id} delay={index * 60}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleEdit(item)}
          onLongPress={() => handleDelete(item.id)}
          style={styles.billRow}
        >
          {/* Left: Icon */}
          <View style={[styles.billIcon, { backgroundColor: item.color + '20' }]}>
            <Text style={styles.billIconText}>{item.icon}</Text>
          </View>

          {/* Center: Name, due date, frequency */}
          <View style={styles.billInfo}>
            <Text style={styles.billName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.billDueDate}>
              {t('bills.dueDate')}: {item.dueDate}
            </Text>
            <Badge value={frequencyLabel(item.frequency)} variant="neutral" size="sm" />
          </View>

          {/* Right: Amount, status, checkbox */}
          <View style={styles.billRight}>
            <Text style={styles.billAmount}>
              {valuesHidden ? 'R$ \u2022\u2022\u2022\u2022\u2022' : formatCurrencyBRL(item.amount)}
            </Text>
            <Badge
              value={t(`bills.${item.status}`)}
              variant={statusVariant(item.status)}
              size="sm"
              style={{ marginTop: spacing.xs }}
            />
            <TouchableOpacity
              onPress={() => handleTogglePaid(item.id)}
              style={[
                styles.checkbox,
                {
                  backgroundColor: item.status === 'paid' ? colors.positive : 'transparent',
                  borderColor: item.status === 'paid' ? colors.positive : colors.border,
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {item.status === 'paid' && (
                <AppIcon name="success" size={14} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Card>
    ),
    [colors, styles, valuesHidden, t, frequencyLabel, statusVariant, handleEdit, handleDelete, handleTogglePaid],
  );

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel={t('common.back')}
        >
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('bills.title')}</Text>
        <TouchableOpacity
          onPress={handleCreate}
          style={styles.addButton}
          accessibilityLabel={t('bills.addBill')}
        >
          <AppIcon name="add" size={24} color={colors.background} />
        </TouchableOpacity>
      </View>

      {/* Loading */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <SkeletonList count={5} />
        </View>
      ) : bills.length === 0 ? (
        /* Empty state */
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>{'\uD83D\uDCCB'}</Text>
          <Text style={styles.emptyText}>{t('bills.empty')}</Text>
          <TouchableOpacity
            style={styles.emptyCta}
            onPress={handleCreate}
            activeOpacity={0.7}
          >
            <Text style={styles.emptyCtaText}>{t('bills.emptyCta')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredBills}
          keyExtractor={(item) => item.id}
          renderItem={renderBillItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Summary Card */}
              <Card variant="glow" delay={0}>
                <Text style={styles.summaryLabel}>{t('bills.totalMonthly')}</Text>
                <Text style={styles.summaryHero}>
                  {valuesHidden ? 'R$ \u2022\u2022\u2022\u2022\u2022' : formatCurrencyBRL(totalMonthly)}
                </Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryMeta}>
                    {t('bills.paid')} {paidCount} {t('bills.of')} {bills.length}
                  </Text>
                  {nextDue && (
                    <Text style={styles.summaryNext}>
                      {t('bills.nextDue')}: {nextDue.name} ({nextDue.dueDate})
                    </Text>
                  )}
                </View>
              </Card>

              {/* Status filter pills */}
              <View style={styles.filterRow}>
                {STATUS_FILTERS.map((sf) => {
                  const isActive = statusFilter === sf.key;
                  let pillColor = colors.text.muted;
                  if (sf.key === 'paid') pillColor = colors.positive;
                  else if (sf.key === 'pending') pillColor = colors.warning;
                  else if (sf.key === 'overdue') pillColor = colors.negative;

                  return (
                    <TouchableOpacity
                      key={sf.key}
                      style={[
                        styles.filterPill,
                        isActive && { backgroundColor: pillColor + '20', borderColor: pillColor },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setStatusFilter(sf.key);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          isActive && { color: pillColor, fontWeight: '700' },
                        ]}
                      >
                        {t(sf.label)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyFilterState}>
              <Text style={styles.emptyFilterText}>{t('bills.empty')}</Text>
            </View>
          }
        />
      )}

      {/* ---- Add / Edit Bottom Sheet ---- */}
      <BottomSheet
        visible={sheetVisible}
        onClose={() => {
          setSheetVisible(false);
          resetForm();
        }}
        title={editingId ? t('bills.editBill') : t('bills.addBill')}
        height={SCREEN_HEIGHT * 0.8}
      >
        <View style={styles.formContainer}>
          {/* Name */}
          <Input
            label={t('bills.name')}
            value={formName}
            onChangeText={setFormName}
            placeholder={t('bills.name')}
          />

          {/* Amount */}
          <Input
            label={t('bills.amount')}
            value={formAmount}
            onChangeText={setFormAmount}
            placeholder="150.00"
            keyboardType="numeric"
          />

          {/* Due date */}
          <Input
            label={t('bills.dueDate')}
            value={formDueDate}
            onChangeText={setFormDueDate}
            placeholder="2026-03-15"
          />

          {/* Frequency selector */}
          <Text style={styles.formLabel}>{t('bills.frequency')}</Text>
          <View style={styles.frequencyRow}>
            {FREQUENCIES.map((freq) => {
              const isActive = formFrequency === freq.key;
              return (
                <TouchableOpacity
                  key={freq.key}
                  style={[
                    styles.frequencyPill,
                    isActive && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setFormFrequency(freq.key);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.frequencyPillText,
                      isActive && { color: colors.background, fontWeight: '700' },
                    ]}
                  >
                    {t(freq.label)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Reminder toggle */}
          <View style={styles.reminderRow}>
            <View style={styles.reminderInfo}>
              <Text style={styles.reminderLabel}>{t('bills.reminder')}</Text>
              <Text style={styles.reminderDesc}>{t('bills.reminderDesc')}</Text>
            </View>
            <Toggle value={formReminder} onValueChange={setFormReminder} />
          </View>

          {/* Save button */}
          <Button
            title={t('bills.save')}
            onPress={handleSave}
            variant="primary"
            size="lg"
            style={{ marginTop: spacing.xl }}
          />

          {/* Delete button (edit mode only) */}
          {editingId && (
            <Button
              title={t('bills.deleteBill')}
              onPress={() => {
                setSheetVisible(false);
                handleDelete(editingId);
              }}
              variant="danger"
              size="md"
              style={{ marginTop: spacing.md }}
            />
          )}
        </View>
      </BottomSheet>
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
      fontSize: 20,
      fontWeight: '700',
      color: colors.text.primary,
    },
    addButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Loading
    loadingContainer: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
    },

    // Summary card
    summaryLabel: {
      fontSize: 13,
      color: colors.text.secondary,
      marginBottom: spacing.xs,
    },
    summaryHero: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
      marginBottom: spacing.md,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    summaryMeta: {
      fontSize: 13,
      color: colors.text.secondary,
      fontWeight: '600',
    },
    summaryNext: {
      fontSize: 12,
      color: colors.text.muted,
    },

    // Filter pills
    filterRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    filterPill: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    filterPillText: {
      fontSize: 13,
      color: colors.text.secondary,
      fontWeight: '500',
    },

    // List
    listContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 100,
    },

    // Bill row
    billRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    billIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    billIconText: {
      fontSize: 22,
    },
    billInfo: {
      flex: 1,
      marginLeft: spacing.md,
      gap: spacing.xs,
    },
    billName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
    },
    billDueDate: {
      fontSize: 12,
      color: colors.text.muted,
    },
    billRight: {
      alignItems: 'flex-end',
      marginLeft: spacing.sm,
      gap: spacing.xs,
    },
    billAmount: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.xs,
    },

    // Empty state
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxl,
    },
    emptyEmoji: {
      fontSize: 56,
      marginBottom: spacing.lg,
    },
    emptyText: {
      fontSize: 16,
      color: colors.text.secondary,
      marginBottom: spacing.xl,
      textAlign: 'center',
    },
    emptyCta: {
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
    },
    emptyCtaText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.background,
    },
    emptyFilterState: {
      alignItems: 'center',
      paddingVertical: spacing.xxxl,
    },
    emptyFilterText: {
      fontSize: 14,
      color: colors.text.muted,
    },

    // Form
    formContainer: {
      paddingBottom: spacing.xxl,
    },
    formLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.secondary,
      marginBottom: spacing.sm,
    },
    frequencyRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.lg,
      flexWrap: 'wrap',
    },
    frequencyPill: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    frequencyPillText: {
      fontSize: 13,
      color: colors.text.secondary,
      fontWeight: '500',
    },
    reminderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: spacing.md,
    },
    reminderInfo: {
      flex: 1,
      marginRight: spacing.md,
    },
    reminderLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
    },
    reminderDesc: {
      fontSize: 12,
      color: colors.text.muted,
      marginTop: 2,
    },
  });
