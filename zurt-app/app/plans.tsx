import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore } from '../src/stores/settingsStore';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { AppIcon, type AppIconName } from '../src/hooks/useIcon';
import { fetchPlans } from '../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PLAN_STORAGE_KEY = '@zurt:selected_plan';

type Period = 'monthly' | 'annual';

interface PlanFeature {
  icon: AppIconName;
  label: string;
}

interface PlanTier {
  id: string;
  nameKey: string;
  monthlyPrice: number;
  annualPrice: number;
  highlighted: boolean;
  badgeKey?: string;
  accentColor: string;
  features: PlanFeature[];
}

const PLAN_TIERS: PlanTier[] = [
  {
    id: 'free',
    nameKey: 'plans.free',
    monthlyPrice: 0,
    annualPrice: 0,
    highlighted: false,
    accentColor: '#64748B',
    features: [
      { icon: 'bank', label: '1 plans.features.institutions' },
      { icon: 'chart', label: 'plans.features.dashboard' },
      { icon: 'sparkle', label: '3 plans.features.aiChats' },
    ],
  },
  {
    id: 'basic',
    nameKey: 'plans.basic',
    monthlyPrice: 19.90,
    annualPrice: 190.80,
    highlighted: false,
    accentColor: '#3A86FF',
    features: [
      { icon: 'bank', label: '3 plans.features.institutions' },
      { icon: 'document', label: 'plans.features.reports' },
      { icon: 'sparkle', label: '20 plans.features.aiChats' },
    ],
  },
  {
    id: 'pro',
    nameKey: 'plans.pro',
    monthlyPrice: 39.90,
    annualPrice: 382.80,
    highlighted: true,
    badgeKey: 'plans.mostPopular',
    accentColor: '#A855F7',
    features: [
      { icon: 'bank', label: 'plans.features.unlimited plans.features.institutions' },
      { icon: 'family', label: 'plans.features.family' },
      { icon: 'document', label: 'plans.features.pdf' },
      { icon: 'sparkle', label: 'plans.features.unlimited plans.features.aiChats' },
      { icon: 'bell', label: 'plans.features.priority' },
    ],
  },
  {
    id: 'unlimited',
    nameKey: 'plans.unlimited',
    monthlyPrice: 99.90,
    annualPrice: 958.80,
    highlighted: false,
    accentColor: '#F59E0B',
    features: [
      { icon: 'bank', label: 'plans.features.unlimited plans.features.institutions' },
      { icon: 'family', label: 'plans.features.family' },
      { icon: 'document', label: 'plans.features.pdf' },
      { icon: 'sparkle', label: 'plans.features.unlimited plans.features.aiChats' },
      { icon: 'bell', label: 'plans.features.priority' },
      { icon: 'person', label: 'plans.features.consultant' },
      { icon: 'settings', label: 'plans.features.api' },
    ],
  },
];

export default function PlansScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [period, setPeriod] = useState<Period>('monthly');
  const [loading, setLoading] = useState<string | null>(null);

  // Try to fetch plans from backend (ignored if unavailable — uses local tiers)
  useEffect(() => {
    fetchPlans().catch(() => {});
  }, []);

  const formatPrice = useCallback((value: number) => {
    if (value === 0) return 'R$ 0';
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  }, []);

  const resolveFeatureLabel = useCallback((raw: string) => {
    // Replace i18n keys with translations: "3 plans.features.aiChats" → "3 chats IA/mês"
    return raw.split(' ').map((part) => {
      if (part.startsWith('plans.features.')) return t(part);
      return part;
    }).join(' ');
  }, [t]);

  const handleSelectFree = useCallback(async () => {
    setLoading('free');
    try {
      await AsyncStorage.setItem(PLAN_STORAGE_KEY, 'free');
      router.replace('/(auth)/login');
    } finally {
      setLoading(null);
    }
  }, [router]);

  const handleSelectPaid = useCallback(async (planId: string) => {
    setLoading(planId);
    try {
      await WebBrowser.openBrowserAsync(
        `https://zurt.com.br/api/stripe/checkout?plan=${planId}&period=${period}`
      );
      await AsyncStorage.setItem(PLAN_STORAGE_KEY, planId);
      router.replace('/(auth)/login');
    } catch {
      // user closed browser
    } finally {
      setLoading(null);
    }
  }, [period, router]);

  const handleSelect = useCallback((planId: string) => {
    if (planId === 'free') {
      handleSelectFree();
    } else {
      handleSelectPaid(planId);
    }
  }, [handleSelectFree, handleSelectPaid]);

  const renderPlanCard = useCallback((tier: PlanTier) => {
    const price = period === 'monthly' ? tier.monthlyPrice : tier.annualPrice;
    const periodKey = period === 'monthly' ? 'plans.perMonth' : 'plans.perYear';
    const isLoading = loading === tier.id;

    return (
      <View
        key={tier.id}
        style={[
          styles.planCard,
          tier.highlighted && { borderColor: tier.accentColor, borderWidth: 2 },
        ]}
      >
        {/* Badge */}
        {tier.badgeKey && (
          <View style={[styles.badge, { backgroundColor: tier.accentColor }]}>
            <Text style={styles.badgeText}>{t(tier.badgeKey)}</Text>
          </View>
        )}

        {/* Plan name + price */}
        <Text style={[styles.planName, { color: tier.accentColor }]}>
          {t(tier.nameKey)}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.priceValue}>{formatPrice(price)}</Text>
          {price > 0 && (
            <Text style={styles.pricePeriod}>{t(periodKey)}</Text>
          )}
        </View>

        {/* Features */}
        <View style={styles.featuresList}>
          {tier.features.map((feature, idx) => (
            <View key={idx} style={styles.featureRow}>
              <AppIcon name={feature.icon} size={16} color={tier.accentColor} />
              <Text style={styles.featureText}>
                {resolveFeatureLabel(feature.label)}
              </Text>
            </View>
          ))}
        </View>

        {/* CTA button */}
        <TouchableOpacity
          style={[
            styles.ctaButton,
            tier.id === 'free'
              ? { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }
              : { backgroundColor: tier.accentColor },
          ]}
          onPress={() => handleSelect(tier.id)}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator
              size="small"
              color={tier.id === 'free' ? colors.text.primary : colors.background}
            />
          ) : (
            <Text
              style={[
                styles.ctaText,
                tier.id === 'free'
                  ? { color: colors.text.primary }
                  : { color: colors.background },
              ]}
            >
              {tier.id === 'free' ? t('plans.startFree') : t('plans.subscribe')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }, [period, loading, colors, t, formatPrice, resolveFeatureLabel, handleSelect, styles]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('plans.title')}</Text>
          <Text style={styles.subtitle}>{t('plans.subtitle')}</Text>
        </View>

        {/* Period Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              period === 'monthly' && styles.toggleActive,
            ]}
            onPress={() => setPeriod('monthly')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.toggleText,
                period === 'monthly' && styles.toggleTextActive,
              ]}
            >
              {t('plans.monthly')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              period === 'annual' && styles.toggleActive,
            ]}
            onPress={() => setPeriod('annual')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.toggleText,
                period === 'annual' && styles.toggleTextActive,
              ]}
            >
              {t('plans.annual')}
            </Text>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{t('plans.annualDiscount')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Plan Cards */}
        {PLAN_TIERS.map(renderPlanCard)}

        {/* Cancel anytime note */}
        <Text style={styles.cancelNote}>{t('plans.cancelAnytime')}</Text>
      </ScrollView>

      {/* Fixed bottom: Continue free */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity
          style={styles.bottomFreeButton}
          onPress={handleSelectFree}
          activeOpacity={0.7}
          disabled={loading !== null}
        >
          <Text style={styles.bottomFreeText}>{t('plans.startFree')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
    },
    header: {
      alignItems: 'center',
      marginTop: spacing.xxl,
      marginBottom: spacing.xxl,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    subtitle: {
      fontSize: 15,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    // Toggle
    toggleContainer: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: spacing.xs,
      marginBottom: spacing.xxl,
    },
    toggleButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      borderRadius: radius.sm,
      gap: spacing.xs,
    },
    toggleActive: {
      backgroundColor: colors.elevated,
    },
    toggleText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.muted,
    },
    toggleTextActive: {
      color: colors.text.primary,
    },
    discountBadge: {
      backgroundColor: '#00D4AA20',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.sm,
    },
    discountText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#00D4AA',
    },
    // Plan Card
    planCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.xl,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
      marginBottom: spacing.md,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    planName: {
      fontSize: 20,
      fontWeight: '800',
      marginBottom: spacing.sm,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: spacing.lg,
    },
    priceValue: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.text.primary,
    },
    pricePeriod: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.muted,
      marginLeft: spacing.xs,
    },
    featuresList: {
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    featureText: {
      fontSize: 14,
      color: colors.text.secondary,
      flex: 1,
    },
    ctaButton: {
      paddingVertical: spacing.lg,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaText: {
      fontSize: 16,
      fontWeight: '700',
    },
    cancelNote: {
      fontSize: 13,
      color: colors.text.muted,
      textAlign: 'center',
      marginTop: spacing.sm,
      marginBottom: spacing.xxl,
    },
    // Bottom bar
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.md,
      paddingHorizontal: spacing.xl,
    },
    bottomFreeButton: {
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    bottomFreeText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.accent,
      textDecorationLine: 'underline',
    },
  });
