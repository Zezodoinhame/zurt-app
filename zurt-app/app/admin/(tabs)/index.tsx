import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { mockUsers, mockActivityFeed } from '../data/mockData';

const C = {
  bg: '#080D14',
  card: '#0F1520',
  cardElevated: '#111B2A',
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

// ---------------------------------------------------------------------------
// Metric Card
// ---------------------------------------------------------------------------

function MetricCard({
  title,
  value,
  icon,
  iconColor,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: string;
  iconColor: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIconCircle, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
      {subtitle ? <Text style={styles.metricSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Screen
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const totalUsers = mockUsers.length;
  const activeUsers = mockUsers.filter((u) => u.status === 'active').length;
  const openFinanceCount = mockUsers.filter((u) => u.openFinance).length;
  const b3Count = mockUsers.filter((u) => u.b3Connected).length;

  const handleQuickAction = (action: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Placeholder for future implementation
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>ADMIN PANEL</Text>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="shield-checkmark" size={16} color={C.accent} />
          <Text style={styles.headerBadgeText}>Admin</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Total Usuarios"
            value={totalUsers}
            icon="people"
            iconColor={C.info}
          />
          <MetricCard
            title="Ativos"
            value={activeUsers}
            icon="checkmark-circle"
            iconColor={C.positive}
            subtitle="Ultimo 30d"
          />
          <MetricCard
            title="Open Finance"
            value={openFinanceCount}
            icon="link"
            iconColor={C.warning}
          />
          <MetricCard
            title="Conexoes B3"
            value={b3Count}
            icon="trending-up"
            iconColor={C.accent}
          />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Acoes Rapidas</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleQuickAction('add_tester')}
          >
            <Ionicons name="person-add" size={18} color={C.accent} />
            <Text style={styles.actionBtnText}>Adicionar tester</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleQuickAction('force_sync')}
          >
            <Ionicons name="sync" size={18} color={C.info} />
            <Text style={styles.actionBtnText}>Forcar sync</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleQuickAction('export')}
          >
            <Ionicons name="download" size={18} color={C.warning} />
            <Text style={styles.actionBtnText}>Exportar dados</Text>
          </TouchableOpacity>
        </View>

        {/* Activity Feed */}
        <Text style={styles.sectionTitle}>Atividade Recente</Text>
        <View style={styles.feedCard}>
          {mockActivityFeed.map((item, idx) => (
            <View
              key={item.id}
              style={[
                styles.feedItem,
                idx < mockActivityFeed.length - 1 && styles.feedItemBorder,
              ]}
            >
              <View style={styles.feedAvatar}>
                <Text style={styles.feedAvatarText}>{item.initial}</Text>
              </View>
              <View style={styles.feedContent}>
                <Text style={styles.feedUser}>{item.userName}</Text>
                <Text style={styles.feedAction}>{item.action}</Text>
              </View>
              <Text style={styles.feedTime}>
                {item.timestamp.split(' ')[1]}
              </Text>
            </View>
          ))}
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
    paddingBottom: 16,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    color: C.accent,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.accent + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.accent + '30',
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.accent,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  // Metrics
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    width: '47%' as any,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    flexGrow: 1,
  },
  metricIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    marginBottom: 2,
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: C.textSec,
  },
  metricSubtitle: {
    fontSize: 10,
    color: C.textMuted,
    marginTop: 2,
  },

  // Section title
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: 12,
  },

  // Quick actions
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textSec,
    textAlign: 'center',
  },

  // Activity feed
  feedCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  feedItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  feedAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.accent,
  },
  feedContent: {
    flex: 1,
  },
  feedUser: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  feedAction: {
    fontSize: 12,
    color: C.textSec,
    marginTop: 1,
  },
  feedTime: {
    fontSize: 11,
    color: C.textMuted,
  },
});
