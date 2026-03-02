import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { fetchAdminUsers } from '../services/adminService';
import type { AdminUser, AdminRole } from '../data/types';
import { ADMIN_PLAN_CONFIG, ADMIN_ROLE_CONFIG } from '../data/types';

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

type RoleFilter = 'all' | AdminRole;

const roleFilters: { key: RoleFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'admin', label: 'Admin' },
  { key: 'consultant', label: 'Consultor' },
  { key: 'customer', label: 'Cliente' },
];

const statusBadgeColor: Record<string, string> = { active: C.positive, blocked: C.negative };

function UserRow({ user, onPress }: { user: AdminUser; onPress: () => void }) {
  const planCode = user.subscription?.plan?.code ?? user.plan ?? 'free';
  const planConfig = ADMIN_PLAN_CONFIG[planCode as keyof typeof ADMIN_PLAN_CONFIG] ?? ADMIN_PLAN_CONFIG.free;
  const roleConfig = ADMIN_ROLE_CONFIG[user.role] ?? ADMIN_ROLE_CONFIG.customer;

  return (
    <TouchableOpacity style={styles.userRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>
          {user.name ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2) : '?'}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.name || user.email}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <View style={styles.userBadges}>
          <View style={[styles.badge, { backgroundColor: roleConfig.color + '20' }]}>
            <Text style={[styles.badgeText, { color: roleConfig.color }]}>
              {roleConfig.label.toUpperCase()}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: (statusBadgeColor[user.status] || C.textMuted) + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusBadgeColor[user.status] || C.textMuted }]} />
            <Text style={[styles.badgeText, { color: statusBadgeColor[user.status] || C.textMuted }]}>
              {user.status === 'active' ? 'Ativo' : 'Bloqueado'}
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
        <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAdminUsers({ page: 1, limit: 50 });
      setUsers(data.users);
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao carregar usuarios');
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
      ) : error ? (
        <View style={styles.loader}>
          <Ionicons name="alert-circle-outline" size={40} color={C.negative} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadUsers}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 14, color: '#FF6B6B', textAlign: 'center' },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#00D4AA20',
  },
  retryText: { fontSize: 14, fontWeight: '600', color: '#00D4AA' },
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
  listContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 },
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
});
