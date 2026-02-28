import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useFamilyStore } from '../../src/stores/familyStore';
import { AppIcon } from '../../src/hooks/useIcon';
import { Toggle } from '../../src/components/ui/Toggle';
import { isDemoMode } from '../../src/services/api';
import type { FamilySettings } from '../../src/types/family';

// =============================================================================
// Component
// =============================================================================

export default function FamilySettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useSettingsStore((s) => s.t);
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const currentUser = useAuthStore((s) => s.user);
  const isDemo = isDemoMode();
  const familyStore = useFamilyStore();

  // State
  const [groupName, setGroupName] = useState('');
  const [memberCount, setMemberCount] = useState(0);
  const [createdAt, setCreatedAt] = useState('');
  const [isOwner, setIsOwner] = useState(false);

  // Privacy toggles
  const [settings, setSettings] = useState<FamilySettings>({
    allowMembersToSeeEachOther: true,
    shareCardsData: false,
    sharePortfolioData: true,
    requireApprovalToJoin: false,
  });

  // Delete confirmation
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // ---------------------------------------------------------------------------
  // Load data
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isDemo) {
      setGroupName('Família Demo');
      setMemberCount(3);
      setCreatedAt(new Date().toISOString());
      setIsOwner(true);
      return;
    }
    const local: any = useFamilyStore.getState().getActiveGroup();
    if (local) {
      setGroupName(local.name);
      setMemberCount((local.members ?? []).length);
      setCreatedAt(local.createdAt);
      setIsOwner(
        local.ownerId === `member_${currentUser?.id}` ||
        (local.members ?? []).some((m: any) => m.email === currentUser?.email && m.role === 'owner'),
      );
    }
  }, [isDemo, currentUser]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
  }, [router]);

  const handleToggle = useCallback((key: keyof FamilySettings) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleDeleteGroup = useCallback(() => {
    const expectedWord = t('family.deleteGroupTyped');
    if (deleteConfirmText.trim().toUpperCase() !== expectedWord.toUpperCase()) {
      Alert.alert(t('common.error'), t('family.typeToConfirm'));
      return;
    }
    Alert.alert(
      t('family.deleteGroup'),
      t('family.deleteGroupConfirm'),
      [
        { text: t('family.cancel'), style: 'cancel' },
        {
          text: t('family.deleteGroup'),
          style: 'destructive',
          onPress: () => {
            const gId = useFamilyStore.getState().activeGroupId;
            if (gId) {
              (familyStore as any).deleteGroup(gId);
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.replace('/family');
          },
        },
      ],
    );
  }, [deleteConfirmText, familyStore, router, t]);

  const formatDate = useCallback((iso: string) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString();
    } catch {
      return '-';
    }
  }, []);

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
        <Text style={styles.headerTitle}>{t('family.settings')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Section: Group Info */}
        <Text style={styles.sectionTitle}>{t('family.groupInfo')}</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('family.groupName')}</Text>
            <Text style={styles.infoValue}>{groupName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('family.members')}</Text>
            <Text style={styles.infoValue}>
              {t('family.memberCount').replace('{n}', String(memberCount))}
            </Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>
              {t('family.createdOn').replace('{date}', '')}
            </Text>
            <Text style={styles.infoValue}>{formatDate(createdAt)}</Text>
          </View>
        </View>

        {/* Section: Privacy */}
        <Text style={styles.sectionTitle}>{t('family.settingsPrivacy')}</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{t('family.allowMembersView')}</Text>
            <Toggle
              value={settings.allowMembersToSeeEachOther}
              onValueChange={() => handleToggle('allowMembersToSeeEachOther')}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{t('family.shareCards')}</Text>
            <Toggle
              value={settings.shareCardsData}
              onValueChange={() => handleToggle('shareCardsData')}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{t('family.sharePortfolio')}</Text>
            <Toggle
              value={settings.sharePortfolioData}
              onValueChange={() => handleToggle('sharePortfolioData')}
            />
          </View>
          <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.toggleLabel}>{t('family.requireApproval')}</Text>
            <Toggle
              value={settings.requireApprovalToJoin}
              onValueChange={() => handleToggle('requireApprovalToJoin')}
            />
          </View>
        </View>

        {/* Section: Danger Zone (owner only) */}
        {isOwner && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.negative }]}>
              {t('family.dangerZone')}
            </Text>
            <View style={[styles.card, { borderColor: colors.negative + '40' }]}>
              <Text style={styles.dangerDesc}>{t('family.deleteGroupConfirm')}</Text>
              <Text style={styles.dangerHint}>{t('family.typeToConfirm')}</Text>
              <TextInput
                style={styles.dangerInput}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder={t('family.deleteGroupTyped')}
                placeholderTextColor={colors.text.muted}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[
                  styles.dangerBtn,
                  deleteConfirmText.trim().toUpperCase() !== t('family.deleteGroupTyped').toUpperCase() && { opacity: 0.4 },
                ]}
                onPress={handleDeleteGroup}
                activeOpacity={0.7}
                disabled={deleteConfirmText.trim().toUpperCase() !== t('family.deleteGroupTyped').toUpperCase()}
              >
                <AppIcon name="delete" size={18} color="#FFFFFF" />
                <Text style={styles.dangerBtnText}>{t('family.deleteGroup')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
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
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      textAlign: 'center',
    },
    placeholder: {
      width: 36,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 100,
    },

    // Section
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text.secondary,
      marginBottom: spacing.md,
      marginTop: spacing.xl,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    // Card
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },

    // Info rows
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border + '40',
    },
    infoLabel: {
      fontSize: 14,
      color: colors.text.secondary,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
    },

    // Toggle rows
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border + '40',
    },
    toggleLabel: {
      fontSize: 14,
      color: colors.text.primary,
      flex: 1,
      marginRight: spacing.md,
    },

    // Danger zone
    dangerDesc: {
      fontSize: 13,
      color: colors.text.secondary,
      lineHeight: 18,
      padding: spacing.xl,
      paddingBottom: spacing.sm,
    },
    dangerHint: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.negative,
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.md,
    },
    dangerInput: {
      marginHorizontal: spacing.xl,
      backgroundColor: colors.input,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.negative + '40',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: 14,
      fontWeight: '700',
      color: colors.text.primary,
      textAlign: 'center',
      letterSpacing: 2,
      marginBottom: spacing.lg,
    },
    dangerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.negative,
      marginHorizontal: spacing.xl,
      marginBottom: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      gap: spacing.sm,
    },
    dangerBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
