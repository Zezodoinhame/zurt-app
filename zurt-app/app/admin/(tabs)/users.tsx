import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { mockUsers, type AdminUser } from '../data/mockData';

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

type RoleFilter = 'all' | 'admin' | 'tester' | 'user';
type StatusFilter = 'all' | 'active' | 'inactive' | 'suspended';

const roleFilters: { key: RoleFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'admin', label: 'Admin' },
  { key: 'tester', label: 'Tester' },
  { key: 'user', label: 'Usuario' },
];

const statusFilters: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Ativo' },
  { key: 'inactive', label: 'Inativo' },
  { key: 'suspended', label: 'Suspenso' },
];

const roleBadgeColor: Record<string, string> = {
  admin: C.accent,
  tester: C.info,
  user: C.textMuted,
};

const statusBadgeColor: Record<string, string> = {
  active: C.positive,
  inactive: C.textMuted,
  suspended: C.negative,
};

// ---------------------------------------------------------------------------
// User row component
// ---------------------------------------------------------------------------

function UserRow({ user, onPress }: { user: AdminUser; onPress: () => void }) {
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
          {/* Role badge */}
          <View style={[styles.badge, { backgroundColor: (roleBadgeColor[user.role] || C.textMuted) + '20' }]}>
            <Text style={[styles.badgeText, { color: roleBadgeColor[user.role] || C.textMuted }]}>
              {user.role.toUpperCase()}
            </Text>
          </View>
          {/* Status badge */}
          <View style={[styles.badge, { backgroundColor: (statusBadgeColor[user.status] || C.textMuted) + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusBadgeColor[user.status] || C.textMuted }]} />
            <Text style={[styles.badgeText, { color: statusBadgeColor[user.status] || C.textMuted }]}>
              {user.status === 'active' ? 'Ativo' : user.status === 'inactive' ? 'Inativo' : 'Suspenso'}
            </Text>
          </View>
          {/* Plan badge */}
          <View style={[styles.badge, { backgroundColor: user.plan === 'PRO' ? C.warning + '20' : C.textMuted + '20' }]}>
            <Text style={[styles.badgeText, { color: user.plan === 'PRO' ? C.warning : C.textMuted }]}>
              {user.plan}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.userConnections}>
        <Ionicons
          name="link"
          size={14}
          color={user.openFinance ? C.positive : C.textMuted + '40'}
        />
        <Ionicons
          name="trending-up"
          size={14}
          color={user.b3Connected ? C.positive : C.textMuted + '40'}
        />
        <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Users Screen
// ---------------------------------------------------------------------------

export default function AdminUsersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredUsers = useMemo(() => {
    return mockUsers.filter((u) => {
      const matchSearch =
        !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus = statusFilter === 'all' || u.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [search, roleFilter, statusFilter]);

  const handleUserPress = (user: AdminUser) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/admin/user-detail', params: { id: user.id } });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Usuarios</Text>
        <View style={styles.headerCount}>
          <Text style={styles.headerCountText}>{filteredUsers.length}</Text>
        </View>
      </View>

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

      {/* Role Filters */}
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

      {/* Status Filters */}
      <View style={styles.filtersRow}>
        {statusFilters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
            onPress={() => setStatusFilter(f.key)}
          >
            <Text style={[styles.filterChipText, statusFilter === f.key && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* User List */}
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <UserRow user={item} onPress={() => handleUserPress(item)} />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={40} color={C.textMuted} />
            <Text style={styles.emptyText}>Nenhum usuario encontrado</Text>
          </View>
        }
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
  },
  headerCount: {
    backgroundColor: C.accent + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  headerCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.accent,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 8,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.text,
  },

  // Filters
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 6,
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
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textMuted,
  },
  filterChipTextActive: {
    color: C.accent,
  },

  // User list
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.accent,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  userEmail: {
    fontSize: 11,
    color: C.textSec,
    marginTop: 1,
  },
  userBadges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  userConnections: {
    alignItems: 'center',
    gap: 6,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: C.textMuted,
  },
});
