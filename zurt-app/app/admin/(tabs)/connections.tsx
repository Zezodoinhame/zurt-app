import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { mockUsers, defaultB3Checklist, type B3ChecklistItem } from '../data/mockData';

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

const B3_CHECKLIST_KEY = 'zurt:admin:b3checklist';

export default function AdminConnectionsScreen() {
  const insets = useSafeAreaInsets();
  const [checklist, setChecklist] = useState<B3ChecklistItem[]>(defaultB3Checklist);

  const openFinanceCount = mockUsers.filter((u) => u.openFinance).length;
  const b3Count = mockUsers.filter((u) => u.b3Connected).length;
  const completedCount = checklist.filter((c) => c.completed).length;

  useEffect(() => {
    AsyncStorage.getItem(B3_CHECKLIST_KEY).then((raw) => {
      if (raw) {
        try { setChecklist(JSON.parse(raw)); } catch { /* ignore */ }
      }
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
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conexoes</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Open Finance Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusCardHeader}>
            <View style={[styles.statusIcon, { backgroundColor: C.positive + '18' }]}>
              <Ionicons name="link" size={22} color={C.positive} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusCardTitle}>Open Finance (Pluggy)</Text>
              <Text style={styles.statusCardSubtitle}>Integracao ativa</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: C.positive + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: C.positive }]} />
              <Text style={[styles.statusPillText, { color: C.positive }]}>Operacional</Text>
            </View>
          </View>
          <View style={styles.statusMetrics}>
            <View style={styles.statusMetric}>
              <Text style={styles.statusMetricValue}>{openFinanceCount}</Text>
              <Text style={styles.statusMetricLabel}>Conectados</Text>
            </View>
            <View style={styles.statusMetricDivider} />
            <View style={styles.statusMetric}>
              <Text style={styles.statusMetricValue}>{mockUsers.length - openFinanceCount}</Text>
              <Text style={styles.statusMetricLabel}>Pendentes</Text>
            </View>
            <View style={styles.statusMetricDivider} />
            <View style={styles.statusMetric}>
              <Text style={[styles.statusMetricValue, { color: C.negative }]}>1</Text>
              <Text style={styles.statusMetricLabel}>Erros recentes</Text>
            </View>
          </View>
        </View>

        {/* B3 Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusCardHeader}>
            <View style={[styles.statusIcon, { backgroundColor: C.warning + '18' }]}>
              <Ionicons name="trending-up" size={22} color={C.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusCardTitle}>B3</Text>
              <Text style={styles.statusCardSubtitle}>Integracao em andamento</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: C.warning + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: C.warning }]} />
              <Text style={[styles.statusPillText, { color: C.warning }]}>Sandbox</Text>
            </View>
          </View>
          <View style={styles.statusMetrics}>
            <View style={styles.statusMetric}>
              <Text style={styles.statusMetricValue}>{b3Count}</Text>
              <Text style={styles.statusMetricLabel}>Conectados</Text>
            </View>
            <View style={styles.statusMetricDivider} />
            <View style={styles.statusMetric}>
              <Text style={styles.statusMetricValue}>{completedCount}/{checklist.length}</Text>
              <Text style={styles.statusMetricLabel}>Checklist</Text>
            </View>
          </View>
        </View>

        {/* B3 Checklist */}
        <Text style={styles.sectionTitle}>Checklist B3 Producao</Text>
        <View style={styles.checklistCard}>
          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${(completedCount / checklist.length) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {completedCount} de {checklist.length} concluidos
          </Text>

          {checklist.map((item, idx) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.checklistItem,
                idx < checklist.length - 1 && styles.checklistItemBorder,
              ]}
              onPress={() => toggleItem(item.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  item.completed && styles.checkboxChecked,
                ]}
              >
                {item.completed && (
                  <Ionicons name="checkmark" size={14} color="#000" />
                )}
              </View>
              <Text
                style={[
                  styles.checklistLabel,
                  item.completed && styles.checklistLabelChecked,
                ]}
              >
                {item.label}
              </Text>
              {item.completed ? (
                <Text style={styles.checkIcon}>{'✅'}</Text>
              ) : (
                <Text style={styles.checkIcon}>{'⏳'}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Status cards
  statusCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 12,
  },
  statusCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  statusCardSubtitle: {
    fontSize: 12,
    color: C.textSec,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusMetrics: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    borderRadius: 10,
    padding: 12,
  },
  statusMetric: {
    flex: 1,
    alignItems: 'center',
  },
  statusMetricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
  },
  statusMetricLabel: {
    fontSize: 10,
    color: C.textMuted,
    marginTop: 2,
  },
  statusMetricDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginVertical: 4,
  },

  // Section
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: 10,
    marginTop: 12,
  },

  // Checklist
  checklistCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: C.border,
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: C.accent,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: C.textMuted,
    marginBottom: 12,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  checklistItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  checklistLabel: {
    flex: 1,
    fontSize: 14,
    color: C.text,
  },
  checklistLabelChecked: {
    color: C.textMuted,
    textDecorationLine: 'line-through',
  },
  checkIcon: {
    fontSize: 14,
  },
});
