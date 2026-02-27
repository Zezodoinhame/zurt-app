import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ADMIN_PLAN_CONFIG, type AdminPlan } from './data/types';
import type { AdminUser } from './data/types';
import {
  fetchAdminUserById,
  updateAdminUser,
  impersonateUser,
} from './services/adminService';
import { useImpersonateStore } from '../../src/stores/impersonateStore';

const C = {
  bg: '#080D14',
  card: '#0F1520',
  border: '#1E2A3A',
  accent: '#00D4AA',
  text: '#E8ECF0',
  textSec: '#8B95A5',
  textMuted: '#64748B',
  positive: '#00D4AA',
  negative: '#FF6B6B',
  warning: '#FFD93D',
  info: '#3A86FF',
};

const roleBadgeColor: Record<string, string> = {
  admin: C.accent,
  tester: C.info,
  user: C.textMuted,
};

const planOptions: AdminPlan[] = ['free', 'basic', 'pro', 'unlimited', 'enterprise'];

// ---------------------------------------------------------------------------
// Data row
// ---------------------------------------------------------------------------

function DataRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={[styles.dataValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// User Detail Screen
// ---------------------------------------------------------------------------

export default function UserDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const startImpersonation = useImpersonateStore((s) => s.startImpersonation);

  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<AdminUser['role']>('user');
  const [plan, setPlan] = useState<AdminPlan>('free');
  const [status, setStatus] = useState<AdminUser['status']>('active');

  useEffect(() => {
    setIsLoading(true);
    fetchAdminUserById(id).then((u) => {
      setUser(u);
      if (u) {
        setRole(u.role);
        setPlan(u.plan);
        setStatus(u.status);
      }
      setIsLoading(false);
    });
  }, [id]);

  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalhe</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loader}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Usuario</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Usuario nao encontrado</Text>
        </View>
      </View>
    );
  }

  const formatPatrimony = (v: number) => {
    const abs = Math.abs(v);
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(abs);
    return `${v < 0 ? '-' : ''}R$ ${formatted}`;
  };

  const planConfig = ADMIN_PLAN_CONFIG[plan] ?? ADMIN_PLAN_CONFIG.free;

  const handleSuspendToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (status === 'suspended') {
      setStatus('active');
    } else {
      Alert.alert('Suspender usuario', `Tem certeza que deseja suspender ${user.name}?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Suspender', style: 'destructive', onPress: () => setStatus('suspended') },
      ]);
    }
  };

  const handleRemove = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Remover usuario',
      `Tem certeza que deseja remover ${user.name}? Esta acao nao pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            router.back();
          },
        },
      ]
    );
  };

  const handleSaveChanges = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await updateAdminUser(user.id, { role, plan, status });
    if (result) {
      setUser(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Salvo', 'Alteracoes salvas com sucesso');
    } else {
      Alert.alert('Aviso', 'Backend nao disponivel. Alteracoes nao foram persistidas.');
    }
  };

  const handleImpersonate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await impersonateUser(user.id);
    await startImpersonation(
      { id: user.id, name: user.name, email: user.email },
      result?.token ?? null,
    );
    router.replace('/(tabs)');
  };

  const roleOptions: AdminUser['role'][] = ['admin', 'tester', 'user'];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhe</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </Text>
          </View>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
          <View style={styles.profileBadges}>
            <View style={[styles.profileBadge, { backgroundColor: (roleBadgeColor[role] || C.textMuted) + '20' }]}>
              <Text style={[styles.profileBadgeText, { color: roleBadgeColor[role] || C.textMuted }]}>
                {role.toUpperCase()}
              </Text>
            </View>
            <View style={[styles.profileBadge, { backgroundColor: (status === 'active' ? C.positive : C.negative) + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: status === 'active' ? C.positive : C.negative }]} />
              <Text style={[styles.profileBadgeText, { color: status === 'active' ? C.positive : C.negative }]}>
                {status === 'active' ? 'Ativo' : status === 'inactive' ? 'Inativo' : 'Suspenso'}
              </Text>
            </View>
            <View style={[styles.profileBadge, { backgroundColor: planConfig.color + '20' }]}>
              <Text style={[styles.profileBadgeText, { color: planConfig.color }]}>
                {planConfig.label.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Impersonate button */}
        <TouchableOpacity style={styles.impersonateBtn} onPress={handleImpersonate}>
          <Ionicons name="eye-outline" size={18} color="#0A0E14" />
          <Text style={styles.impersonateBtnText}>Ver como este usuario</Text>
        </TouchableOpacity>

        {/* Data section */}
        <Text style={styles.sectionTitle}>Dados</Text>
        <View style={styles.dataCard}>
          <DataRow
            label="Patrimonio"
            value={formatPatrimony(user.patrimony)}
            valueColor={user.patrimony >= 0 ? C.positive : C.negative}
          />
          <DataRow label="Total de logins" value={String(user.totalLogins)} />
          <DataRow label="Ultimo acesso" value={user.lastLogin} />
          <DataRow label="Data de cadastro" value={user.createdAt} />
          <DataRow label="Dispositivos" value={user.devices.join(', ') || '-'} />
          <DataRow label="Telefone" value={user.phone || '-'} />
        </View>

        {/* Connections section */}
        <Text style={styles.sectionTitle}>Conexoes</Text>
        <View style={styles.connectionsRow}>
          <View style={styles.connectionCard}>
            <View style={styles.connectionHeader}>
              <Ionicons name="link" size={18} color={user.openFinance ? C.positive : C.textMuted} />
              <Text style={styles.connectionTitle}>Open Finance</Text>
            </View>
            <View style={[styles.connectionStatus, { backgroundColor: (user.openFinance ? C.positive : C.warning) + '15' }]}>
              <View style={[styles.statusDot, { backgroundColor: user.openFinance ? C.positive : C.warning }]} />
              <Text style={[styles.connectionStatusText, { color: user.openFinance ? C.positive : C.warning }]}>
                {user.openFinance ? 'Conectado' : 'Pendente'}
              </Text>
            </View>
          </View>
          <View style={styles.connectionCard}>
            <View style={styles.connectionHeader}>
              <Ionicons name="trending-up" size={18} color={user.b3Connected ? C.positive : C.textMuted} />
              <Text style={styles.connectionTitle}>B3</Text>
            </View>
            <View style={[styles.connectionStatus, { backgroundColor: (user.b3Connected ? C.positive : C.textMuted) + '15' }]}>
              <View style={[styles.statusDot, { backgroundColor: user.b3Connected ? C.positive : C.textMuted }]} />
              <Text style={[styles.connectionStatusText, { color: user.b3Connected ? C.positive : C.textMuted }]}>
                {user.b3Connected ? 'Conectado' : 'Aguardando'}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions section */}
        <Text style={styles.sectionTitle}>Acoes</Text>

        {/* Role selector */}
        <View style={styles.actionCard}>
          <Text style={styles.actionLabel}>Perfil</Text>
          <View style={styles.roleSelector}>
            {roleOptions.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleOption, role === r && styles.roleOptionActive]}
                onPress={() => { setRole(r); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.roleOptionText, role === r && styles.roleOptionTextActive]}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Plan selector */}
        <View style={styles.actionCard}>
          <Text style={styles.actionLabel}>Plano</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.roleSelector}>
              {planOptions.map((p) => {
                const cfg = ADMIN_PLAN_CONFIG[p];
                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.planOption,
                      plan === p && { backgroundColor: cfg.color + '20', borderColor: cfg.color + '50' },
                    ]}
                    onPress={() => { setPlan(p); Haptics.selectionAsync(); }}
                  >
                    <Text style={[styles.roleOptionText, plan === p && { color: cfg.color }]}>
                      {cfg.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Save changes */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveChanges}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#000" />
          <Text style={styles.saveBtnText}>Salvar alteracoes</Text>
        </TouchableOpacity>

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => Haptics.selectionAsync()}>
            <Ionicons name="key-outline" size={16} color={C.info} />
            <Text style={[styles.secondaryBtnText, { color: C.info }]}>Resetar senha</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => Haptics.selectionAsync()}>
            <Ionicons name="notifications-outline" size={16} color={C.accent} />
            <Text style={[styles.secondaryBtnText, { color: C.accent }]}>Enviar push</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: status === 'suspended' ? C.positive + '40' : C.warning + '40' }]}
            onPress={handleSuspendToggle}
          >
            <Ionicons
              name={status === 'suspended' ? 'checkmark-circle-outline' : 'ban-outline'}
              size={16}
              color={status === 'suspended' ? C.positive : C.warning}
            />
            <Text style={[styles.secondaryBtnText, { color: status === 'suspended' ? C.positive : C.warning }]}>
              {status === 'suspended' ? 'Reativar' : 'Suspender'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dangerBtn]}
            onPress={handleRemove}
          >
            <Ionicons name="trash-outline" size={16} color={C.negative} />
            <Text style={[styles.dangerBtnText]}>Remover usuario</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: C.textMuted,
  },

  // Profile header
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileAvatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: C.accent,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
  },
  profileEmail: {
    fontSize: 13,
    color: C.textSec,
    marginTop: 4,
  },
  profileBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
  },
  profileBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Impersonate
  impersonateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.warning,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 8,
  },
  impersonateBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0A0E14',
  },

  // Section
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: 10,
    marginTop: 20,
  },

  // Data card
  dataCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  dataLabel: {
    fontSize: 13,
    color: C.textSec,
  },
  dataValue: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },

  // Connections
  connectionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  connectionCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 10,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  connectionStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Actions
  actionCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSec,
    marginBottom: 10,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  planOption: {
    minWidth: 70,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  roleOptionActive: {
    backgroundColor: C.accent + '20',
    borderColor: C.accent + '50',
  },
  roleOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textMuted,
  },
  roleOptionTextActive: {
    color: C.accent,
  },

  // Save
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 10,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },

  actionButtons: {
    gap: 8,
    marginTop: 10,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.negative + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.negative + '30',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dangerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.negative,
  },
});
