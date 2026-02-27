import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchAdminLogs } from '../services/adminService';
import type { LogEntry } from '../data/types';

const C = {
  bg: '#0A0E14',
  card: '#0F1520',
  border: '#1E2A3A',
  accent: '#00D4AA',
  text: '#E8ECF0',
  textSec: '#8B95A5',
  textMuted: '#64748B',
  negative: '#FF6B6B',
  warning: '#FFD93D',
};

type LevelFilter = 'all' | 'info' | 'warn' | 'error';

const levelFilters: { key: LevelFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'info', label: 'Info' },
  { key: 'warn', label: 'Warn' },
  { key: 'error', label: 'Error' },
];

const levelColor: Record<string, string> = { info: C.textSec, warn: C.warning, error: C.negative };
const levelIcon: Record<string, string> = { info: 'information-circle', warn: 'warning', error: 'alert-circle' };

function LogRow({ log }: { log: LogEntry }) {
  const color = levelColor[log.level] || C.textSec;
  return (
    <View style={styles.logRow}>
      <View style={[styles.levelBar, { backgroundColor: color }]} />
      <View style={styles.logContent}>
        <View style={styles.logTopRow}>
          <Text style={styles.logTimestamp}>{log.timestamp}</Text>
          <View style={[styles.levelPill, { backgroundColor: color + '20' }]}>
            <Ionicons name={(levelIcon[log.level] || 'information-circle') as any} size={10} color={color} />
            <Text style={[styles.levelPillText, { color }]}>{log.level.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.logMessage}>{log.message}</Text>
      </View>
    </View>
  );
}

export default function AdminLogs() {
  const [filter, setFilter] = useState<LevelFilter>('all');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdminLogs();
      setLogs(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    if (filter === 'all') return logs;
    return logs.filter((l) => l.level === filter);
  }, [logs, filter]);

  const counts = useMemo(() => ({
    all: logs.length,
    info: logs.filter((l) => l.level === 'info').length,
    warn: logs.filter((l) => l.level === 'warn').length,
    error: logs.filter((l) => l.level === 'error').length,
  }), [logs]);

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filtersRow}>
        {levelFilters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
              {f.label}
            </Text>
            <View style={[styles.filterCount, filter === f.key && styles.filterCountActive]}>
              <Text style={[styles.filterCountText, filter === f.key && styles.filterCountTextActive]}>
                {counts[f.key]}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <LogRow log={item} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="terminal-outline" size={40} color={C.textMuted} />
              <Text style={styles.emptyText}>Nenhum log encontrado</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginVertical: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
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
  filterCount: {
    backgroundColor: C.border,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  filterCountActive: { backgroundColor: C.accent + '30' },
  filterCountText: { fontSize: 9, fontWeight: '700', color: C.textMuted },
  filterCountTextActive: { color: C.accent },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  logRow: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 6,
    overflow: 'hidden',
  },
  levelBar: { width: 3 },
  logContent: { flex: 1, padding: 12 },
  logTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logTimestamp: {
    fontSize: 10,
    color: C.textMuted,
    fontFamily: 'monospace',
  },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  levelPillText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  logMessage: { fontSize: 13, color: C.text, lineHeight: 18 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: { fontSize: 14, color: C.textMuted },
});
