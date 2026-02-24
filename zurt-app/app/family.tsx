// =============================================================================
// ZURT Wealth Intelligence - Family Group Screen
// Complete family management: create, invite, visibility, pending invites, education
// =============================================================================

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { AppIcon } from '../src/hooks/useIcon';
import {
  fetchFamilyGroup,
  createFamilyGroup,
  inviteFamilyMember,
  fetchFamilySummary,
  fetchPendingInvites,
  acceptFamilyInvite,
  rejectFamilyInvite,
  updateMemberVisibility,
  removeFamilyMember,
  fetchMemberProfile,
  updateMemberDelegation,
  isDemoMode,
} from '../src/services/api';
import { logger } from '../src/utils/logger';
import { formatCurrency } from '../src/utils/formatters';

// =============================================================================
// Constants
// =============================================================================

const ROLE_COLORS: Record<string, string> = {
  owner: '#00D4AA',
  spouse: '#45B7D1',
  child: '#FFD93D',
  member: '#A0AEC0',
};

const VISIBILITY_ICON_NAMES: Record<string, 'eye' | 'info' | 'unlock'> = {
  total: 'eye',
  detailed: 'info',
  full: 'unlock',
};

// =============================================================================
// Helpers
// =============================================================================

function getInitial(name: string): string {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

function getMemberName(member: any): string {
  if (!member) return 'Desconhecido';
  return member.full_name || member.name || member.email || member.invited_email || 'Membro';
}

// =============================================================================
// Main Screen
// =============================================================================

export default function FamilyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useSettingsStore((s) => s.t);
  const colors = useSettingsStore((s) => s.colors);
  const currency = useSettingsStore((s) => s.currency);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const currentUser = useAuthStore((s) => s.user);
  const isDemo = isDemoMode();

  // State
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create group
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  // Invite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState('');

  // Visibility modal
  const [visModalVisible, setVisModalVisible] = useState(false);
  const [visModalMember, setVisModalMember] = useState<any>(null);
  const [visModalValue, setVisModalValue] = useState('total');
  const [savingVisibility, setSavingVisibility] = useState(false);

  // Member profile modal
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileMember, setProfileMember] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Delegation modal
  const [delegationModalVisible, setDelegationModalVisible] = useState(false);
  const [delegationMember, setDelegationMember] = useState<any>(null);
  const [delegationSelection, setDelegationSelection] = useState<string[]>([]);
  const [savingDelegation, setSavingDelegation] = useState(false);

  // Pending invite actions
  const [acceptingToken, setAcceptingToken] = useState<string | null>(null);
  const [rejectingToken, setRejectingToken] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    try {
      const [familyData, summaryData, pendingData] = await Promise.all([
        fetchFamilyGroup(),
        fetchFamilySummary(),
        fetchPendingInvites(),
      ]);
      setGroup(familyData?.group ?? null);
      setMembers(familyData?.members ?? []);
      setSummary(summaryData);
      setPendingInvites(pendingData?.invites ?? []);
    } catch (err: any) {
      logger.log('[Family] Error loading:', err?.message);
      setGroup(null);
      setMembers([]);
    }
  }, []);

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
  const totalWealth = useMemo(() => {
    return summary?.totalNetWorth ?? members
      .filter((m) => m?.status === 'accepted')
      .reduce((sum: number, m: any) => sum + (parseFloat(m?.netWorth ?? m?.net_worth ?? '0') || 0), 0);
  }, [summary, members]);

  const acceptedMembers = useMemo(() => members.filter((m) => m?.status === 'accepted'), [members]);
  const isOwner = useMemo(() => {
    if (!currentUser || !group) return false;
    return group.owner_id === currentUser.id || members.some((m) => m?.user_id === currentUser.id && m?.role === 'owner');
  }, [currentUser, group, members]);

  const summaryMembers = useMemo(() => {
    return summary?.members ?? acceptedMembers.map((m: any) => ({
      full_name: getMemberName(m),
      role: m?.role,
      netWorth: parseFloat(m?.netWorth ?? m?.net_worth ?? '0') || 0,
    }));
  }, [summary, acceptedMembers]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);

  const handleCreateGroup = useCallback(async () => {
    const name = groupName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await createFamilyGroup(name);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setGroupName('');
      await loadData();
    } catch (err: any) {
      const msg = (err?.message ?? '').toLowerCase();
      if (msg.includes('400') || msg.includes('já possui') || msg.includes('ja possui') || msg.includes('already')) {
        await loadData();
      } else {
        Alert.alert(t('common.error'), err?.message || t('family.createError'));
      }
    } finally {
      setCreating(false);
    }
  }, [groupName, loadData]);

  const handleInvite = useCallback(async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert(t('common.error'), t('family.invalidEmail'));
      return;
    }
    setInviting(true);
    setInviteFeedback('');
    try {
      await inviteFamilyMember(email, inviteRole);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setInviteFeedback(t('family.inviteEmailSent'));
      setInviteEmail('');
      setInviteRole('member');
      await loadData();
    } catch (err: any) {
      const msg = (err?.message ?? '').toLowerCase();
      if (msg.includes('already') || msg.includes('já') || msg.includes('ja ')) {
        Alert.alert('', t('family.alreadyInvited'));
      } else {
        Alert.alert(t('common.error'), err?.message || t('family.inviteError'));
      }
    } finally {
      setInviting(false);
    }
  }, [inviteEmail, inviteRole, loadData, t]);

  const handleAcceptInvite = useCallback(async (token: string) => {
    setAcceptingToken(token);
    try {
      await acceptFamilyInvite(token);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadData();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('family.acceptError'));
    } finally {
      setAcceptingToken(null);
    }
  }, [loadData]);

  const handleRejectInvite = useCallback(async (token: string) => {
    setRejectingToken(token);
    try {
      await rejectFamilyInvite(token);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await loadData();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('family.rejectError'));
    } finally {
      setRejectingToken(null);
    }
  }, [loadData]);

  const handleViewMemberProfile = useCallback(async (member: any) => {
    setProfileMember(member);
    setProfileData(null);
    setProfileModalVisible(true);
    setProfileLoading(true);
    try {
      const data = await fetchMemberProfile(member.id);
      setProfileData(data);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const handleOpenDelegation = useCallback((member: any) => {
    if (!member) return;
    setDelegationMember(member);
    setDelegationSelection(member?.canViewMembers ?? []);
    setDelegationModalVisible(true);
  }, []);

  const handleSaveDelegation = useCallback(async () => {
    if (!delegationMember) return;
    setSavingDelegation(true);
    try {
      await updateMemberDelegation(delegationMember.id, delegationSelection);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDelegationModalVisible(false);
      setDelegationMember(null);
      await loadData();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('family.delegationError'));
    } finally {
      setSavingDelegation(false);
    }
  }, [delegationMember, delegationSelection, loadData]);

  const handleMemberPress = useCallback((member: any) => {
    if (!member || member?.status !== 'accepted') return;

    if (isOwner && member?.role !== 'owner') {
      // Owner sees full action menu for non-owner members
      Alert.alert(
        getMemberName(member),
        '',
        [
          {
            text: t('family.viewProfile'),
            onPress: () => handleViewMemberProfile(member),
          },
          {
            text: t('family.changeVisibility'),
            onPress: () => {
              setVisModalMember(member);
              setVisModalValue(member?.visibility || 'total');
              setVisModalVisible(true);
            },
          },
          {
            text: t('family.delegateAccess'),
            onPress: () => handleOpenDelegation(member),
          },
          {
            text: t('family.removeMember'),
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
                        await removeFamilyMember(member.id);
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        await loadData();
                      } catch (err: any) {
                        Alert.alert(t('common.error'), err?.message || t('family.removeError'));
                      }
                    },
                  },
                ],
              );
            },
          },
          { text: t('family.cancel'), style: 'cancel' },
        ],
      );
    } else if (!isOwner) {
      // Non-owner: can only view profile of delegated members
      const canView = member?.canViewMembers ?? [];
      const currentMember = members.find((m) => m?.user_id === currentUser?.id);
      const delegated = currentMember?.canViewMembers ?? [];
      if (delegated.includes(member?.user_id) || delegated.includes(member?.id)) {
        handleViewMemberProfile(member);
      }
    }
  }, [isOwner, t, loadData, handleViewMemberProfile, handleOpenDelegation, members, currentUser]);

  const handleSaveVisibility = useCallback(async () => {
    if (!visModalMember) return;
    setSavingVisibility(true);
    try {
      await updateMemberVisibility(visModalMember.id, visModalValue);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setVisModalVisible(false);
      setVisModalMember(null);
      await loadData();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('family.visibilityError'));
    } finally {
      setSavingVisibility(false);
    }
  }, [visModalMember, visModalValue, loadData]);

  // ---------------------------------------------------------------------------
  // Role options for invite
  // ---------------------------------------------------------------------------
  const roleOptions = useMemo(() => [
    { key: 'spouse', label: t('family.spouse'), iconName: 'spouse' as const },
    { key: 'child', label: t('family.child'), iconName: 'child' as const },
    { key: 'member', label: t('family.member'), iconName: 'person' as const },
  ], [t]);

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <AppIcon name="back" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('family.title')}</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('family.title')}</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
          }
        >
          {/* ============================================================== */}
          {/* Pending Invites for current user                                */}
          {/* ============================================================== */}
          {pendingInvites.length > 0 && (
            <View style={styles.pendingSection}>
              <Text style={styles.sectionTitle}>{t('family.pendingInvites')}</Text>
              {pendingInvites.map((invite: any, idx: number) => (
                <View key={`pending-${idx}-${invite.token}`} style={styles.pendingCard}>
                  <Text style={styles.pendingText}>
                    {(t('family.youAreInvited') || '')
                      .replace('{group}', invite.group_name || '?')
                      .replace('{inviter}', invite.inviter_name || invite.inviter_email || '?')}
                  </Text>
                  <View style={styles.pendingActions}>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleAcceptInvite(invite.token)}
                      disabled={acceptingToken === invite.token}
                      activeOpacity={0.7}
                    >
                      {acceptingToken === invite.token ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.acceptBtnText}>{t('family.accept')}</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleRejectInvite(invite.token)}
                      disabled={rejectingToken === invite.token}
                      activeOpacity={0.7}
                    >
                      {rejectingToken === invite.token ? (
                        <ActivityIndicator size="small" color="#FF6B6B" />
                      ) : (
                        <Text style={styles.rejectBtnText}>{t('family.reject')}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ============================================================== */}
          {/* No Group — Empty State                                          */}
          {/* ============================================================== */}
          {group === null ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyEmoji}><AppIcon name="family" size={64} color={colors.accent} /></View>
              <Text style={styles.emptyTitle}>{t('family.noGroupTitle')}</Text>
              <Text style={styles.emptyDesc}>{t('family.noGroupDesc')}</Text>
              <TextInput
                style={styles.createInput}
                value={groupName}
                onChangeText={setGroupName}
                placeholder={t('family.groupNamePlaceholder')}
                placeholderTextColor={colors.text.muted}
                editable={!creating}
              />
              <TouchableOpacity
                style={[styles.createBtn, (!groupName.trim() || creating) && { opacity: 0.5 }]}
                onPress={handleCreateGroup}
                disabled={!groupName.trim() || creating}
                activeOpacity={0.8}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.createBtnText}>{t('family.createGroup')}</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* ========================================================== */}
              {/* Demo Banner                                                  */}
              {/* ========================================================== */}
              {isDemo && (
                <View style={styles.demoBanner}>
                  <Text style={styles.demoBannerText}>
                    Modo demonstração — dados fictícios
                  </Text>
                </View>
              )}

              {/* ========================================================== */}
              {/* C1. Total Wealth Card                                        */}
              {/* ========================================================== */}
              <View style={styles.wealthCard}>
                <Text style={styles.wealthLabel}>{t('family.totalWealth')}</Text>
                <Text style={styles.wealthValue}>{formatCurrency(totalWealth, currency)}</Text>
                <Text style={styles.wealthSub}>
                  {(t('family.activeMembers') || '{n} membros ativos').replace('{n}', String(acceptedMembers.length))}
                </Text>

                {/* Bar chart */}
                {summaryMembers.length > 0 && totalWealth > 0 && (
                  <>
                    <View style={styles.barChart}>
                      {summaryMembers.filter(Boolean).map((m: any, i: number) => {
                        const nw = parseFloat(m?.netWorth ?? m?.net_worth ?? '0') || 0;
                        const pct = totalWealth > 0 ? (nw / totalWealth) * 100 : 0;
                        return (
                          <View
                            key={`bar-${i}`}
                            style={[
                              styles.barSeg,
                              {
                                width: `${Math.max(pct, 2)}%` as any,
                                backgroundColor: ROLE_COLORS[m?.role] || '#A0AEC0',
                              },
                            ]}
                          />
                        );
                      })}
                    </View>
                    <View style={styles.barLegend}>
                      {summaryMembers.filter(Boolean).map((m: any, i: number) => {
                        const name = m?.full_name || m?.name || '';
                        const nw = parseFloat(m?.netWorth ?? m?.net_worth ?? '0') || 0;
                        const pct = totalWealth > 0 ? (nw / totalWealth) * 100 : 0;
                        return (
                          <View key={`leg-${i}`} style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: ROLE_COLORS[m?.role] || '#A0AEC0' }]} />
                            <Text style={styles.legendText} numberOfLines={1}>
                              {(name.split(' ')[0] || '?')} ({pct.toFixed(0)}%)
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </>
                )}
              </View>

              {/* ========================================================== */}
              {/* C2. Members List                                             */}
              {/* ========================================================== */}
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>{t('family.members')}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{members.length}</Text>
                </View>
              </View>

              {members.filter(Boolean).map((member: any, idx: number) => {
                const name = getMemberName(member);
                const role = member?.role || 'member';
                const isPending = member?.status === 'pending';
                const isAccepted = member?.status === 'accepted';
                const roleColor = ROLE_COLORS[role] || '#A0AEC0';
                const nw = parseFloat(member?.netWorth ?? member?.net_worth ?? '0') || 0;
                const visIconName = VISIBILITY_ICON_NAMES[member?.visibility] || VISIBILITY_ICON_NAMES.total;

                return (
                  <TouchableOpacity
                    key={`member-${idx}-${member.id}`}
                    style={styles.memberCard}
                    onPress={() => handleMemberPress(member)}
                    onLongPress={() => handleMemberPress(member)}
                    activeOpacity={0.8}
                    delayLongPress={400}
                  >
                    <View style={styles.memberRow}>
                      {/* Avatar */}
                      <View style={[styles.avatar, { backgroundColor: roleColor }]}>
                        <Text style={styles.avatarText}>{getInitial(name)}</Text>
                      </View>

                      {/* Info */}
                      <View style={styles.memberInfo}>
                        <View style={styles.nameRow}>
                          <Text style={styles.memberName} numberOfLines={1}>{name}</Text>
                          <View style={[styles.roleBadge, { backgroundColor: roleColor + '20' }]}>
                            <Text style={[styles.roleBadgeText, { color: roleColor }]}>
                              {t('family.' + role) || role}
                            </Text>
                          </View>
                        </View>
                        {isPending ? (
                          <Text style={styles.pendingLabel}>{t('family.inviteSent') || 'Convite enviado'}</Text>
                        ) : isAccepted && nw > 0 ? (
                          <Text style={styles.memberWealth}>{formatCurrency(nw, currency)}</Text>
                        ) : null}
                      </View>

                      {/* Right: status + visibility */}
                      <View style={styles.memberRight}>
                        <View style={[styles.statusBadge, isPending ? styles.statusPending : styles.statusActive]}>
                          <Text style={[styles.statusText, isPending ? styles.statusTextPending : styles.statusTextActive]}>
                            {isPending ? t('family.pending') : t('family.active')}
                          </Text>
                        </View>
                        {isAccepted && (
                          <AppIcon name={visIconName} size={14} color={colors.text.muted} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* ========================================================== */}
              {/* C3. Invite Section                                           */}
              {/* ========================================================== */}
              <View style={styles.inviteCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
                  <AppIcon name="mail" size={18} color={colors.text.primary} />
                  <Text style={[styles.inviteTitle, { marginBottom: 0, marginLeft: 8 }]}>{t('family.inviteSection')}</Text>
                </View>

                <TextInput
                  style={styles.inviteInput}
                  value={inviteEmail}
                  onChangeText={(v) => { setInviteEmail(v); setInviteFeedback(''); }}
                  placeholder={t('family.emailPlaceholder')}
                  placeholderTextColor={colors.text.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!inviting}
                />

                <Text style={styles.roleSelectLabel}>{t('family.selectRole')}</Text>
                <View style={styles.roleRow}>
                  {roleOptions.map((opt) => {
                    const selected = inviteRole === opt.key;
                    const roleCol = ROLE_COLORS[opt.key] || '#A0AEC0';
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={[
                          styles.roleChip,
                          selected && { backgroundColor: roleCol, borderColor: roleCol },
                        ]}
                        onPress={() => setInviteRole(opt.key)}
                        disabled={inviting}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <AppIcon name={opt.iconName} size={14} color={selected ? '#FFF' : colors.text.secondary} />
                          <Text style={[styles.roleChipText, selected && { color: '#FFF' }]}>
                            {opt.label}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={[styles.inviteBtn, (inviting || !inviteEmail.trim()) && { opacity: 0.5 }]}
                  onPress={handleInvite}
                  disabled={inviting || !inviteEmail.trim()}
                  activeOpacity={0.8}
                >
                  {inviting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.inviteBtnText}>{t('family.sendInvite')}</Text>
                  )}
                </TouchableOpacity>

                {inviteFeedback !== '' && (
                  <Text style={styles.inviteFeedback}>{inviteFeedback}</Text>
                )}
              </View>

              {/* ========================================================== */}
              {/* C5. Education Section                                        */}
              {/* ========================================================== */}
              <View style={styles.eduCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
                  <AppIcon name="education" size={20} color={colors.text.primary} />
                  <Text style={[styles.eduTitle, { marginBottom: 0, marginLeft: 8 }]}>{t('family.educationTitle')}</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.eduScroll}
                >
                  {([
                    { iconName: 'chart' as const, title: t('family.edu1'), desc: t('family.edu1Desc') },
                    { iconName: 'goal' as const, title: t('family.edu2'), desc: t('family.edu2Desc') },
                    { iconName: 'idea' as const, title: t('family.edu3'), desc: t('family.edu3Desc') },
                  ]).map((item, i) => (
                    <View key={`edu-${i}`} style={styles.eduMini}>
                      <View style={{ marginBottom: spacing.sm }}><AppIcon name={item.iconName} size={28} color={colors.accent} /></View>
                      <Text style={styles.eduMiniTitle}>{item.title}</Text>
                      <Text style={styles.eduMiniDesc}>{item.desc}</Text>
                    </View>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.askAgentBtn}
                  onPress={() => router.push('/(tabs)/agent')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.askAgentText}>{t('family.askAgent')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={{ height: insets.bottom + 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ================================================================== */}
      {/* Visibility Modal                                                     */}
      {/* ================================================================== */}
      <Modal
        visible={visModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !savingVisibility && setVisModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('family.changeVisibility')}</Text>

            {([
              { key: 'total', label: t('family.visibilityTotal'), desc: t('family.visDescTotal'), iconName: 'eye' as const },
              { key: 'detailed', label: t('family.visibilityDetailed'), desc: t('family.visDescDetailed'), iconName: 'info' as const },
              { key: 'full', label: t('family.visibilityFull'), desc: t('family.visDescFull'), iconName: 'unlock' as const },
            ]).map((opt) => {
              const selected = visModalValue === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.visOption, selected && styles.visOptionSelected]}
                  onPress={() => setVisModalValue(opt.key)}
                  activeOpacity={0.7}
                >
                  <AppIcon name={opt.iconName} size={24} color={selected ? colors.accent : colors.text.secondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.visOptionLabel, selected && { color: colors.accent }]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.visOptionDesc}>{opt.desc}</Text>
                  </View>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setVisModalVisible(false)}
                disabled={savingVisibility}
              >
                <Text style={styles.modalCancelText}>{t('family.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, savingVisibility && { opacity: 0.5 }]}
                onPress={handleSaveVisibility}
                disabled={savingVisibility}
              >
                {savingVisibility ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalSaveText}>{t('family.save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================================== */}
      {/* Member Profile Modal                                                */}
      {/* ================================================================== */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('family.viewProfile')}</Text>

            {profileLoading ? (
              <ActivityIndicator size="large" color={colors.accent} style={{ marginVertical: spacing.xl }} />
            ) : profileData ? (
              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                <View style={styles.profileHeader}>
                  <View style={[styles.avatar, { backgroundColor: ROLE_COLORS[profileMember?.role] || '#A0AEC0' }]}>
                    <Text style={styles.avatarText}>{getInitial(profileData.full_name ?? getMemberName(profileMember))}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={styles.memberName}>{profileData.full_name ?? getMemberName(profileMember)}</Text>
                    <Text style={styles.pendingLabel}>{t('family.' + (profileMember?.role || 'member'))}</Text>
                  </View>
                </View>

                <View style={styles.profileStat}>
                  <Text style={styles.profileStatLabel}>{t('family.totalWealth')}</Text>
                  <Text style={styles.profileStatValue}>{formatCurrency(profileData.netWorth ?? 0, currency)}</Text>
                </View>

                {profileData.accounts?.length > 0 && (
                  <View style={styles.profileSection}>
                    <Text style={styles.profileSectionTitle}>{t('family.accounts')}</Text>
                    {profileData.accounts.map((acc: any, i: number) => (
                      <View key={`acc-${i}`} style={styles.profileRow}>
                        <Text style={styles.profileRowLabel}>{acc.name}</Text>
                        <Text style={styles.profileRowValue}>{formatCurrency(acc.balance ?? 0, currency)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {profileData.investments?.length > 0 && (
                  <View style={styles.profileSection}>
                    <Text style={styles.profileSectionTitle}>{t('family.investments')}</Text>
                    {profileData.investments.map((inv: any, i: number) => (
                      <View key={`inv-${i}`} style={styles.profileRow}>
                        <Text style={styles.profileRowLabel}>{inv.name}</Text>
                        <Text style={styles.profileRowValue}>{formatCurrency(inv.value ?? 0, currency)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {profileData.cards?.length > 0 && profileMember?.visibility === 'full' && (
                  <View style={styles.profileSection}>
                    <Text style={styles.profileSectionTitle}>{t('family.cards')}</Text>
                    {profileData.cards.map((card: any, i: number) => (
                      <View key={`card-${i}`} style={styles.profileRow}>
                        <Text style={styles.profileRowLabel}>{card.name} ****{card.lastFour}</Text>
                        <Text style={styles.profileRowValue}>
                          {formatCurrency(card.used ?? 0, currency)} / {formatCurrency(card.limit ?? 0, currency)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            ) : (
              <Text style={styles.pendingLabel}>{t('common.error')}</Text>
            )}

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setProfileModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================================================================== */}
      {/* Delegation Modal                                                     */}
      {/* ================================================================== */}
      <Modal
        visible={delegationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !savingDelegation && setDelegationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('family.delegateAccess')}</Text>
            <Text style={styles.visOptionDesc}>
              {(t('family.delegateDesc') || 'Selecione quais membros {name} pode visualizar')
                .replace('{name}', getMemberName(delegationMember))}
            </Text>

            {acceptedMembers
              .filter((m) => m?.id !== delegationMember?.id && m?.role !== 'owner')
              .map((m) => {
                const memberId = m?.user_id || m?.id;
                const isSelected = delegationSelection.includes(memberId);
                return (
                  <TouchableOpacity
                    key={`deleg-${m.id}`}
                    style={[styles.visOption, isSelected && styles.visOptionSelected]}
                    onPress={() => {
                      setDelegationSelection((prev) =>
                        isSelected ? prev.filter((id) => id !== memberId) : [...prev, memberId],
                      );
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.avatar, { width: 32, height: 32, borderRadius: 16, backgroundColor: ROLE_COLORS[m?.role] || '#A0AEC0' }]}>
                      <Text style={[styles.avatarText, { fontSize: 14 }]}>{getInitial(getMemberName(m))}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.visOptionLabel, isSelected && { color: colors.accent }]}>
                        {getMemberName(m)}
                      </Text>
                      <Text style={styles.visOptionDesc}>{t('family.' + (m?.role || 'member'))}</Text>
                    </View>
                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDelegationModalVisible(false)}
                disabled={savingDelegation}
              >
                <Text style={styles.modalCancelText}>{t('family.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, savingDelegation && { opacity: 0.5 }]}
                onPress={handleSaveDelegation}
                disabled={savingDelegation}
              >
                {savingDelegation ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalSaveText}>{t('family.save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scrollContent: { padding: spacing.xl },

    // Header
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    backIcon: { fontSize: 22, color: colors.text.primary },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },

    // Demo banner
    demoBanner: {
      backgroundColor: '#FFD93D20',
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: '#E6A817',
      padding: spacing.sm,
      marginBottom: spacing.lg,
      alignItems: 'center',
    },
    demoBannerText: { fontSize: 12, color: '#E6A817' },

    // Empty state
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xxxl,
      alignItems: 'center',
      marginTop: spacing.xl,
    },
    emptyEmoji: { fontSize: 64, marginBottom: spacing.xl },
    emptyTitle: { fontSize: 22, fontWeight: '700', color: colors.text.primary, textAlign: 'center', marginBottom: spacing.md },
    emptyDesc: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xxl, paddingHorizontal: spacing.md },
    createInput: {
      width: '100%',
      backgroundColor: colors.input,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md + 2,
      fontSize: 15,
      color: colors.text.primary,
      marginBottom: spacing.lg,
    },
    createBtn: {
      width: '100%',
      backgroundColor: '#00D4AA',
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      alignItems: 'center',
    },
    createBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

    // Wealth card
    wealthCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      borderLeftColor: '#00D4AA',
      padding: spacing.xl,
      marginBottom: spacing.xl,
    },
    wealthLabel: { fontSize: 13, fontWeight: '600', color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
    wealthValue: { fontSize: 28, fontWeight: '800', color: '#00D4AA', marginBottom: spacing.xs },
    wealthSub: { fontSize: 13, color: colors.text.muted, marginBottom: spacing.lg },

    // Bar
    barChart: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: colors.border, marginBottom: spacing.sm },
    barSeg: { height: '100%' },
    barLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, color: colors.text.muted, maxWidth: 120 },

    // Section
    sectionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text.primary },
    countBadge: { backgroundColor: colors.accent + '20', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
    countBadgeText: { fontSize: 12, fontWeight: '600', color: colors.accent },

    // Member card
    memberCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      marginBottom: spacing.sm,
    },
    memberRow: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
    avatarText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    memberInfo: { flex: 1, marginRight: spacing.sm },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2 },
    memberName: { fontSize: 15, fontWeight: '600', color: colors.text.primary, flexShrink: 1 },
    roleBadge: { borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1 },
    roleBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    pendingLabel: { fontSize: 12, color: '#E6A817', fontStyle: 'italic' },
    memberWealth: { fontSize: 14, fontWeight: '600', color: '#00D4AA' },
    memberRight: { alignItems: 'flex-end', gap: 4 },
    statusBadge: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
    statusActive: { backgroundColor: '#00D4AA20' },
    statusPending: { backgroundColor: '#FFD93D20' },
    statusText: { fontSize: 10, fontWeight: '600' },
    statusTextActive: { color: '#00D4AA' },
    statusTextPending: { color: '#E6A817' },
    visIcon: { fontSize: 14 },

    // Invite card
    inviteCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xl,
      marginTop: spacing.lg,
      marginBottom: spacing.lg,
    },
    inviteTitle: { fontSize: 17, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.lg },
    inviteInput: {
      backgroundColor: colors.input,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: 15,
      color: colors.text.primary,
      marginBottom: spacing.md,
    },
    roleSelectLabel: { fontSize: 12, fontWeight: '600', color: colors.text.secondary, textTransform: 'uppercase', marginBottom: spacing.sm },
    roleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    roleChip: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      backgroundColor: colors.card,
    },
    roleChipText: { fontSize: 12, fontWeight: '600', color: colors.text.secondary },
    inviteBtn: {
      backgroundColor: '#00D4AA',
      borderRadius: radius.lg,
      paddingVertical: spacing.lg - 2,
      alignItems: 'center',
    },
    inviteBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
    inviteFeedback: { fontSize: 13, color: '#00D4AA', textAlign: 'center', marginTop: spacing.md, lineHeight: 20 },

    // Pending invites
    pendingSection: { marginBottom: spacing.lg },
    pendingCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: '#FFD93D',
      padding: spacing.xl,
      marginTop: spacing.sm,
    },
    pendingText: { fontSize: 14, color: colors.text.primary, lineHeight: 22, marginBottom: spacing.md },
    pendingActions: { flexDirection: 'row', gap: spacing.md },
    acceptBtn: { flex: 1, backgroundColor: '#00D4AA', borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
    acceptBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
    rejectBtn: { flex: 1, borderWidth: 1, borderColor: '#FF6B6B', borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
    rejectBtnText: { fontSize: 14, fontWeight: '600', color: '#FF6B6B' },

    // Education
    eduCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xl,
      marginBottom: spacing.lg,
    },
    eduTitle: { fontSize: 17, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.lg },
    eduScroll: { gap: spacing.md, paddingRight: spacing.md },
    eduMini: {
      width: 160,
      backgroundColor: colors.cardAlt,
      borderRadius: radius.md,
      padding: spacing.lg,
    },
    eduMiniIcon: { fontSize: 28, marginBottom: spacing.sm },
    eduMiniTitle: { fontSize: 14, fontWeight: '700', color: colors.text.primary, marginBottom: 4 },
    eduMiniDesc: { fontSize: 12, color: colors.text.secondary, lineHeight: 16 },
    askAgentBtn: {
      backgroundColor: colors.accent + '15',
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    askAgentText: { fontSize: 14, fontWeight: '600', color: colors.accent },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xxl,
      width: '100%',
      maxWidth: 400,
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.xl, textAlign: 'center' },
    visOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.sm,
    },
    visOptionSelected: { borderColor: colors.accent, backgroundColor: colors.accent + '08' },
    visOptionIcon: { fontSize: 24 },
    visOptionLabel: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
    visOptionDesc: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    radioSelected: { borderColor: colors.accent },
    radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent },
    modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    modalCancelBtn: {
      flex: 1,
      paddingVertical: spacing.lg,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    modalCancelText: { fontSize: 15, fontWeight: '600', color: colors.text.secondary },
    modalSaveBtn: {
      flex: 1,
      paddingVertical: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: colors.accent,
      alignItems: 'center',
    },
    modalSaveText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

    // Profile modal
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    profileStat: {
      backgroundColor: colors.cardAlt,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    profileStatLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.secondary,
      textTransform: 'uppercase',
      marginBottom: spacing.xs,
    },
    profileStatValue: {
      fontSize: 22,
      fontWeight: '800',
      color: '#00D4AA',
    },
    profileSection: {
      marginBottom: spacing.lg,
    },
    profileSectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.sm,
    },
    profileRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border + '50',
    },
    profileRowLabel: {
      fontSize: 13,
      color: colors.text.secondary,
      flex: 1,
    },
    profileRowValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.primary,
    },
  });
