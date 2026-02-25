import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useConsultantStore } from '../src/stores/consultantStore';
import { AppIcon } from '../src/hooks/useIcon';
import { formatCurrency } from '../src/utils/formatters';
import { SkeletonList } from '../src/components/skeletons/Skeleton';
import type { ConsultantClient } from '../src/types';

export default function ConsultantScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const { isDemoMode } = useAuthStore();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    clients,
    selectedClient,
    clientPortfolio,
    isLoading,
    loadClients,
    selectClient,
    clearSelection,
  } = useConsultantStore();
  const [search, setSearch] = useState('');

  useEffect(() => { loadClients(); }, []);

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
    );
  }, [clients, search]);

  const handleBack = useCallback(() => {
    if (selectedClient) {
      clearSelection();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [selectedClient, clearSelection, router]);

  const handleSelectClient = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    selectClient(id);
  }, [selectClient]);

  const riskLabel = (profile: string) => {
    switch (profile) {
      case 'conservative': return t('consultant.conservative');
      case 'moderate': return t('consultant.moderate');
      case 'aggressive': return t('consultant.aggressive');
      default: return profile;
    }
  };

  const riskColor = (profile: string) => {
    switch (profile) {
      case 'conservative': return '#3A86FF';
      case 'moderate': return '#F3BA2F';
      case 'aggressive': return '#FF6B6B';
      default: return colors.text.secondary;
    }
  };

  // Client detail view
  if (selectedClient && clientPortfolio) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <AppIcon name="back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{selectedClient.name}</Text>
          <View style={styles.readOnlyBadge}>
            <Text style={styles.readOnlyText}>{t('consultant.readOnly')}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>{t('consultant.netWorth')}</Text>
                <Text style={styles.summaryValue}>{formatCurrency(clientPortfolio.summary.totalValue, currency)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.summaryLabel}>12M</Text>
                <Text style={[styles.summaryPct, { color: clientPortfolio.summary.variation12m >= 0 ? colors.positive : colors.negative }]}>
                  {clientPortfolio.summary.variation12m >= 0 ? '+' : ''}{clientPortfolio.summary.variation12m.toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Allocations */}
          <Text style={styles.sectionTitle}>{t('consultant.allocations')}</Text>
          <View style={styles.section}>
            {clientPortfolio.allocations.map((alloc) => (
              <View key={alloc.class} style={styles.allocRow}>
                <View style={[styles.allocDot, { backgroundColor: alloc.color }]} />
                <Text style={styles.allocLabel}>{alloc.label}</Text>
                <Text style={styles.allocPct}>{alloc.percentage}%</Text>
                <Text style={styles.allocValue}>{formatCurrency(alloc.value, currency)}</Text>
              </View>
            ))}
          </View>

          {/* Top Assets */}
          <Text style={styles.sectionTitle}>{t('consultant.topAssets')}</Text>
          <View style={styles.section}>
            {clientPortfolio.topAssets.map((asset) => (
              <View key={asset.ticker} style={styles.assetRow}>
                <View>
                  <Text style={styles.assetTicker}>{asset.ticker}</Text>
                  <Text style={styles.assetName} numberOfLines={1}>{asset.name}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.assetValue}>{formatCurrency(asset.value, currency)}</Text>
                  <Text style={[styles.assetVar, { color: asset.variation >= 0 ? colors.positive : colors.negative }]}>
                    {asset.variation >= 0 ? '+' : ''}{asset.variation.toFixed(1)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Risk Score */}
          <Text style={styles.sectionTitle}>{t('consultant.riskScore')}</Text>
          <View style={styles.section}>
            <View style={styles.riskRow}>
              <View style={styles.riskBarBg}>
                <View style={[styles.riskBarFill, { width: `${clientPortfolio.riskScore}%`, backgroundColor: riskColor(selectedClient.riskProfile) }]} />
              </View>
              <Text style={[styles.riskScoreText, { color: riskColor(selectedClient.riskProfile) }]}>
                {clientPortfolio.riskScore}/100
              </Text>
            </View>
            <Text style={[styles.riskProfileText, { color: riskColor(selectedClient.riskProfile) }]}>
              {riskLabel(selectedClient.riskProfile)}
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Loading detail
  if (selectedClient && isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <AppIcon name="back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedClient.name}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.xl }}>
          <SkeletonList count={6} />
        </View>
      </View>
    );
  }

  // Client list view
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('consultant.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {!isDemoMode && (
        <View style={{ backgroundColor: colors.elevated, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, marginHorizontal: spacing.xl, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ fontSize: 13, color: colors.text.secondary }}>{'\uD83D\uDD1C'} {t('common.featureInDevelopment')}</Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <AppIcon name="search" size={16} color={colors.text.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('consultant.searchClients')}
          placeholderTextColor={colors.text.muted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: spacing.xl }}>
          <SkeletonList count={4} />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={loadClients}
              tintColor={colors.accent}
            />
          }
        >
          {filteredClients.length === 0 ? (
            <View style={styles.empty}>
              <AppIcon name="person" size={48} color={colors.text.secondary} />
              <Text style={styles.emptyText}>{t('consultant.noClients')}</Text>
            </View>
          ) : (
            filteredClients.map((client) => (
              <TouchableOpacity
                key={client.id}
                style={styles.clientCard}
                onPress={() => handleSelectClient(client.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.clientAvatar, { backgroundColor: riskColor(client.riskProfile) + '20' }]}>
                  <Text style={[styles.clientInitials, { color: riskColor(client.riskProfile) }]}>{client.initials}</Text>
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{client.name}</Text>
                  <Text style={styles.clientMeta}>
                    {formatCurrency(client.netWorth, currency)} · {client.accountCount} {t('consultant.accounts')}
                  </Text>
                </View>
                <View style={[styles.riskBadge, { backgroundColor: riskColor(client.riskProfile) + '20' }]}>
                  <Text style={[styles.riskBadgeText, { color: riskColor(client.riskProfile) }]}>
                    {riskLabel(client.riskProfile)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text.primary, textAlign: 'center' },
  readOnlyBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  readOnlyText: { fontSize: 10, fontWeight: '600', color: colors.warning },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, paddingVertical: spacing.md, fontSize: 14, color: colors.text.primary },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: 100 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 16, color: colors.text.secondary, marginTop: spacing.md },
  // Client card
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  clientInitials: { fontSize: 16, fontWeight: '700' },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  clientMeta: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  riskBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  riskBadgeText: { fontSize: 11, fontWeight: '600' },
  // Detail
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { fontSize: 22, fontWeight: '700', color: colors.text.primary },
  summaryPct: { fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.md, marginTop: spacing.md },
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  allocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border + '50',
  },
  allocDot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm },
  allocLabel: { flex: 1, fontSize: 14, color: colors.text.primary },
  allocPct: { fontSize: 13, fontWeight: '600', color: colors.text.secondary, width: 40, textAlign: 'right', marginRight: spacing.md },
  allocValue: { fontSize: 13, color: colors.text.secondary, fontVariant: ['tabular-nums'] },
  assetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border + '50',
  },
  assetTicker: { fontSize: 14, fontWeight: '700', color: colors.text.primary },
  assetName: { fontSize: 12, color: colors.text.secondary, maxWidth: 180 },
  assetValue: { fontSize: 14, fontWeight: '600', color: colors.text.primary, fontVariant: ['tabular-nums'] },
  assetVar: { fontSize: 12, fontWeight: '600' },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  riskBarBg: { flex: 1, height: 10, backgroundColor: colors.border, borderRadius: 5, overflow: 'hidden' },
  riskBarFill: { height: 10, borderRadius: 5 },
  riskScoreText: { fontSize: 16, fontWeight: '700', width: 55, textAlign: 'right' },
  riskProfileText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
