import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { usePriceAlertStore } from '../src/stores/priceAlertStore';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { BottomSheet } from '../src/components/shared/BottomSheet';
import { AppIcon } from '../src/hooks/useIcon';
import { SkeletonList } from '../src/components/skeletons/Skeleton';
import { formatCurrency, maskValue } from '../src/utils/formatters';
import type { PriceAlert, PriceAlertCondition, PriceAlertStatus } from '../src/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type StatusFilter = PriceAlertStatus | 'all';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'priceAlerts.statusAll' },
  { key: 'active', label: 'priceAlerts.statusActive' },
  { key: 'triggered', label: 'priceAlerts.statusTriggered' },
  { key: 'expired', label: 'priceAlerts.statusExpired' },
];

// ===========================================================================
// PriceAlertsScreen
// ===========================================================================

export default function PriceAlertsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const { valuesHidden } = useAuthStore();

  const {
    alerts, isLoading, loadAlerts, addAlert, editAlert, removeAlert, toggleActive,
    getActiveCount, getTriggeredTodayCount, getAlertsByStatus,
  } = usePriceAlertStore();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formTicker, setFormTicker] = useState('');
  const [formName, setFormName] = useState('');
  const [formCondition, setFormCondition] = useState<PriceAlertCondition>('above');
  const [formTarget, setFormTarget] = useState('');

  useEffect(() => {
    loadAlerts();
  }, []);

  const filteredAlerts = useMemo(() => getAlertsByStatus(statusFilter), [alerts, statusFilter]);
  const activeCount = useMemo(() => getActiveCount(), [alerts]);
  const triggeredToday = useMemo(() => getTriggeredTodayCount(), [alerts]);

  const displayValue = (value: number) =>
    valuesHidden ? maskValue('') : formatCurrency(value, currency);

  const statusColor = useCallback(
    (status: PriceAlertStatus) => {
      if (status === 'active') return colors.info;
      if (status === 'triggered') return colors.positive;
      return colors.text.muted;
    },
    [colors],
  );

  const statusVariant = useCallback((status: PriceAlertStatus): 'positive' | 'warning' | 'neutral' => {
    if (status === 'triggered') return 'positive';
    if (status === 'active') return 'warning';
    return 'neutral';
  }, []);

  // Form handlers
  const resetForm = useCallback(() => {
    setFormTicker('');
    setFormName('');
    setFormCondition('above');
    setFormTarget('');
    setEditingId(null);
  }, []);

  const handleCreate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetForm();
    setSheetVisible(true);
  }, [resetForm]);

  const handleEdit = useCallback((alert: PriceAlert) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingId(alert.id);
    setFormTicker(alert.ticker);
    setFormName(alert.name);
    setFormCondition(alert.condition);
    setFormTarget(String(alert.targetPrice));
    setSheetVisible(true);
  }, []);

  const handleSave = useCallback(() => {
    const target = parseFloat(formTarget.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (!formTicker.trim() || isNaN(target) || target <= 0) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (editingId) {
      editAlert(editingId, {
        ticker: formTicker.trim().toUpperCase(),
        name: formName.trim() || formTicker.trim().toUpperCase(),
        condition: formCondition,
        targetPrice: target,
      });
    } else {
      addAlert({
        ticker: formTicker.trim().toUpperCase(),
        name: formName.trim() || formTicker.trim().toUpperCase(),
        condition: formCondition,
        targetPrice: target,
        currentPrice: 0,
      });
    }
    setSheetVisible(false);
    resetForm();
  }, [editingId, formTicker, formName, formCondition, formTarget, editAlert, addAlert, resetForm]);

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert(t('priceAlerts.delete'), t('priceAlerts.deleteConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('priceAlerts.delete'),
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            removeAlert(id);
          },
        },
      ]);
    },
    [t, removeAlert],
  );

  // Render item
  const renderAlertItem = useCallback(
    ({ item, index }: { item: PriceAlert; index: number }) => (
      <Card key={item.id} delay={index * 60}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleEdit(item)}
          onLongPress={() => handleDelete(item.id)}
          style={styles.alertRow}
        >
          <View style={styles.alertInfo}>
            <View style={styles.alertHeader}>
              <Text style={styles.alertTicker}>{item.ticker}</Text>
              <Badge value={t(`priceAlerts.${item.status}`)} variant={statusVariant(item.status)} size="sm" />
            </View>
            <Text style={styles.alertName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.alertCondition}>
              {t(`priceAlerts.${item.condition}`)} {displayValue(item.targetPrice)}
            </Text>
          </View>
          <View style={styles.alertRight}>
            <Text style={styles.alertCurrentLabel}>{t('priceAlerts.currentPrice')}</Text>
            <Text style={styles.alertCurrentValue}>{displayValue(item.currentPrice)}</Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleActive(item.id);
              }}
              style={[
                styles.toggleBtn,
                { backgroundColor: item.status === 'active' ? colors.info + '20' : colors.border + '40' },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View
                style={[
                  styles.toggleDot,
                  {
                    backgroundColor: item.status === 'active' ? colors.info : colors.text.muted,
                    alignSelf: item.status === 'active' ? 'flex-end' : 'flex-start',
                  },
                ]}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Card>
    ),
    [colors, styles, valuesHidden, t, statusVariant, handleEdit, handleDelete, toggleActive, displayValue],
  );

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
        >
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('priceAlerts.title')}</Text>
        <TouchableOpacity onPress={handleCreate} style={styles.addButton}>
          <AppIcon name="add" size={24} color={colors.background} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <SkeletonList count={5} />
        </View>
      ) : alerts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>{'\uD83D\uDD14'}</Text>
          <Text style={styles.emptyText}>{t('priceAlerts.empty')}</Text>
          <TouchableOpacity style={styles.emptyCta} onPress={handleCreate} activeOpacity={0.7}>
            <Text style={styles.emptyCtaText}>{t('priceAlerts.emptyCta')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredAlerts}
          keyExtractor={(item) => item.id}
          renderItem={renderAlertItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Summary */}
              <Card variant="glow" delay={0}>
                <Text style={styles.summaryLabel}>{t('priceAlerts.summary')}</Text>
                <View style={styles.summaryStats}>
                  <View style={styles.summaryStatItem}>
                    <Text style={[styles.summaryStatValue, { color: colors.info }]}>{activeCount}</Text>
                    <Text style={styles.summaryStatLabel}>{t('priceAlerts.activeCount')}</Text>
                  </View>
                  <View style={styles.summaryStatItem}>
                    <Text style={[styles.summaryStatValue, { color: colors.positive }]}>{triggeredToday}</Text>
                    <Text style={styles.summaryStatLabel}>{t('priceAlerts.triggeredToday')}</Text>
                  </View>
                </View>
              </Card>

              {/* Filter pills */}
              <View style={styles.filterRow}>
                {STATUS_FILTERS.map((sf) => {
                  const isActive = statusFilter === sf.key;
                  return (
                    <TouchableOpacity
                      key={sf.key}
                      style={[styles.filterPill, isActive && { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setStatusFilter(sf.key);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.filterPillText, isActive && { color: colors.accent, fontWeight: '700' }]}>
                        {t(sf.label)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          }
        />
      )}

      {/* Add/Edit BottomSheet */}
      <BottomSheet
        visible={sheetVisible}
        onClose={() => { setSheetVisible(false); resetForm(); }}
        title={editingId ? t('priceAlerts.editAlert') : t('priceAlerts.addAlert')}
        height={SCREEN_HEIGHT * 0.7}
      >
        <View style={styles.formContainer}>
          <Input
            label={t('priceAlerts.ticker')}
            value={formTicker}
            onChangeText={setFormTicker}
            placeholder="PETR4"
            autoCapitalize="characters"
          />
          <Input
            label={t('priceAlerts.assetName')}
            value={formName}
            onChangeText={setFormName}
            placeholder="Petrobras PN"
          />

          {/* Condition toggle */}
          <Text style={styles.formLabel}>{t('priceAlerts.condition')}</Text>
          <View style={styles.conditionRow}>
            {(['above', 'below'] as PriceAlertCondition[]).map((cond) => {
              const isActive = formCondition === cond;
              return (
                <TouchableOpacity
                  key={cond}
                  style={[styles.conditionPill, isActive && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setFormCondition(cond);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.conditionPillText, isActive && { color: colors.background, fontWeight: '700' }]}>
                    {t(`priceAlerts.${cond}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input
            label={t('priceAlerts.targetPrice')}
            value={formTarget}
            onChangeText={setFormTarget}
            placeholder="42.00"
            keyboardType="numeric"
          />

          <Button
            title={t('priceAlerts.save')}
            onPress={handleSave}
            variant="primary"
            size="lg"
            style={{ marginTop: spacing.xl }}
          />

          {editingId && (
            <Button
              title={t('priceAlerts.delete')}
              onPress={() => { setSheetVisible(false); handleDelete(editingId); }}
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

// ===========================================================================
// Styles
// ===========================================================================

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
    addButton: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent,
      alignItems: 'center', justifyContent: 'center',
    },
    loadingContainer: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
    listContent: { paddingHorizontal: spacing.xl, paddingBottom: 100 },

    // Summary
    summaryLabel: { fontSize: 13, color: colors.text.secondary, marginBottom: spacing.md },
    summaryStats: { flexDirection: 'row', gap: spacing.xl },
    summaryStatItem: { flex: 1 },
    summaryStatValue: { fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'] },
    summaryStatLabel: { fontSize: 12, color: colors.text.muted, marginTop: 2 },

    // Filter
    filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    filterPill: {
      paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full,
      borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    },
    filterPillText: { fontSize: 13, color: colors.text.secondary, fontWeight: '500' },

    // Alert row
    alertRow: { flexDirection: 'row', alignItems: 'center' },
    alertInfo: { flex: 1, gap: spacing.xs },
    alertHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    alertTicker: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
    alertName: { fontSize: 13, color: colors.text.secondary },
    alertCondition: { fontSize: 12, color: colors.text.muted },
    alertRight: { alignItems: 'flex-end', marginLeft: spacing.sm, gap: spacing.xs },
    alertCurrentLabel: { fontSize: 10, color: colors.text.muted },
    alertCurrentValue: { fontSize: 14, fontWeight: '600', color: colors.text.primary, fontVariant: ['tabular-nums'] },
    toggleBtn: {
      width: 36, height: 20, borderRadius: 10, padding: 2, justifyContent: 'center', marginTop: 4,
    },
    toggleDot: { width: 16, height: 16, borderRadius: 8 },

    // Empty state
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl },
    emptyEmoji: { fontSize: 56, marginBottom: spacing.lg },
    emptyText: { fontSize: 16, color: colors.text.secondary, marginBottom: spacing.xl, textAlign: 'center' },
    emptyCta: {
      backgroundColor: colors.accent, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, borderRadius: radius.md,
    },
    emptyCtaText: { fontSize: 14, fontWeight: '600', color: colors.background },

    // Form
    formContainer: { paddingBottom: spacing.xxl },
    formLabel: { fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: spacing.sm },
    conditionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    conditionPill: {
      flex: 1, paddingVertical: spacing.md, borderRadius: radius.md,
      borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center',
    },
    conditionPillText: { fontSize: 14, color: colors.text.secondary, fontWeight: '500' },
  });
