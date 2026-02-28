import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../src/stores/settingsStore';
import { usePlanStore, type PlanTier } from '../src/stores/planStore';
import { useAuthStore } from '../src/stores/authStore';
import { stripeService } from '../src/services/stripeService';
import { isDemoMode } from '../src/services/api';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { AppIcon } from '../src/hooks/useIcon';
import { logger } from '../src/utils/logger';

// =============================================================================
// Plan definitions (static fallback — overridden by API when available)
// =============================================================================

interface StripePlan {
  id: string;
  code: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  color: string;
  icon: string;
  badge: string | null;
  highlights: string[];
  description: string;
}

const INVESTOR_PLANS: StripePlan[] = [
  {
    id: 'basic',
    code: 'basic',
    name: 'Basico',
    monthlyPrice: 14.90,
    annualPrice: 149.00,
    color: '#8B95A5',
    icon: '\u26A1',
    badge: null,
    description: '2 conexoes bancarias · 10 consultas IA/dia · 3 relatorios/mes',
    highlights: [
      '2 conexoes bancarias',
      '10 consultas ao ZURT Agent por dia',
      '3 relatorios PDF por mes',
      'Dados de mercado em tempo real',
      'Analise de cartoes e gastos',
    ],
  },
  {
    id: 'pro',
    code: 'pro',
    name: 'PRO',
    monthlyPrice: 29.90,
    annualPrice: 299.00,
    color: '#00D4AA',
    icon: '\uD83D\uDE80',
    badge: 'POPULAR',
    description: '5 conexoes bancarias · 25 consultas IA/dia · 5 relatorios/mes',
    highlights: [
      '5 conexoes bancarias',
      '25 consultas ao ZURT Agent por dia',
      '5 relatorios PDF por mes',
      'Exportacao de dados CSV/Excel',
      'Alertas personalizados',
      'Tudo do plano Basico',
    ],
  },
  {
    id: 'unlimited',
    code: 'unlimited',
    name: 'Unlimited',
    monthlyPrice: 49.90,
    annualPrice: 499.00,
    color: '#3B82F6',
    icon: '\uD83D\uDC51',
    badge: 'MELHOR CUSTO-BENEFICIO',
    description: 'Conexoes ilimitadas · IA ilimitada · Relatorios ilimitados',
    highlights: [
      'Conexoes bancarias ilimitadas',
      'Consultas ao ZURT Agent ilimitadas',
      'Relatorios PDF ilimitados',
      'Suporte prioritario',
      'Exportacao de dados',
      'Tudo do plano PRO',
    ],
  },
  {
    id: 'enterprise',
    code: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 149.90,
    annualPrice: 1499.00,
    color: '#F59E0B',
    icon: '\uD83C\uDFDB',
    badge: 'EXCLUSIVO',
    description: 'Tudo ilimitado + reuniao mensal com consultor por video',
    highlights: [
      'Tudo do plano Unlimited',
      'Reuniao mensal com consultor por video',
      'Suporte VIP dedicado',
      'Onboarding personalizado',
      'Relatorios customizados sob demanda',
    ],
  },
];

const BANKER_PLAN: StripePlan = {
  id: 'banker',
  code: 'banker',
  name: 'Banker',
  monthlyPrice: 499.90,
  annualPrice: 4999.00,
  color: '#A855F7',
  icon: '\uD83C\uDFE6',
  badge: 'CONSULTOR',
  description: 'Plataforma completa para consultores e assessores financeiros',
  highlights: [
    'Area do cliente completa',
    'Relatorios personalizados',
    'Gestao de carteira de clientes',
    'Suporte VIP dedicado',
    'White-label disponivel',
  ],
};

// =============================================================================
// Helpers
// =============================================================================

const formatPrice = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// =============================================================================
// Component
// =============================================================================

export default function PlansScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const currentPlan = usePlanStore((s) => s.plan);
  const planStatus = usePlanStore((s) => s.status);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [plans, setPlans] = useState<StripePlan[]>(INVESTOR_PLANS);
  const [bankerPlan, setBankerPlan] = useState<StripePlan | null>(null);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Check if user is consultant (has consultant/banker tier)
  const isConsultant = currentPlan === 'consultant';
  const hasActiveSubscription = planStatus === 'active' || planStatus === 'trialing';

  // Fetch plans from Stripe API
  useEffect(() => {
    async function loadPlans() {
      if (isDemoMode()) {
        setIsLoadingPlans(false);
        return;
      }

      try {
        const [investorData, consultantData] = await Promise.allSettled([
          stripeService.getInvestorPlans(),
          isConsultant ? stripeService.getConsultantPlans() : Promise.resolve([]),
        ]);

        if (investorData.status === 'fulfilled' && investorData.value.length > 0) {
          const mapped = investorData.value
            .filter((p: any) => p.code !== 'consultant')
            .map((p: any) => {
              const fallback = INVESTOR_PLANS.find((fp) => fp.code === p.code);
              return {
                id: p.id ?? p.code,
                code: p.code,
                name: p.name ?? fallback?.name ?? p.code,
                monthlyPrice: p.monthlyPrice ?? p.monthly_price ?? fallback?.monthlyPrice ?? 0,
                annualPrice: p.annualPrice ?? p.annual_price ?? fallback?.annualPrice ?? 0,
                color: fallback?.color ?? '#00D4AA',
                icon: fallback?.icon ?? '\u26A1',
                badge: fallback?.badge ?? null,
                description: p.description ?? fallback?.description ?? '',
                highlights: p.highlights ?? fallback?.highlights ?? [],
              };
            });
          if (mapped.length > 0) setPlans(mapped);
        }

        if (consultantData.status === 'fulfilled' && consultantData.value.length > 0) {
          const bp = consultantData.value[0];
          setBankerPlan({
            id: bp.id ?? bp.code,
            code: bp.code ?? 'banker',
            name: bp.name ?? BANKER_PLAN.name,
            monthlyPrice: bp.monthlyPrice ?? bp.monthly_price ?? BANKER_PLAN.monthlyPrice,
            annualPrice: bp.annualPrice ?? bp.annual_price ?? BANKER_PLAN.annualPrice,
            color: BANKER_PLAN.color,
            icon: BANKER_PLAN.icon,
            badge: BANKER_PLAN.badge,
            description: bp.description ?? BANKER_PLAN.description,
            highlights: bp.highlights ?? BANKER_PLAN.highlights,
          });
        }
      } catch (err: any) {
        logger.log('[Plans] Error loading stripe plans:', err?.message);
        // Fallback to static plans — already set as default state
      } finally {
        setIsLoadingPlans(false);
      }
    }

    loadPlans();
  }, [isConsultant]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);

  const handleCheckout = useCallback(async (plan: StripePlan) => {
    if (isDemoMode()) {
      Alert.alert('Demo', 'Stripe checkout is not available in demo mode.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCheckoutLoading(plan.id);
    try {
      await stripeService.openCheckout(plan.id, billing);
      // Browser closed — refresh subscription in case payment completed
      await usePlanStore.getState().refreshSubscription();
    } catch (err: any) {
      logger.log('[Plans] Checkout error:', err?.message);
      Alert.alert('Erro', 'Nao foi possivel abrir o checkout. Tente novamente.');
    } finally {
      setCheckoutLoading(null);
    }
  }, [billing]);

  const handleManageSubscription = useCallback(async () => {
    if (isDemoMode()) {
      Alert.alert('Demo', 'Stripe portal is not available in demo mode.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPortalLoading(true);
    try {
      await stripeService.openCustomerPortal();
      // Browser closed — refresh in case user changed/cancelled subscription
      await usePlanStore.getState().refreshSubscription();
    } catch (err: any) {
      logger.log('[Plans] Portal error:', err?.message);
      Alert.alert('Erro', 'Nao foi possivel abrir o portal. Tente novamente.');
    } finally {
      setPortalLoading(false);
    }
  }, []);

  const toggleBilling = useCallback((value: 'monthly' | 'annual') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBilling(value);
  }, []);

  // Determine if a plan is the user's current plan
  const isCurrent = useCallback((planCode: string): boolean => {
    return currentPlan === planCode && hasActiveSubscription;
  }, [currentPlan, hasActiveSubscription]);

  // =========================================================================
  // Render helpers
  // =========================================================================

  const renderPlanCard = useCallback((plan: StripePlan) => {
    const current = isCurrent(plan.code);
    const price = billing === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
    const periodLabel = billing === 'monthly' ? t('plans.perMonth') : t('plans.perYear');
    const isLoading = checkoutLoading === plan.id;

    return (
      <View
        key={plan.id}
        style={[
          styles.planCard,
          { borderColor: current ? plan.color : colors.border },
          current && { borderWidth: 2 },
        ]}
      >
        {/* Badge row */}
        <View style={styles.badgeRow}>
          {plan.badge && (
            <View style={[styles.badge, { backgroundColor: plan.color }]}>
              <Text style={styles.badgeText}>{plan.badge}</Text>
            </View>
          )}
          {current && (
            <View style={[styles.badge, { backgroundColor: colors.positive }]}>
              <Text style={styles.badgeText}>{t('plans.currentPlan').toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* Icon + Name */}
        <View style={styles.planNameRow}>
          <Text style={styles.planIcon}>{plan.icon}</Text>
          <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
        </View>

        {/* Price */}
        <View style={styles.priceRow}>
          <Text style={styles.priceValue}>{formatPrice(price)}</Text>
          <Text style={styles.pricePeriod}>{periodLabel}</Text>
        </View>

        {/* Annual savings hint */}
        {billing === 'annual' && (
          <Text style={[styles.savingsHint, { color: colors.positive }]}>
            {t('plans.annualDiscount')}
          </Text>
        )}

        {/* Description */}
        <Text style={styles.planDescription}>{plan.description}</Text>

        {/* Highlights */}
        <View style={styles.highlightsList}>
          {plan.highlights.map((highlight, idx) => (
            <View key={idx} style={styles.highlightRow}>
              <AppIcon name="check" size={16} color={plan.color} />
              <Text style={styles.highlightText}>{highlight}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[
            styles.ctaButton,
            current
              ? { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }
              : { backgroundColor: plan.color },
          ]}
          onPress={() => current ? undefined : handleCheckout(plan)}
          activeOpacity={0.8}
          disabled={current || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text
              style={[
                styles.ctaText,
                current ? { color: colors.text.muted } : { color: '#FFFFFF' },
              ]}
            >
              {current ? t('plans.currentPlan') : t('plans.subscribe')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }, [billing, checkoutLoading, colors, isCurrent, handleCheckout, styles, t]);

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('plans.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Subtitle */}
        <Text style={styles.subtitle}>{t('plans.subtitle')}</Text>

        {/* Billing Toggle */}
        <View style={styles.billingToggleContainer}>
          <TouchableOpacity
            style={[
              styles.billingOption,
              billing === 'monthly' && [styles.billingOptionActive, { backgroundColor: colors.accent }],
            ]}
            onPress={() => toggleBilling('monthly')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.billingOptionText,
                billing === 'monthly' && styles.billingOptionTextActive,
              ]}
            >
              {t('plans.monthly')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.billingOption,
              billing === 'annual' && [styles.billingOptionActive, { backgroundColor: colors.accent }],
            ]}
            onPress={() => toggleBilling('annual')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.billingOptionText,
                billing === 'annual' && styles.billingOptionTextActive,
              ]}
            >
              {t('plans.annual')}
            </Text>
            <View style={[styles.discountBadge, { backgroundColor: colors.positive }]}>
              <Text style={styles.discountBadgeText}>-17%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Manage Subscription Button */}
        {hasActiveSubscription && (
          <TouchableOpacity
            style={[styles.manageButton, { borderColor: colors.accent }]}
            onPress={handleManageSubscription}
            activeOpacity={0.7}
            disabled={portalLoading}
          >
            {portalLoading ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : (
              <>
                <AppIcon name="settings" size={18} color={colors.accent} />
                <Text style={[styles.manageButtonText, { color: colors.accent }]}>
                  {t('plans.manageSubscription')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Loading state */}
        {isLoadingPlans ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : (
          <>
            {/* Investor Plan Cards */}
            {plans.map(renderPlanCard)}

            {/* Banker Plan — only for consultants */}
            {isConsultant && bankerPlan && (
              <>
                <View style={styles.sectionDivider}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.text.secondary }]}>
                    {t('plans.consultantSection')}
                  </Text>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                </View>
                {renderPlanCard(bankerPlan)}
              </>
            )}
          </>
        )}

        {/* Cancel note */}
        <Text style={styles.cancelNote}>{t('plans.cancelAnytime')}</Text>
      </ScrollView>
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
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
    },
    subtitle: {
      fontSize: 15,
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
      lineHeight: 22,
    },

    // Billing Toggle
    billingToggleContainer: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: radius.full,
      padding: 4,
      marginBottom: spacing.xxl,
      borderWidth: 1,
      borderColor: colors.border,
    },
    billingOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      borderRadius: radius.full,
      gap: 6,
    },
    billingOptionActive: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    billingOptionText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.muted,
    },
    billingOptionTextActive: {
      color: '#FFFFFF',
    },
    discountBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.full,
    },
    discountBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // Manage subscription
    manageButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      marginBottom: spacing.xl,
      borderRadius: radius.md,
      borderWidth: 1,
      gap: spacing.sm,
    },
    manageButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },

    // Loading
    loadingContainer: {
      paddingVertical: 80,
      alignItems: 'center',
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
    badgeRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
      flexWrap: 'wrap',
    },
    badge: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    planNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    planIcon: {
      fontSize: 22,
    },
    planName: {
      fontSize: 22,
      fontWeight: '800',
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 4,
    },
    priceValue: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text.primary,
    },
    pricePeriod: {
      fontSize: 14,
      color: colors.text.muted,
      marginLeft: 4,
    },
    savingsHint: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: spacing.sm,
    },
    planDescription: {
      fontSize: 13,
      color: colors.text.secondary,
      marginBottom: spacing.lg,
      marginTop: spacing.sm,
      lineHeight: 18,
    },

    // Highlights
    highlightsList: {
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    highlightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    highlightText: {
      fontSize: 14,
      color: colors.text.secondary,
      flex: 1,
    },

    // CTA
    ctaButton: {
      paddingVertical: spacing.lg,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    ctaText: {
      fontSize: 16,
      fontWeight: '700',
    },

    // Section divider
    sectionDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: spacing.xl,
      gap: spacing.md,
    },
    dividerLine: {
      flex: 1,
      height: 1,
    },
    dividerText: {
      fontSize: 13,
      fontWeight: '600',
    },

    cancelNote: {
      fontSize: 13,
      color: colors.text.muted,
      textAlign: 'center',
      marginTop: spacing.sm,
      marginBottom: spacing.xxl,
    },
  });
