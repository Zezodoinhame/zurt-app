// =============================================================================
// ZURT Wealth Intelligence - Family Group Screen
// Manage family wealth group, invite members, view consolidated patrimony
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import {
  fetchFamilyGroup,
  createFamilyGroup,
  inviteFamilyMember,
  fetchFamilySummary,
} from '../src/services/api';

// =============================================================================
// Helpers
// =============================================================================

const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitial(name: string): string {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

function formatCurrencyBRL(value: number): string {
  if (value == null || isNaN(value)) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// =============================================================================
// Main Screen Component
// =============================================================================

export default function FamilyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useSettingsStore((s) => s.t);
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState('Minha Família');

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------
  const totalWealth = useMemo(() => {
    return members
      .filter((m) => m.status === 'accepted')
      .reduce((sum, m) => sum + (parseFloat(m.netWorth ?? m.net_worth ?? '0') || 0), 0);
  }, [members]);

  const acceptedMembers = useMemo(() => {
    return members.filter((m) => m.status === 'accepted');
  }, [members]);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFamilyGroup();
      setGroup(data?.group ?? null);
      setMembers(data?.members ?? []);
    } catch (err: any) {
      console.log('[Family] Error loading family group:', err?.message ?? err);
      setGroup(null);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [router]);

  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim()) return;
    setCreating(true);
    try {
      await createFamilyGroup(groupName.trim());
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreateModal(false);
      setGroupName('Minha Família');
      await loadData();
    } catch (err: any) {
      console.log('[Family] Error creating group:', err?.message ?? err);
      Alert.alert(
        t('family.errorTitle') || 'Erro',
        t('family.errorCreate') || 'Não foi possível criar o grupo familiar. Tente novamente.',
        [{ text: 'OK' }],
      );
    } finally {
      setCreating(false);
    }
  }, [groupName, loadData, t]);

  const handleInviteMember = useCallback(async () => {
    if (!inviteEmail.trim()) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      Alert.alert(
        t('family.errorTitle') || 'Erro',
        t('family.invalidEmail') || 'Por favor, insira um email válido.',
        [{ text: 'OK' }],
      );
      return;
    }

    setInviting(true);
    try {
      await inviteFamilyMember(inviteEmail.trim(), inviteRole);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
      await loadData();
    } catch (err: any) {
      console.log('[Family] Error inviting member:', err?.message ?? err);
      Alert.alert(
        t('family.errorTitle') || 'Erro',
        t('family.errorInvite') || 'Não foi possível enviar o convite. Tente novamente.',
        [{ text: 'OK' }],
      );
    } finally {
      setInviting(false);
    }
  }, [inviteEmail, inviteRole, loadData, t]);

  const handleOpenCreateModal = useCallback(() => {
    setGroupName('Minha Família');
    setShowCreateModal(true);
  }, []);

  const handleOpenInviteModal = useCallback(() => {
    setInviteEmail('');
    setInviteRole('member');
    setShowInviteModal(true);
  }, []);

  // ---------------------------------------------------------------------------
  // Role chips for invite modal
  // ---------------------------------------------------------------------------
  const roleOptions = useMemo(() => [
    { key: 'spouse', label: t('family.spouse') || 'Cônjuge' },
    { key: 'child', label: t('family.child') || 'Filho(a)' },
    { key: 'member', label: t('family.member') || 'Membro' },
  ], [t]);

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Text style={styles.backIcon}>{'\u2190'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerBarTitle}>
            {t('family.title') || 'Grupo Familiar'} {'\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66'}
          </Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>{t('family.loading') || 'Carregando...'}</Text>
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* ================================================================== */}
      {/* Header                                                              */}
      {/* ================================================================== */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerBarTitle}>
          {t('family.title') || 'Grupo Familiar'} {'\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66'}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================================ */}
        {/* No Group — Empty State                                           */}
        {/* ================================================================ */}
        {group === null ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>{'\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66'}</Text>
            <Text style={styles.emptyTitle}>
              {t('family.noGroup') || 'Nenhum grupo familiar'}
            </Text>
            <Text style={styles.emptyDescription}>
              {t('family.createDesc') || 'Crie um grupo familiar para consolidar o patrimônio de toda a família em um só lugar.'}
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleOpenCreateModal}
              activeOpacity={0.8}
            >
              <Text style={styles.createButtonText}>
                {t('family.createGroup') || 'Criar Grupo'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ============================================================ */}
            {/* Total Wealth Card (glow variant)                              */}
            {/* ============================================================ */}
            <View style={styles.glowCard}>
              <View style={styles.glowCardInner}>
                <Text style={styles.glowLabel}>
                  {t('family.totalWealth') || 'Patrimônio Familiar Total'}
                </Text>
                <Text style={styles.glowValue}>
                  {formatCurrencyBRL(totalWealth)}
                </Text>
                <Text style={styles.glowMembersCount}>
                  {members.length} {t('family.members') || 'membros'}
                </Text>

                {/* Horizontal stacked bar chart */}
                {acceptedMembers.length > 0 && totalWealth > 0 && (
                  <View style={styles.barChart}>
                    {acceptedMembers.map((member) => {
                      const netWorth = parseFloat(member.netWorth ?? member.net_worth ?? '0') || 0;
                      const percent = totalWealth > 0 ? (netWorth / totalWealth) * 100 : 0;
                      return (
                        <View
                          key={member.id}
                          style={[
                            styles.barSegment,
                            {
                              width: `${Math.max(percent, 2)}%` as any,
                              backgroundColor: getAvatarColor(member.name || member.invited_email || ''),
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                )}

                {/* Bar legend */}
                {acceptedMembers.length > 0 && totalWealth > 0 && (
                  <View style={styles.barLegend}>
                    {acceptedMembers.map((member) => {
                      const name = member.name || member.invited_email || '';
                      const netWorth = parseFloat(member.netWorth ?? member.net_worth ?? '0') || 0;
                      const percent = totalWealth > 0 ? (netWorth / totalWealth) * 100 : 0;
                      return (
                        <View key={member.id} style={styles.legendItem}>
                          <View
                            style={[
                              styles.legendDot,
                              { backgroundColor: getAvatarColor(name) },
                            ]}
                          />
                          <Text style={styles.legendText} numberOfLines={1}>
                            {name.split(' ')[0]} ({percent.toFixed(0)}%)
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>

            {/* ============================================================ */}
            {/* Members List                                                  */}
            {/* ============================================================ */}
            <Text style={styles.sectionTitle}>
              {t('family.membersList') || 'Membros'}
            </Text>

            {members.map((member) => {
              const name = member.name || member.invited_email || '';
              const role = member.role || 'member';
              const status = member.status || 'pending';
              const netWorth = parseFloat(member.netWorth ?? member.net_worth ?? '0') || 0;
              const avatarColor = getAvatarColor(name);
              const initial = getInitial(name);
              const isOwner = role === 'owner';
              const isPending = status === 'pending';
              const isAccepted = status === 'accepted';

              return (
                <View key={member.id} style={styles.memberCard}>
                  <View style={styles.memberRow}>
                    {/* Avatar */}
                    <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                      <Text style={styles.avatarText}>{initial}</Text>
                    </View>

                    {/* Info */}
                    <View style={styles.memberInfo}>
                      <View style={styles.memberNameRow}>
                        <Text style={styles.memberName} numberOfLines={1}>
                          {name}
                        </Text>
                        {/* Role badge */}
                        <View
                          style={[
                            styles.roleBadge,
                            isOwner && { backgroundColor: colors.accent + '20' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.roleBadgeText,
                              isOwner && { color: colors.accent },
                            ]}
                          >
                            {isOwner
                              ? (t('family.owner') || 'Dono')
                              : (t('family.' + role) || role)}
                          </Text>
                        </View>
                      </View>

                      {/* Net worth */}
                      <Text style={styles.memberNetWorth}>
                        {formatCurrencyBRL(netWorth)}
                      </Text>
                    </View>

                    {/* Status badge */}
                    <View style={styles.statusContainer}>
                      {isPending && (
                        <View style={styles.statusBadgePending}>
                          <Text style={styles.statusBadgePendingText}>
                            {t('family.pending') || 'Pendente'}
                          </Text>
                        </View>
                      )}
                      {isAccepted && (
                        <View style={styles.statusBadgeAccepted}>
                          <Text style={styles.statusBadgeAcceptedText}>
                            {t('family.accepted') || 'Aceito'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}

            {/* ============================================================ */}
            {/* Invite Button                                                 */}
            {/* ============================================================ */}
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={handleOpenInviteModal}
              activeOpacity={0.8}
            >
              <Text style={styles.inviteButtonText}>
                {t('family.inviteMember') || 'Convidar Membro'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Bottom spacing */}
        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>

      {/* ==================================================================== */}
      {/* Create Group Modal                                                    */}
      {/* ==================================================================== */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => !creating && setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {t('family.create') || 'Criar Grupo Familiar'}
            </Text>

            <Text style={styles.modalLabel}>
              {t('family.groupNameLabel') || 'Nome do grupo'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={groupName}
              onChangeText={setGroupName}
              placeholder={t('family.groupNamePlaceholder') || 'Minha Família'}
              placeholderTextColor={colors.text.muted}
              autoFocus
              editable={!creating}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowCreateModal(false)}
                disabled={creating}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>
                  {t('family.cancel') || 'Cancelar'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  creating && styles.modalButtonDisabled,
                ]}
                onPress={handleCreateGroup}
                disabled={creating || !groupName.trim()}
                activeOpacity={0.8}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Text style={styles.modalConfirmText}>
                    {t('family.createGroup') || 'Criar Grupo'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================================================================== */}
      {/* Invite Member Modal                                                   */}
      {/* ==================================================================== */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="fade"
        onRequestClose={() => !inviting && setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {t('family.invite') || 'Convidar Membro'}
            </Text>

            {/* Email input */}
            <Text style={styles.modalLabel}>
              {t('family.emailLabel') || 'Email'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder={t('family.emailPlaceholder') || 'nome@email.com'}
              placeholderTextColor={colors.text.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              editable={!inviting}
            />

            {/* Role selector */}
            <Text style={styles.modalLabel}>
              {t('family.roleLabel') || 'Função'}
            </Text>
            <View style={styles.roleChipsRow}>
              {roleOptions.map((option) => {
                const isSelected = inviteRole === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.roleChip,
                      isSelected && styles.roleChipActive,
                    ]}
                    onPress={() => setInviteRole(option.key)}
                    disabled={inviting}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        isSelected && styles.roleChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowInviteModal(false)}
                disabled={inviting}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>
                  {t('family.cancel') || 'Cancelar'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  inviting && styles.modalButtonDisabled,
                ]}
                onPress={handleInviteMember}
                disabled={inviting || !inviteEmail.trim()}
                activeOpacity={0.8}
              >
                {inviting ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Text style={styles.modalConfirmText}>
                    {t('family.send') || 'Enviar'}
                  </Text>
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
    // -------------------------------------------------------------------------
    // Screen
    // -------------------------------------------------------------------------
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // -------------------------------------------------------------------------
    // Header
    // -------------------------------------------------------------------------
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backIcon: {
      fontSize: 22,
      color: colors.text.primary,
    },
    headerBarTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
    },

    // -------------------------------------------------------------------------
    // Scroll
    // -------------------------------------------------------------------------
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.xl,
    },

    // -------------------------------------------------------------------------
    // Loading
    // -------------------------------------------------------------------------
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
    },
    loadingText: {
      fontSize: 15,
      color: colors.text.secondary,
      marginTop: spacing.sm,
    },

    // -------------------------------------------------------------------------
    // Empty State
    // -------------------------------------------------------------------------
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xxxl,
      alignItems: 'center',
      marginTop: spacing.xl,
    },
    emptyEmoji: {
      fontSize: 56,
      marginBottom: spacing.xl,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    emptyDescription: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: spacing.xxl,
      paddingHorizontal: spacing.lg,
    },
    createButton: {
      backgroundColor: colors.accent,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xxxl,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    createButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.background,
    },

    // -------------------------------------------------------------------------
    // Glow Card (Total Wealth)
    // -------------------------------------------------------------------------
    glowCard: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.accent + '40',
      overflow: 'hidden',
      marginBottom: spacing.xl,
    },
    glowCardInner: {
      backgroundColor: colors.card,
      padding: spacing.xl,
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
    },
    glowLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
    },
    glowValue: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
    glowMembersCount: {
      fontSize: 13,
      color: colors.text.muted,
      marginBottom: spacing.lg,
    },

    // -------------------------------------------------------------------------
    // Bar Chart
    // -------------------------------------------------------------------------
    barChart: {
      flexDirection: 'row',
      height: 12,
      borderRadius: 6,
      overflow: 'hidden',
      backgroundColor: colors.border,
      marginBottom: spacing.md,
    },
    barSegment: {
      height: '100%',
    },

    // -------------------------------------------------------------------------
    // Bar Legend
    // -------------------------------------------------------------------------
    barLegend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      fontSize: 11,
      color: colors.text.muted,
      maxWidth: 100,
    },

    // -------------------------------------------------------------------------
    // Section Title
    // -------------------------------------------------------------------------
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.md,
    },

    // -------------------------------------------------------------------------
    // Member Card
    // -------------------------------------------------------------------------
    memberCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    // Avatar
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    avatarText: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // Member info
    memberInfo: {
      flex: 1,
      marginRight: spacing.sm,
    },
    memberNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    memberName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
      flexShrink: 1,
    },
    roleBadge: {
      backgroundColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    roleBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text.muted,
      textTransform: 'capitalize',
    },
    memberNetWorth: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.secondary,
    },

    // Status badges
    statusContainer: {
      alignItems: 'flex-end',
    },
    statusBadgePending: {
      backgroundColor: '#FFD93D20',
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    statusBadgePendingText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#E6A817',
    },
    statusBadgeAccepted: {
      backgroundColor: colors.positive + '20',
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    statusBadgeAcceptedText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.positive,
    },

    // -------------------------------------------------------------------------
    // Invite Button
    // -------------------------------------------------------------------------
    inviteButton: {
      backgroundColor: colors.accent,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg + 2,
      paddingHorizontal: spacing.xxl,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.lg,
    },
    inviteButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.background,
    },

    // -------------------------------------------------------------------------
    // Modal
    // -------------------------------------------------------------------------
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xxl,
      width: '100%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.xl,
      textAlign: 'center',
    },
    modalLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.secondary,
      marginBottom: spacing.sm,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    modalInput: {
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

    // Role chips
    roleChipsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    roleChip: {
      flex: 1,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    roleChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent + '15',
    },
    roleChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    roleChipTextActive: {
      color: colors.accent,
    },

    // Modal actions
    modalActions: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.md,
    },
    modalCancelButton: {
      flex: 1,
      paddingVertical: spacing.lg,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    modalCancelText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    modalConfirmButton: {
      flex: 1,
      paddingVertical: spacing.lg,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
    },
    modalConfirmText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.background,
    },
    modalButtonDisabled: {
      opacity: 0.6,
    },
  });
