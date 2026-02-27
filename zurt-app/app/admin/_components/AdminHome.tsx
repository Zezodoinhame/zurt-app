import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchDashboardMetrics, fetchLoginHistory } from '../services/adminService';
import { defaultB3Checklist } from '../data/mockData';
import type { DashboardMetrics, LoginHistoryEntry } from '../data/types';

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

function formatMRR(value: number): string {
  if (value >= 1000) return `R$ ${(value / 100).toFixed(0)}`;
  return `R$ ${(value / 100).toFixed(2)}`;
}

export default function AdminHome({ onNavigateToConnections }: { onNavigateToConnections: () => void }) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [metricsData, historyData] = await Promise.all([
        fetchDashboardMetrics(),
        fetchLoginHistory({ page: 1 }),
      ]);
      setMetrics(metricsData);
      setLoginHistory(historyData.slice(0, 10));
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao carregar dados');
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

  if (error) {
    return (
      <View style={styles.loader}>
        <Ionicons name="alert-circle-outline" size={40} color={C.negative} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalUsers = metrics?.kpis?.totalUsers ?? metrics?.kpis?.activeUsers ?? 0;
  const activeUsers = metrics?.kpis?.activeUsers ?? 0;
  const newUsers = metrics?.kpis?.newUsers ?? 0;
  const mrr = metrics?.kpis?.mrr ?? 0;

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
        <MetricCard title="Novos" value={newUsers} icon="person-add" iconColor={C.info} />
        <MetricCard title="MRR" value={formatMRR(mrr)} icon="cash" iconColor={C.warning} />
      </View>

      {/* Recent Registrations */}
      {(metrics?.recentRegistrations?.length ?? 0) > 0 && (
        <>
          <Text style={styles.sectionTitle}>Registros Recentes</Text>
          <View style={styles.feedCard}>
            {metrics!.recentRegistrations.slice(0, 5).map((reg, idx) => (
              <View
                key={reg.id ?? idx}
                style={[styles.feedItem, idx < Math.min(metrics!.recentRegistrations.length, 5) - 1 && styles.feedItemBorder]}
              >
                <View style={[styles.feedDot, { backgroundColor: C.info }]} />
                <View style={styles.feedContent}>
                  <Text style={styles.feedText}>
                    <Text style={styles.feedBold}>{reg.name || reg.email}</Text>
                    {' '}se registrou
                  </Text>
                </View>
                <Text style={styles.feedTime}>
                  {reg.createdAt ? new Date(reg.createdAt).toLocaleDateString('pt-BR') : ''}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Login Activity */}
      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
        <Text style={styles.sectionTitle}>Atividade de Login</Text>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Recente</Text>
        </View>
      </View>

      <View style={styles.feedCard}>
        {loginHistory.length === 0 ? (
          <View style={styles.emptyFeed}>
            <Text style={styles.emptyText}>Nenhum login registrado</Text>
          </View>
        ) : (
          loginHistory.map((entry, idx) => (
            <View
              key={entry.id ?? idx}
              style={[styles.feedItem, idx < loginHistory.length - 1 && styles.feedItemBorder]}
            >
              <View style={[styles.feedDot, {
                backgroundColor: entry.success ? C.accent : C.negative,
              }]} />
              <View style={styles.feedContent}>
                <Text style={styles.feedText}>
                  <Text style={styles.feedBold}>{entry.userName || entry.userEmail}</Text>
                  {entry.success ? ' fez login' : ' falhou login'}
                </Text>
                {entry.device ? (
                  <Text style={styles.feedSubtext}>{entry.device.substring(0, 40)}</Text>
                ) : null}
              </View>
              <Text style={styles.feedTime}>
                {entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
              </Text>
            </View>
          ))
        )}
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
              <Ionicons name="checkmark-circle" size={16} color={C.positive} />
            ) : item.id === 'sandbox' ? (
              <Ionicons name="time" size={16} color={C.warning} />
            ) : (
              <Ionicons name="close-circle" size={16} color={C.negative} />
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
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 14, color: '#FF6B6B', textAlign: 'center', marginTop: 8 },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#00D4AA20',
  },
  retryText: { fontSize: 14, fontWeight: '600', color: '#00D4AA' },
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
  feedSubtext: {
    fontSize: 10,
    color: C.textMuted,
    marginTop: 2,
  },
  feedTime: {
    fontSize: 11,
    color: C.textMuted,
    fontFamily: 'monospace',
  },
  emptyFeed: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: { fontSize: 13, color: C.textMuted },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
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
