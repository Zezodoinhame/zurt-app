import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
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
import { GoalCard } from '../../src/components/shared/GoalCard';
import { SectionHeader } from '../../src/components/shared/SectionHeader';
import { ErrorState } from '../../src/components/shared/ErrorState';
import { SkeletonCard, SkeletonList } from '../../src/components/skeletons/Skeleton';
import { UpgradeGate } from '../../src/components/shared/UpgradeGate';
import { Card } from '../../src/components/ui/Card';
import { formatCurrency, maskValue } from '../../src/utils/formatters';
import {
  fetchFamilyGroup,
  fetchFamilySummary,
  isDemoMode,
} from '../../src/services/api';
import { logger } from '../../src/utils/logger';
import type { FamilyGoal } from '../../src/types/family';

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

export default function FamilyDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useSettingsStore((s) => s.t);
  const colors = useSettingsStore((s) => s.colors);
  const currency = useSettingsStore((s) => s.currency);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const currentUser = useAuthStore((s) => s.user);
  const { valuesHidden } = useAuthStore();
  const isDemo = isDemoMode();
  const familyStore = useFamilyStore();

  // State
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create group modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [groupName, setGroupName] = useState('');

  // Demo goals
  const demoGoals: FamilyGoal[] = useMemo(() => [
    {
      id: 'g1',
      name: 'Viagem em Família',
      icon: 'goal',
      targetAmount: 30000,
      currentAmount: 18500,
      deadline: '2026-12',
      contributors: [
        { userId: 'demo-1', name: 'Você', amount: 12000 },
        { userId: 'demo-2', name: 'Maria', amount: 6500 },
      ],
      createdBy: 'demo-1',
    },
    {
      id: 'g2',
      name: 'Reserva de Emergência',
      icon: 'emergency',
      targetAmount: 50000,
      currentAmount: 35000,
      contributors: [
        { userId: 'demo-1', name: 'Você', amount: 20000 },
        { userId: 'demo-2', name: 'Maria', amount: 15000 },
      ],
      createdBy: 'demo-1',
    },
  ], []);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const loadFromLocalStore = useCallback(() => {
    const local: any = useFamilyStore.getState().getActiveGroup();
    if (local) {
      setGroup({ id: local.id, name: local.name, owner_id: local.ownerId, created_at: local.createdAt });
      setMembers((local.members ?? []).map((m: any) => ({
        id: m.id,
        user_id: m.id,
        full_name: m.name,
        invited_email: m.email,
        role: m.role,
        status: m.status === 'active' ? 'accepted' : 'pending',
        avatarColor: m.avatarColor,
      })));
      setSummary(null);
    } else {
      setGroup(null);
      setMembers([]);
      setSummary(null);
    }
    setError(null);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      if (isDemo) {
        const [familyData, summaryData] = await Promise.all([
          fetchFamilyGroup(),
          fetchFamilySummary(),
        ]);
        setGroup(familyData?.group ?? null);
        setMembers(familyData?.members ?? []);
        setSummary(summaryData);
        return;
      }
      loadFromLocalStore();
    } catch (err: any) {
      logger.log('[Family] Error loading:', err?.message);
      setError(err?.message || 'Error loading family data');
      setGroup(null);
      setMembers([]);
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

  const acceptedMembers = useMemo(
    () => members.filter((m) => m?.status === 'accepted'),
    [members],
  );

  const totalWealth = useMemo(() => {
    return summary?.totalNetWorth ?? acceptedMembers
      .reduce((sum: number, m: any) => sum + (parseFloat(m?.netWorth ?? m?.net_worth ?? '0') || 0), 0);
  }, [summary, acceptedMembers]);

  const summaryMembers = useMemo(() => {
    return summary?.members ?? acceptedMembers.map((m: any) => ({
      full_name: getMemberName(m, t),
      role: m?.role,
      netWorth: parseFloat(m?.netWorth ?? m?.net_worth ?? '0') || 0,
    }));
  }, [summary, acceptedMembers, t]);

  const goals = useMemo(() => isDemo ? demoGoals : [], [isDemo, demoGoals]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);

  const handleCreateGroup = useCallback(() => {
    const name = groupName.trim();
    if (!name) {
      Alert.alert(t('common.error'), t('family.groupNameRequired'));
      return;
    }
    try {
      const ownerName = currentUser?.name || t('common.you');
      const ownerEmail = currentUser?.email ?? 'user@zurt.com.br';
      familyStore.createGroup(name, ownerName, ownerEmail);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setGroupName('');
      setCreateModalVisible(false);
      loadFromLocalStore();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('family.createError'));
    }
  }, [groupName, currentUser, familyStore, loadFromLocalStore, t]);

  const display = useCallback(
    (value: number) => valuesHidden ? maskValue('', currency) : formatCurrency(value, currency),
    [valuesHidden, currency],
  );

  // ---------------------------------------------------------------------------
  // Render: loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <AppIcon name="back" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('family.title')}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.skeletonWrap}>
          <SkeletonCard />
          <SkeletonList count={3} />
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: error
  // ---------------------------------------------------------------------------

  if (error && !group) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <AppIcon name="back" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('family.title')}</Text>
          <View style={styles.placeholder} />
        </View>
        <ErrorState message={error} onRetry={loadData} />
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: no group — create
  // ---------------------------------------------------------------------------

  if (!group) {
    return (
      <UpgradeGate feature="familyGroup">
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <AppIcon name="back" size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('family.title')}</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView contentContainerStyle={styles.emptyContent}>
            <View style={styles.emptyIconWrap}>
              <AppIcon name="family" size={64} color={colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>{t('family.noGroupTitle')}</Text>
            <Text style={styles.emptyDesc}>{t('family.noGroupDesc')}</Text>

            <View style={styles.benefitsList}>
              {[
                { icon: 'chart' as const, text: t('family.benefitConsolidation') },
                { icon: 'goal' as const, text: t('family.benefitGoals') },
                { icon: 'card' as const, text: t('family.benefitCards') },
              ].map((b, i) => (
                <View key={i} style={styles.benefitRow}>
                  <AppIcon name={b.icon} size={18} color={colors.accent} />
                  <Text style={styles.benefitText}>{b.text}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => setCreateModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.createBtnText}>{t('family.createGroup')}</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Create Group Modal */}
          <Modal visible={createModalVisible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>{t('family.createGroup')}</Text>
                <TextInput
                  style={styles.modalInput}
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder={t('family.groupNamePlaceholder')}
                  placeholderTextColor={colors.text.muted}
                  autoFocus
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => { setCreateModalVisible(false); setGroupName(''); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalCancelText}>{t('family.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, !groupName.trim() && { opacity: 0.5 }]}
                    onPress={handleCreateGroup}
                    activeOpacity={0.7}
                    disabled={!groupName.trim()}
                  >
                    <Text style={styles.modalConfirmText}>{t('family.createGroup')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </UpgradeGate>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: dashboard (has group)
  // ---------------------------------------------------------------------------

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppIcon name="back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{group.name}</Text>
          <Text style={styles.headerSubtitle}>
            {t('family.memberCount').replace('{n}', String(acceptedMembers.length))}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/family/settings')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <AppIcon name="settings" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

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
        {/* Section 1: Patrimônio Consolidado */}
        <Card delay={0}>
          <Text style={styles.sectionLabel}>{t('family.consolidatedPatrimony')}</Text>
          <Text style={styles.totalWealth}>{display(totalWealth)}</Text>

          {/* Participation bar */}
          {summaryMembers.length > 0 && (
            <>
              <View style={styles.participationBar}>
                {summaryMembers.map((m: any, i: number) => {
                  const pct = totalWealth > 0 ? (m.netWorth / totalWealth) * 100 : 0;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.participationSegment,
                        {
                          flex: pct || 1,
                          backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
                          borderTopLeftRadius: i === 0 ? 4 : 0,
                          borderBottomLeftRadius: i === 0 ? 4 : 0,
                          borderTopRightRadius: i === summaryMembers.length - 1 ? 4 : 0,
                          borderBottomRightRadius: i === summaryMembers.length - 1 ? 4 : 0,
                        },
                      ]}
                    />
                  );
                })}
              </View>

              {/* Member breakdown */}
              {summaryMembers.map((m: any, i: number) => {
                const pct = totalWealth > 0 ? ((m.netWorth / totalWealth) * 100).toFixed(1) : '0';
                return (
                  <View key={i} style={styles.memberRow}>
                    <View style={[styles.memberDot, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }]} />
                    <Text style={styles.memberName} numberOfLines={1}>{m.full_name}</Text>
                    <Text style={styles.memberValue}>{display(m.netWorth)}</Text>
                    <Text style={styles.memberPct}>{pct}%</Text>
                  </View>
                );
              })}
            </>
          )}
        </Card>

        {/* Section 2: Membros (horizontal) */}
        <SectionHeader title={t('family.members')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersScroll} contentContainerStyle={styles.membersScrollContent}>
          {members.map((member, i) => {
            const name = getMemberName(member, t);
            const roleColor = ROLE_COLORS[member.role] || ROLE_COLORS.member;
            const avatarBg = member.avatarColor || AVATAR_COLORS[i % AVATAR_COLORS.length];
            return (
              <TouchableOpacity
                key={member.id || i}
                style={styles.memberAvatar}
                onPress={() => {
                  if (member.status === 'accepted' || member.status === 'active') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({ pathname: '/family/member/[userId]', params: { userId: member.user_id || member.id, name } });
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.avatarCircle, { backgroundColor: avatarBg }]}>
                  <Text style={styles.avatarInitial}>{getInitial(name)}</Text>
                </View>
                <Text style={styles.avatarName} numberOfLines={1}>{name.split(' ')[0]}</Text>
                <View style={[styles.roleBadge, { backgroundColor: roleColor + '30' }]}>
                  <Text style={[styles.roleBadgeText, { color: roleColor }]}>
                    {t(`family.${member.role}`)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          {/* Invite button */}
          <TouchableOpacity
            style={styles.memberAvatar}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/family/members');
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.avatarCircle, { backgroundColor: colors.accent + '20', borderWidth: 2, borderColor: colors.accent, borderStyle: 'dashed' }]}>
              <AppIcon name="add" size={24} color={colors.accent} />
            </View>
            <Text style={[styles.avatarName, { color: colors.accent }]}>{t('family.invite')}</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Section 3: Metas da Família */}
        {goals.length > 0 && (
          <>
            <SectionHeader title={t('family.goals')} />
            {goals.map((goal) => (
              <View key={goal.id} style={styles.goalWrap}>
                <GoalCard
                  name={goal.name}
                  icon={(goal.icon as any) || 'goal'}
                  progress={goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0}
                  currentValue={goal.currentAmount}
                  targetValue={goal.targetAmount}
                  valuesHidden={valuesHidden}
                />
                {goal.contributors.length > 0 && (
                  <View style={styles.contributorsRow}>
                    {goal.contributors.slice(0, 4).map((c, ci) => (
                      <View
                        key={ci}
                        style={[
                          styles.miniAvatar,
                          { backgroundColor: AVATAR_COLORS[ci % AVATAR_COLORS.length], marginLeft: ci > 0 ? -8 : 0 },
                        ]}
                      >
                        <Text style={styles.miniAvatarText}>{getInitial(c.name)}</Text>
                      </View>
                    ))}
                    <Text style={styles.contributorLabel}>
                      {t('family.contributors')} ({goal.contributors.length})
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {/* Section 4: Ações Rápidas */}
        <SectionHeader title={t('family.quickActions')} />
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/family/members'); }}
            activeOpacity={0.7}
          >
            <AppIcon name="person" size={22} color={colors.accent} />
            <Text style={styles.actionLabel}>{t('family.inviteMember')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/family/members'); }}
            activeOpacity={0.7}
          >
            <AppIcon name="family" size={22} color={colors.accent} />
            <Text style={styles.actionLabel}>{t('family.manageMembers')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/family/settings'); }}
            activeOpacity={0.7}
          >
            <AppIcon name="settings" size={22} color={colors.accent} />
            <Text style={styles.actionLabel}>{t('family.settings')}</Text>
          </TouchableOpacity>
        </View>
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
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      textAlign: 'center',
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 2,
    },
    placeholder: {
      width: 36,
    },
    skeletonWrap: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 100,
    },

    // Empty state
    emptyContent: {
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingTop: 60,
    },
    emptyIconWrap: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.accent + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xxl,
    },
    emptyTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    emptyDesc: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: spacing.xxl,
    },
    benefitsList: {
      alignSelf: 'stretch',
      gap: spacing.md,
      marginBottom: spacing.xxl,
    },
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
    },
    benefitText: {
      fontSize: 14,
      color: colors.text.primary,
      flex: 1,
    },
    createBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.lg,
      borderRadius: radius.md,
      alignSelf: 'stretch',
      alignItems: 'center',
    },
    createBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.background,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.xxl,
      width: '100%',
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.lg,
    },
    modalInput: {
      backgroundColor: colors.input,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: 15,
      color: colors.text.primary,
      marginBottom: spacing.xl,
    },
    modalActions: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    modalCancelBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalCancelText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    modalConfirmBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.accent,
    },
    modalConfirmText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.background,
    },

    // Section 1: Patrimônio
    sectionLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text.secondary,
      marginBottom: spacing.xs,
    },
    totalWealth: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
      marginBottom: spacing.lg,
    },
    participationBar: {
      flexDirection: 'row',
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: spacing.lg,
      gap: 2,
    },
    participationSegment: {
      height: 8,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    memberDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    memberName: {
      flex: 1,
      fontSize: 13,
      color: colors.text.primary,
    },
    memberValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    memberPct: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.muted,
      width: 42,
      textAlign: 'right',
      fontVariant: ['tabular-nums'],
    },

    // Section 2: Members scroll
    membersScroll: {
      marginBottom: spacing.xl,
    },
    membersScrollContent: {
      paddingRight: spacing.xl,
      gap: spacing.md,
    },
    memberAvatar: {
      alignItems: 'center',
      width: 72,
    },
    avatarCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    avatarInitial: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    avatarName: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: 2,
    },
    roleBadge: {
      paddingHorizontal: spacing.xs + 2,
      paddingVertical: 1,
      borderRadius: radius.sm,
    },
    roleBadgeText: {
      fontSize: 9,
      fontWeight: '600',
    },

    // Section 3: Goals
    goalWrap: {
      marginBottom: spacing.sm,
    },
    contributorsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: spacing.lg,
      marginTop: -spacing.xs,
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    miniAvatar: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.background,
    },
    miniAvatarText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    contributorLabel: {
      fontSize: 11,
      color: colors.text.muted,
    },

    // Section 4: Quick Actions
    actionsGrid: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.xxl,
    },
    actionCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      alignItems: 'center',
      gap: spacing.sm,
    },
    actionLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.text.primary,
      textAlign: 'center',
    },
  });
