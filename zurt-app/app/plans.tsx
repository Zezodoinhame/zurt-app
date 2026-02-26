import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../src/stores/settingsStore';
import { usePlanStore } from '../src/stores/planStore';
import { PLANS, PLAN_LIST, type PlanId } from '../src/config/plans';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { AppIcon } from '../src/hooks/useIcon';

export default function PlansScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const currentPlan = usePlanStore((s) => s.plan);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);

  const handleSelect = useCallback((planId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // In production, this would open Stripe checkout
    // For now, just log the selection
    console.log('[Plans] Selected:', planId);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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

        {/* Plan Cards */}
        {PLAN_LIST.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const hasBadge = plan.badge !== null;

          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                { borderColor: isCurrent ? plan.color : colors.border },
                isCurrent && { borderWidth: 2 },
              ]}
            >
              {/* Badge row */}
              <View style={styles.badgeRow}>
                {hasBadge && (
                  <View style={[styles.badge, { backgroundColor: plan.color }]}>
                    <Text style={styles.badgeText}>{plan.badge}</Text>
                  </View>
                )}
                {isCurrent && (
                  <View style={[styles.badge, { backgroundColor: colors.positive }]}>
                    <Text style={styles.badgeText}>ATUAL</Text>
                  </View>
                )}
              </View>

              {/* Icon + Name */}
              <View style={styles.planNameRow}>
                <Text style={styles.planIcon}>{plan.icon}</Text>
                <Text style={[styles.planName, { color: plan.color }]}>
                  {plan.name}
                </Text>
              </View>

              {/* Price */}
              <View style={styles.priceRow}>
                <Text style={styles.priceValue}>{plan.priceLabel}</Text>
              </View>

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
                  isCurrent
                    ? { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }
                    : { backgroundColor: plan.color },
                ]}
                onPress={() => handleSelect(plan.id)}
                activeOpacity={0.8}
                disabled={isCurrent}
              >
                <Text
                  style={[
                    styles.ctaText,
                    isCurrent
                      ? { color: colors.text.muted }
                      : { color: '#FFFFFF' },
                  ]}
                >
                  {isCurrent ? t('plans.currentPlan') : t('plans.subscribe')}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Cancel note */}
        <Text style={styles.cancelNote}>{t('plans.cancelAnytime')}</Text>
      </ScrollView>
    </View>
  );
}

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
      marginBottom: spacing.xxl,
      lineHeight: 22,
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
      marginBottom: spacing.sm,
    },
    priceValue: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text.primary,
    },
    planDescription: {
      fontSize: 13,
      color: colors.text.secondary,
      marginBottom: spacing.lg,
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
  });
