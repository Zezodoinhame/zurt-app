import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { mockUsers, defaultB3Checklist, type B3ChecklistItem } from '../data/mockData';

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

  const openFinanceCount = mockUsers.filter((u) => u.openFinance).length;
  const b3Count = mockUsers.filter((u) => u.b3Connected).length;
  const completedCount = checklist.filter((c) => c.completed).length;

  useEffect(() => {
    AsyncStorage.getItem(B3_CHECKLIST_KEY).then((raw) => {
      if (raw) { try { setChecklist(JSON.parse(raw)); } catch { /* ignore */ } }
    });
  }, []);

  const toggleItem = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updated);
    await AsyncStorage.setItem(B3_CHECKLIST_KEY, JSON.stringify(updated)).catch(() => {});
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Open Finance Status */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusIcon, { backgroundColor: C.positive + '18' }]}>
            <Ionicons name="link" size={22} color={C.positive} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>Open Finance (Pluggy)</Text>
            <Text style={styles.statusSubtitle}>Integracao ativa</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: C.positive + '20' }]}>
            <View style={[styles.dot, { backgroundColor: C.positive }]} />
            <Text style={[styles.statusPillText, { color: C.positive }]}>Operacional</Text>
          </View>
        </View>
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{openFinanceCount}</Text>
            <Text style={styles.metricLabel}>Conectados</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{mockUsers.length - openFinanceCount}</Text>
            <Text style={styles.metricLabel}>Pendentes</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: C.negative }]}>1</Text>
            <Text style={styles.metricLabel}>Erros</Text>
          </View>
        </View>
      </View>

      {/* B3 Status */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusIcon, { backgroundColor: C.warning + '18' }]}>
            <Ionicons name="trending-up" size={22} color={C.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>B3</Text>
            <Text style={styles.statusSubtitle}>Integracao em andamento</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: C.warning + '20' }]}>
            <View style={[styles.dot, { backgroundColor: C.warning }]} />
            <Text style={[styles.statusPillText, { color: C.warning }]}>Aguardando acesso</Text>
          </View>
        </View>
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{b3Count}</Text>
            <Text style={styles.metricLabel}>Conectados</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{completedCount}/{checklist.length}</Text>
            <Text style={styles.metricLabel}>Checklist</Text>
          </View>
        </View>
      </View>

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
              <Text style={styles.checkEmoji}>{'✅'}</Text>
            ) : item.id === 'sandbox' ? (
              <Text style={styles.checkEmoji}>{'⏳'}</Text>
            ) : (
              <Text style={styles.checkEmoji}>{'❌'}</Text>
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
  },
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
  checkEmoji: { fontSize: 14 },
});
