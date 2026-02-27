import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchAdminStats, fetchActivityFeed } from '../services/adminService';
import { defaultB3Checklist } from '../data/mockData';
import type { AdminStats, ActivityFeedItem } from '../data/types';

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

function MetricCard({ title, value, icon, iconColor }: {
  title: string; value: string | number; icon: string; iconColor: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIconCircle, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
  );
}

export default function AdminHome({ onNavigateToConnections }: { onNavigateToConnections: () => void }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsData, feedData] = await Promise.all([
        fetchAdminStats(),
        fetchActivityFeed(),
      ]);
      setStats(statsData);
      setActivityFeed(feedData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const miniChecklist = defaultB3Checklist.slice(0, 4);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  const totalUsers = stats?.totalUsers ?? 0;
  const activeUsers = stats?.activeUsers ?? 0;
  const openFinanceCount = stats?.openFinanceCount ?? 0;
  const b3Count = stats?.b3Count ?? 0;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Metrics Grid */}
      <View style={styles.metricsGrid}>
        <MetricCard title="Total usuarios" value={totalUsers} icon="people" iconColor={C.accent} />
        <MetricCard title="Ativos" value={activeUsers} icon="checkmark-circle" iconColor={C.positive} />
        <MetricCard title="Open Finance" value={openFinanceCount} icon="link" iconColor={C.info} />
        <MetricCard title="B3 conectados" value={b3Count} icon="trending-up" iconColor={C.warning} />
      </View>

      {/* Activity Feed */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Atividade Recente</Text>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Ao vivo</Text>
        </View>
      </View>

      <View style={styles.feedCard}>
        {activityFeed.map((item, idx) => (
          <View
            key={item.id}
            style={[styles.feedItem, idx < activityFeed.length - 1 && styles.feedItemBorder]}
          >
            <View style={[styles.feedDot, {
              backgroundColor: item.action.includes('erro') ? C.negative
                : item.action.includes('sync') ? C.info
                : item.action.includes('criou') ? C.warning
                : C.accent,
            }]} />
            <View style={styles.feedContent}>
              <Text style={styles.feedText}>
                <Text style={styles.feedBold}>{item.userName}</Text>
                {' '}{item.action}
              </Text>
            </View>
            <Text style={styles.feedTime}>{item.timestamp}</Text>
          </View>
        ))}
      </View>

      {/* Mini B3 Checklist */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>B3 Checklist</Text>
      <View style={styles.feedCard}>
        {miniChecklist.map((item, idx) => (
          <View
            key={item.id}
            style={[styles.checkItem, idx < miniChecklist.length - 1 && styles.feedItemBorder]}
          >
            {item.completed ? (
              <Text style={styles.checkEmoji}>{'✅'}</Text>
            ) : item.id === 'sandbox' ? (
              <Text style={styles.checkEmoji}>{'⏳'}</Text>
            ) : (
              <Text style={styles.checkEmoji}>{'❌'}</Text>
            )}
            <Text style={[styles.checkLabel, item.completed && styles.checkLabelDone]}>
              {item.label}
            </Text>
            {item.id === 'sandbox' && (
              <View style={styles.awaitBadge}>
                <Text style={styles.awaitBadgeText}>Aguardando</Text>
              </View>
            )}
          </View>
        ))}
        <TouchableOpacity style={styles.seeAllBtn} onPress={onNavigateToConnections}>
          <Text style={styles.seeAllText}>Ver todos</Text>
          <Ionicons name="chevron-forward" size={14} color={C.accent} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    width: '47%' as any,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    flexGrow: 1,
  },
  metricIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '800',
    color: C.text,
  },
  metricTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: C.textSec,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    marginBottom: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.positive + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.positive,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.positive,
  },
  feedCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  feedItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  feedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  feedContent: { flex: 1 },
  feedText: {
    fontSize: 13,
    color: C.textSec,
  },
  feedBold: {
    fontWeight: '700',
    color: C.text,
  },
  feedTime: {
    fontSize: 11,
    color: C.textMuted,
    fontFamily: 'monospace',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  checkEmoji: { fontSize: 14 },
  checkLabel: {
    flex: 1,
    fontSize: 13,
    color: C.text,
  },
  checkLabelDone: {
    color: C.textMuted,
    textDecorationLine: 'line-through',
  },
  awaitBadge: {
    backgroundColor: C.warning + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  awaitBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: C.warning,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.accent,
  },
});
