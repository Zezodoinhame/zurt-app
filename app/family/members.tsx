import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  RefreshControl,
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
import { BottomSheet } from '../../src/components/shared/BottomSheet';
import { Badge } from '../../src/components/ui/Badge';
import { SkeletonList } from '../../src/components/skeletons/Skeleton';
import {
  fetchFamilyGroup,
  inviteFamilyMember,
  removeFamilyMember,
  isDemoMode,
} from '../../src/services/api';
import { logger } from '../../src/utils/logger';

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

const AVATAR_COLORS = [
  '#00D4AA', '#45B7D1', '#FF6200', '#820AD1',
  '#EC0000', '#003882', '#FF7A00', '#3A86FF',
];

function getInitial(name: string): string {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

function getMemberName(member: any, t: (k: string) => string): string {
  return member?.full_name || member?.name || member?.email || member?.invited_email || t('family.defaultMember');
}

// =============================================================================
// Component
// =============================================================================

export default function ManageMembersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useSettingsStore((s) => s.t);
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const currentUser = useAuthStore((s) => s.user);
  const isDemo = isDemoMode();
  const familyStore = useFamilyStore();

  // State
  const [members, setMembers] = useState<any[]>([]);
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Invite sheet
  const [inviteSheetVisible, setInviteSheetVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const loadFromLocalStore = useCallback(() => {
    const local: any = useFamilyStore.getState().getActiveGroup();
    if (local) {
      setGroup({ id: local.id, name: local.name, owner_id: local.createdBy });
      setMembers((local.members ?? []).map((m: any) => ({
        id: m.userId || m.id,
        user_id: m.userId || m.id,
        full_name: m.name,
        invited_email: m.email,
        role: m.role,
        status: m.status === 'active' ? 'accepted' : 'pending',
        avatarColor: m.avatarColor,
      })));
    } else {
      setGroup(null);
      setMembers([]);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      if (isDemo) {
        const data = await fetchFamilyGroup();
        setGroup(data?.group ?? null);
        setMembers(data?.members ?? []);
        return;
      }
      loadFromLocalStore();
    } catch (err: any) {
      logger.log('[Members] Error:', err?.message);
    }
  }, [isDemo, loadFromLocalStore]);

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

  // ---------------------------------------------------------------------------
  // Computed
  // ---------------------------------------------------------------------------

  const isOwner = useMemo(() => {
    if (!currentUser || !group) return false;
    return group.owner_id === currentUser.id ||
      members.some((m) => m?.user_id === currentUser.id && m?.role === 'owner');
  }, [currentUser, group, members]);

  const isAdmin = useMemo(() => {
    if (isOwner) return true;
    return members.some((m) => m?.user_id === currentUser?.id && m?.role === 'admin');
  }, [isOwner, members, currentUser]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
  }, [router]);

  const handleViewPortfolio = useCallback((member: any) => {
    const name = getMemberName(member, t);
    const isActive = member.status === 'accepted' || member.status === 'active';
    if (!isActive) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/family/member/[userId]',
      params: { userId: member.user_id || member.id, name },
    });
  }, [router, t]);

  const handleMemberPress = useCallback((member: any) => {
    const name = getMemberName(member, t);
    const isActive = member.status === 'accepted' || member.status === 'active';
    const actions: any[] = [];

    // View portfolio — always available for active members if owner/admin
    if (isActive && (isOwner || isAdmin)) {
      actions.push({
        text: t('family.viewPortfolio'),
        onPress: () => handleViewPortfolio(member),
      });
    }

    if (member?.role !== 'owner') {
      if (isOwner) {
        if (member?.role !== 'admin') {
          actions.push({
            text: t('family.promoteAdmin'),
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(t('common.success'), `${name} → Admin`);
            },
          });
        }
        if (member?.role === 'admin') {
          actions.push({
            text: t('family.demoteToMember'),
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(t('common.success'), `${name} → Member`);
            },
          });
        }
      }

      // Remove action
      const canRemove = isOwner || (isAdmin && (member?.role === 'member' || member?.role === 'viewer'));
      if (canRemove) {
        actions.push({
          text: t('family.removeFromGroup'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('family.removeMember'),
              t('family.removeConfirm'),
              [
                { text: t('family.cancel'), style: 'cancel' },
                {
                  text: t('family.removeMember'),
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      if (isDemo) {
                        await removeFamilyMember(member.id);
                      } else {
                        const gId = useFamilyStore.getState().activeGroupId;
                        if (gId) familyStore.removeMember(gId, member.id);
                      }
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                      await loadData();
                    } catch (err: any) {
                      Alert.alert(t('common.error'), err?.message || t('family.removeError'));
                    }
                  },
                },
              ],
            );
          },
        });
      }
    }

    if (actions.length === 0) return;
    actions.push({ text: t('family.cancel'), style: 'cancel' });
    Alert.alert(name, '', actions);
  }, [isOwner, isAdmin, isDemo, familyStore, loadData, handleViewPortfolio, t]);

  const handleShareLink = useCallback(async () => {
    const groupName = group?.name || 'ZURT';
    const message = t('family.whatsAppMessage').replace('{group}', groupName);
    try {
      await Share.share({ message });
    } catch {
      // User cancelled
    }
    setInviteSheetVisible(false);
  }, [group, t]);

  const handleInviteByEmail = useCallback(async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert(t('common.error'), t('family.invalidEmail'));
      return;
    }

    setInviting(true);
    try {
      if (isDemo) {
        await inviteFamilyMember(email, 'member');
      } else {
        const gId = useFamilyStore.getState().activeGroupId;
        if (gId) {
          const memberName = email.split('@')[0];
          familyStore.addMember(gId, memberName, email, 'member');
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setInviteEmail('');
      setInviteSheetVisible(false);
      await loadData();
    } catch (err: any) {
      const msg = (err?.message ?? '').toLowerCase();
      if (msg.includes('already') || msg.includes('já')) {
        Alert.alert('', t('family.alreadyInvited'));
      } else {
        Alert.alert(t('common.error'), err?.message || t('family.inviteError'));
      }
    } finally {
      setInviting(false);
    }
  }, [inviteEmail, isDemo, familyStore, loadData, t]);

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
        <Text style={styles.headerTitle}>{t('family.manageMembers')}</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <SkeletonList count={4} />
        </View>
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
          {members.map((member, i) => {
            const name = getMemberName(member, t);
            const roleColor = ROLE_COLORS[member.role] || ROLE_COLORS.member;
            const avatarBg = member.avatarColor || AVATAR_COLORS[i % AVATAR_COLORS.length];
            const isActive = member.status === 'accepted' || member.status === 'active';
            const canTap = isOwner || isAdmin;

            return (
              <TouchableOpacity
                key={member.id || i}
                style={styles.memberCard}
                onPress={() => canTap && handleMemberPress(member)}
                activeOpacity={canTap ? 0.7 : 1}
                disabled={!canTap}
              >
                <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
                  <Text style={styles.avatarText}>{getInitial(name)}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName} numberOfLines={1}>{name}</Text>
                  <Text style={styles.memberEmail} numberOfLines={1}>
                    {member.invited_email || member.email || ''}
                  </Text>
                </View>
                <View style={styles.memberMeta}>
                  <View style={[styles.roleBadge, { backgroundColor: roleColor + '25' }]}>
                    <Text style={[styles.roleBadgeText, { color: roleColor }]}>
                      {t(`family.${member.role}`)}
                    </Text>
                  </View>
                  <Badge
                    value={isActive ? t('family.active') : t('family.pending')}
                    variant={isActive ? 'positive' : 'warning'}
                    size="sm"
                  />
                </View>
                {/* View portfolio button for active members */}
                {isActive && (isOwner || isAdmin) && (
                  <TouchableOpacity
                    style={styles.viewPortfolioBtn}
                    onPress={() => handleViewPortfolio(member)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.6}
                  >
                    <AppIcon name="chart" size={16} color={colors.accent} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* FAB */}
      {(isOwner || isAdmin) && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setInviteSheetVisible(true);
          }}
          activeOpacity={0.7}
        >
          <AppIcon name="add" size={24} color={colors.background} />
          <Text style={styles.fabText}>{t('family.inviteMember')}</Text>
        </TouchableOpacity>
      )}

      {/* Invite Bottom Sheet */}
      <BottomSheet
        visible={inviteSheetVisible}
        onClose={() => { setInviteSheetVisible(false); setInviteEmail(''); }}
        title={t('family.inviteMember')}
      >
        <View style={styles.sheetContent}>
          {/* Share link option */}
          <TouchableOpacity style={styles.sheetOption} onPress={handleShareLink} activeOpacity={0.7}>
            <View style={[styles.sheetOptionIcon, { backgroundColor: colors.accent + '20' }]}>
              <AppIcon name="send" size={20} color={colors.accent} />
            </View>
            <View style={styles.sheetOptionInfo}>
              <Text style={styles.sheetOptionTitle}>{t('family.shareLink')}</Text>
              <Text style={styles.sheetOptionDesc}>{t('family.inviteWhatsApp')}</Text>
            </View>
            <AppIcon name="chevron" size={14} color={colors.text.muted} />
          </TouchableOpacity>

          {/* Email invite */}
          <View style={styles.sheetDivider} />
          <Text style={styles.sheetLabel}>{t('family.inviteEmail')}</Text>
          <View style={styles.emailRow}>
            <TextInput
              style={styles.emailInput}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder={t('family.emailPlaceholder')}
              placeholderTextColor={colors.text.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !inviteEmail.trim() && { opacity: 0.5 }]}
              onPress={handleInviteByEmail}
              activeOpacity={0.7}
              disabled={!inviteEmail.trim() || inviting}
            >
              <Text style={styles.sendBtnText}>
                {inviting ? '...' : t('family.sendInvite')}
              </Text>
            </TouchableOpacity>
          </View>
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
    loadingWrap: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 120,
    },

    // Member card
    memberCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      marginBottom: spacing.sm,
      gap: spacing.md,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    memberInfo: {
      flex: 1,
    },
    memberName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
    },
    memberEmail: {
      fontSize: 12,
      color: colors.text.muted,
      marginTop: 2,
    },
    memberMeta: {
      alignItems: 'flex-end',
      gap: spacing.xs,
    },
    roleBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.sm,
    },
    roleBadgeText: {
      fontSize: 10,
      fontWeight: '600',
    },
    viewPortfolioBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.accent + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: spacing.sm,
    },

    // FAB
    fab: {
      position: 'absolute',
      bottom: 32,
      right: spacing.xl,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: radius.full,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      gap: spacing.sm,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    fabText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.background,
    },

    // Bottom sheet content
    sheetContent: {
      paddingBottom: spacing.xl,
    },
    sheetOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.lg,
    },
    sheetOptionIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetOptionInfo: {
      flex: 1,
    },
    sheetOptionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
    },
    sheetOptionDesc: {
      fontSize: 12,
      color: colors.text.muted,
      marginTop: 2,
    },
    sheetDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.lg,
    },
    sheetLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: spacing.md,
    },
    emailRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    emailInput: {
      flex: 1,
      backgroundColor: colors.input,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: 14,
      color: colors.text.primary,
    },
    sendBtn: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      justifyContent: 'center',
    },
    sendBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.background,
    },
  });
