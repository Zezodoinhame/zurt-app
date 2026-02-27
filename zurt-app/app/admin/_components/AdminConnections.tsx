import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { defaultB3Checklist, type B3ChecklistItem } from '../data/mockData';
import { fetchIntegrations } from '../services/adminService';
import type { IntegrationData } from '../data/types';

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

const B3_CHECKLIST_KEY = 'zurt:admin:b3checklist';

export default function AdminConnections() {
  const [checklist, setChecklist] = useState<B3ChecklistItem[]>(defaultB3Checklist);
  const [integrations, setIntegrations] = useState<IntegrationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const completedCount = checklist.filter((c) => c.completed).length;

  useEffect(() => {
    Promise.all([
      fetchIntegrations().then(setIntegrations).catch((err: any) => {
        setError(err?.message ?? 'Erro ao carregar integracoes');
      }),
      AsyncStorage.getItem(B3_CHECKLIST_KEY).then((raw) => {
        if (raw) { try { setChecklist(JSON.parse(raw)); } catch { /* ignore */ } }
      }),
    ]).finally(() => setIsLoading(false));
  }, []);

  const toggleItem = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updated);
    await AsyncStorage.setItem(B3_CHECKLIST_KEY, JSON.stringify(updated)).catch(() => {});
  };

  const healthy = integrations?.stats?.healthy ?? 0;
  const degraded = integrations?.stats?.degraded ?? 0;
  const down = integrations?.stats?.down ?? 0;
  const total = integrations?.stats?.total ?? 0;

  const overallStatus = down > 0 ? 'down' : degraded > 0 ? 'degraded' : 'healthy';
  const statusConfig = {
    healthy: { color: C.positive, label: 'Operacional', icon: 'checkmark-circle' },
    degraded: { color: C.warning, label: 'Degradado', icon: 'warning' },
    down: { color: C.negative, label: 'Indisponivel', icon: 'alert-circle' },
  };
  const currentStatus = statusConfig[overallStatus];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Integration Status */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusIcon, { backgroundColor: currentStatus.color + '18' }]}>
            <Ionicons name="cloud" size={22} color={currentStatus.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>Integracoes</Text>
            <Text style={styles.statusSubtitle}>{total} integracoes configuradas</Text>
          </View>
          {isLoading ? (
            <ActivityIndicator size="small" color={C.accent} />
          ) : (
            <View style={[styles.statusPill, { backgroundColor: currentStatus.color + '20' }]}>
              <View style={[styles.dot, { backgroundColor: currentStatus.color }]} />
              <Text style={[styles.statusPillText, { color: currentStatus.color }]}>{currentStatus.label}</Text>
            </View>
          )}
        </View>
        {!isLoading && !error && (
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={[styles.metricValue, { color: C.positive }]}>{healthy}</Text>
              <Text style={styles.metricLabel}>Saudaveis</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <Text style={[styles.metricValue, { color: C.warning }]}>{degraded}</Text>
              <Text style={styles.metricLabel}>Degradados</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <Text style={[styles.metricValue, { color: C.negative }]}>{down}</Text>
              <Text style={styles.metricLabel}>Indisponiveis</Text>
            </View>
          </View>
        )}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>

      {/* Integration List */}
      {(integrations?.integrations?.length ?? 0) > 0 && (
        <>
          <Text style={styles.sectionTitle}>Detalhes</Text>
          <View style={styles.checklistCard}>
            {integrations!.integrations.map((integ, idx) => {
              const intColor = integ.status === 'healthy' ? C.positive
                : integ.status === 'degraded' ? C.warning : C.negative;
              return (
                <View
                  key={integ.id ?? idx}
                  style={[styles.integItem, idx < integrations!.integrations.length - 1 && styles.checkItemBorder]}
                >
                  <View style={[styles.dot, { backgroundColor: intColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.integName}>{integ.name}</Text>
                    <Text style={styles.integType}>{integ.type}</Text>
                  </View>
                  <Text style={[styles.integStatus, { color: intColor }]}>
                    {integ.status === 'healthy' ? 'OK' : integ.status === 'degraded' ? 'Lento' : 'Fora'}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* B3 Checklist */}
      <Text style={styles.sectionTitle}>Checklist B3 Producao</Text>
      <View style={styles.checklistCard}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${(completedCount / checklist.length) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>{completedCount} de {checklist.length} concluidos</Text>

        {checklist.map((item, idx) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.checkItem, idx < checklist.length - 1 && styles.checkItemBorder]}
            onPress={() => toggleItem(item.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, item.completed && styles.checkboxChecked]}>
              {item.completed && <Ionicons name="checkmark" size={14} color="#000" />}
            </View>
            <Text style={[styles.checkLabel, item.completed && styles.checkLabelDone]}>{item.label}</Text>
            {item.completed ? (
              <Ionicons name="checkmark-circle" size={16} color={C.positive} />
            ) : item.id === 'sandbox' ? (
              <Ionicons name="time" size={16} color={C.warning} />
            ) : (
              <Ionicons name="close-circle" size={16} color={C.negative} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  statusCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  statusIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  statusSubtitle: { fontSize: 11, color: C.textSec, marginTop: 1 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: '600' },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    borderRadius: 10,
    padding: 12,
  },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { fontSize: 20, fontWeight: '800', color: C.text },
  metricLabel: { fontSize: 10, color: C.textMuted, marginTop: 2 },
  metricDivider: { width: StyleSheet.hairlineWidth, backgroundColor: C.border, marginVertical: 4 },
  errorText: { fontSize: 12, color: '#FF6B6B', textAlign: 'center', marginTop: 8 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    marginBottom: 10,
    marginTop: 8,
  },
  checklistCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 12,
  },
  integItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 10,
  },
  integName: { fontSize: 13, fontWeight: '600', color: C.text },
  integType: { fontSize: 10, color: C.textMuted, marginTop: 1 },
  integStatus: { fontSize: 11, fontWeight: '700' },
  progressBarBg: {
    height: 5,
    backgroundColor: C.border,
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressBarFill: { height: 5, backgroundColor: C.accent, borderRadius: 3 },
  progressText: { fontSize: 10, color: C.textMuted, marginBottom: 10 },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 10,
  },
  checkItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: C.accent, borderColor: C.accent },
  checkLabel: { flex: 1, fontSize: 13, color: C.text },
  checkLabelDone: { color: C.textMuted, textDecorationLine: 'line-through' },
});
