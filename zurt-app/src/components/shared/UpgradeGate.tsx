import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { type ThemeColors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { useSettingsStore } from '../../stores/settingsStore';
import { usePlanStore, type LimitFeature, type PlanUsage, type PlanLimits } from '../../stores/planStore';
import { AppIcon } from '../../hooks/useIcon';

interface UpgradeGateProps {
  feature: LimitFeature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function UpgradeGate({ feature, children, fallback }: UpgradeGateProps) {
  const canAccess = usePlanStore((s) => s.checkLimit(feature));

  if (canAccess) return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  return <UpgradePrompt feature={feature} />;
}

// Wrapper that shows children but intercepts press to check limits
interface UpgradeGatePressProps {
  feature: LimitFeature;
  children: React.ReactNode;
  onAllowed: () => void;
}

export function UpgradeGatePress({ feature, children, onAllowed }: UpgradeGatePressProps) {
  const checkLimit = usePlanStore((s) => s.checkLimit);
  const [showModal, setShowModal] = useState(false);

  const handlePress = useCallback(() => {
    if (checkLimit(feature)) {
      onAllowed();
    } else {
      setShowModal(true);
    }
  }, [feature, checkLimit, onAllowed]);

  return (
    <>
      <Pressable onPress={handlePress}>{children}</Pressable>
      <UpgradeModal
        feature={feature}
        visible={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}

// Inline upgrade prompt (replaces content)
function UpgradePrompt({ feature }: { feature: LimitFeature }) {
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.promptContainer}>
      <View style={styles.promptIconWrap}>
        <AppIcon name="diamond" size={28} color={colors.accent} />
      </View>
      <Text style={styles.promptTitle}>{t('plan.premiumFeature')}</Text>
      <Text style={styles.promptDescription}>
        {t(`plan.upgrade.${feature}` as any) || t('plan.upgradeDescription')}
      </Text>
      <TouchableOpacity
        style={styles.promptButton}
        onPress={() => router.push('/plans' as any)}
        activeOpacity={0.7}
      >
        <Text style={styles.promptButtonText}>{t('plan.viewPlans')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// Modal upgrade prompt
export function UpgradeModal({ feature, visible, onClose }: {
  feature: LimitFeature;
  visible: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const plan = usePlanStore((s) => s.plan);
  const usage = usePlanStore((s) => s.usage);
  const limits = usePlanStore((s) => s.limits);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const usageText = getUsageText(feature, usage, limits, t);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.modalIconWrap}>
            <AppIcon name="diamond" size={36} color={colors.accent} />
          </View>

          <Text style={styles.modalTitle}>{t('plan.limitReached')}</Text>

          {usageText ? (
            <Text style={styles.modalUsage}>{usageText}</Text>
          ) : null}

          <Text style={styles.modalDescription}>
            {t(`plan.upgrade.${feature}` as any) || t('plan.upgradeDescription')}
          </Text>

          <TouchableOpacity
            style={styles.modalPrimaryButton}
            onPress={() => {
              onClose();
              router.push('/plans' as any);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.modalPrimaryText}>{t('plan.viewPlans')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalSecondaryButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.modalSecondaryText}>{t('plan.continueFree')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function getUsageText(
  feature: LimitFeature,
  usage: PlanUsage,
  limits: PlanLimits,
  t: (k: string) => string,
): string {
  switch (feature) {
    case 'aiQueries':
      return `${usage.aiQueriesToday}/${limits.maxAiQueriesPerDay} ${t('plan.aiQueriesLabel')}`;
    case 'reports':
      return `${usage.reportsThisMonth}/${limits.maxReportsPerMonth} ${t('plan.reportsLabel')}`;
    case 'connections':
      return `${usage.connectionsCount}/${limits.maxConnections} ${t('plan.connectionsLabel')}`;
    case 'alerts':
      return `${usage.alertsCount}/${limits.maxAlerts} ${t('plan.alertsLabel')}`;
    default:
      return '';
  }
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    // Inline prompt
    promptContainer: {
      alignItems: 'center',
      padding: spacing.xxl,
      margin: spacing.lg,
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.accent + '30',
    },
    promptIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.accent + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    promptTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    promptDescription: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: spacing.xl,
    },
    promptButton: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.md,
    },
    promptButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.background,
    },

    // Modal
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xxl,
    },
    modalCard: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      padding: spacing.xxl,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.accent + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    modalUsage: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.negative,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    modalDescription: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: spacing.xl,
    },
    modalPrimaryButton: {
      width: '100%',
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingVertical: spacing.md + 2,
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    modalPrimaryText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.background,
    },
    modalSecondaryButton: {
      width: '100%',
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    modalSecondaryText: {
      fontSize: 14,
      color: colors.text.secondary,
    },
  });
