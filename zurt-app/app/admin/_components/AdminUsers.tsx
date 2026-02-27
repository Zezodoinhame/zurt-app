import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { fetchAdminUsers, addAdminUser } from '../services/adminService';
import type { AdminUser, AdminPlan } from '../data/types';
import { ADMIN_PLAN_CONFIG } from '../data/types';

const C = {
  bg: '#0A0E14',
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

type RoleFilter = 'all' | 'admin' | 'tester' | 'user';

const roleFilters: { key: RoleFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'admin', label: 'Admin' },
  { key: 'tester', label: 'Tester' },
  { key: 'user', label: 'Usuario' },
];

const planOptions: AdminPlan[] = ['free', 'basic', 'pro', 'unlimited', 'enterprise'];

const roleBadgeColor: Record<string, string> = { admin: C.accent, tester: C.info, user: C.textMuted };
const statusBadgeColor: Record<string, string> = { active: C.positive, inactive: C.textMuted, suspended: C.negative };

function UserRow({ user, onPress }: { user: AdminUser; onPress: () => void }) {
  const planConfig = ADMIN_PLAN_CONFIG[user.plan] ?? ADMIN_PLAN_CONFIG.free;

  return (
    <TouchableOpacity style={styles.userRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>
          {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <View style={styles.userBadges}>
          <View style={[styles.badge, { backgroundColor: (roleBadgeColor[user.role] || C.textMuted) + '20' }]}>
            <Text style={[styles.badgeText, { color: roleBadgeColor[user.role] || C.textMuted }]}>
              {user.role.toUpperCase()}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: (statusBadgeColor[user.status] || C.textMuted) + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusBadgeColor[user.status] || C.textMuted }]} />
            <Text style={[styles.badgeText, { color: statusBadgeColor[user.status] || C.textMuted }]}>
              {user.status === 'active' ? 'Ativo' : user.status === 'inactive' ? 'Inativo' : 'Suspenso'}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: planConfig.color + '20' }]}>
            <Text style={[styles.badgeText, { color: planConfig.color }]}>
              {planConfig.label.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.userConnections}>
        <Ionicons name="link" size={13} color={user.openFinance ? C.positive : C.textMuted + '40'} />
        <Ionicons name="trending-up" size={13} color={user.b3Connected ? C.positive : C.textMuted + '40'} />
        <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<AdminUser['role']>('tester');
  const [newPlan, setNewPlan] = useState<AdminPlan>('free');

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdminUsers();
      setUsers(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch = !search
        || u.name.toLowerCase().includes(search.toLowerCase())
        || u.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const handleUserPress = (user: AdminUser) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/admin/user-detail', params: { id: user.id } });
  };

  const handleAddUser = async () => {
    if (!newName.trim() || !newEmail.trim()) {
      Alert.alert('Erro', 'Preencha nome e email');
      return;
    }
    const result = await addAdminUser({
      name: newName.trim(),
      email: newEmail.trim(),
      role: newRole,
      plan: newPlan,
    });
    if (result) {
      setUsers((prev) => [...prev, result]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Aviso', 'Backend nao disponivel. Usuario nao foi salvo.');
    }
    setShowAddModal(false);
    setNewName('');
    setNewEmail('');
    setNewRole('tester');
    setNewPlan('free');
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={C.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome ou email..."
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={C.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filters */}
      <View style={styles.filtersRow}>
        {roleFilters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, roleFilter === f.key && styles.filterChipActive]}
            onPress={() => setRoleFilter(f.key)}
          >
            <Text style={[styles.filterChipText, roleFilter === f.key && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* User List */}
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <UserRow user={item} onPress={() => handleUserPress(item)} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={40} color={C.textMuted} />
              <Text style={styles.emptyText}>Nenhum usuario encontrado</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowAddModal(true); }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#000" />
      </TouchableOpacity>

      {/* Add User Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar Usuario</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={22} color={C.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Nome</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nome completo"
              placeholderTextColor={C.textMuted}
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="email@exemplo.com"
              placeholderTextColor={C.textMuted}
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Perfil</Text>
            <View style={styles.roleSelector}>
              {(['admin', 'tester', 'user'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleOption, newRole === r && styles.roleOptionActive]}
                  onPress={() => setNewRole(r)}
                >
                  <Text style={[styles.roleOptionText, newRole === r && styles.roleOptionTextActive]}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Plano</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.roleSelector}>
                {planOptions.map((p) => {
                  const config = ADMIN_PLAN_CONFIG[p];
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.planOption,
                        newPlan === p && { backgroundColor: config.color + '20', borderColor: config.color + '50' },
                      ]}
                      onPress={() => setNewPlan(p)}
                    >
                      <Text style={[styles.roleOptionText, newPlan === p && { color: config.color }]}>
                        {config.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleAddUser}>
              <Text style={styles.modalSubmitText}>Adicionar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterChipActive: {
    backgroundColor: C.accent + '20',
    borderColor: C.accent + '50',
  },
  filterChipText: { fontSize: 12, fontWeight: '600', color: C.textMuted },
  filterChipTextActive: { color: C.accent },
  listContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 100 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { fontSize: 14, fontWeight: '700', color: C.accent },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '600', color: C.text },
  userEmail: { fontSize: 11, color: C.textSec, marginTop: 1 },
  userBadges: { flexDirection: 'row', gap: 5, marginTop: 6, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  userConnections: { alignItems: 'center', gap: 5 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: { fontSize: 14, color: C.textMuted },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: C.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: C.textSec, marginBottom: 6, marginTop: 12 },
  modalInput: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 14,
    color: C.text,
  },
  roleSelector: { flexDirection: 'row', gap: 8 },
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
  roleOptionText: { fontSize: 12, fontWeight: '600', color: C.textMuted },
  roleOptionTextActive: { color: C.accent },
  modalSubmitBtn: {
    backgroundColor: C.accent,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  modalSubmitText: { fontSize: 15, fontWeight: '700', color: '#000' },
});
