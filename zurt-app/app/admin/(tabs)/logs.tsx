import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mockLogs, type LogEntry } from '../data/mockData';

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

type LevelFilter = 'all' | 'info' | 'warn' | 'error';

const levelFilters: { key: LevelFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'info', label: 'Info' },
  { key: 'warn', label: 'Warn' },
  { key: 'error', label: 'Error' },
];

const levelColor: Record<string, string> = {
  info: C.textSec,
  warn: C.warning,
  error: C.negative,
};

const levelIcon: Record<string, string> = {
  info: 'information-circle',
  warn: 'warning',
  error: 'alert-circle',
};

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ---------------------------------------------------------------------------
// Log row
// ---------------------------------------------------------------------------

function LogRow({ log }: { log: LogEntry }) {
  const color = levelColor[log.level] || C.textSec;
  const icon = levelIcon[log.level] || 'information-circle';

  return (
    <View style={styles.logRow}>
      <View style={[styles.levelBar, { backgroundColor: color }]} />
      <View style={styles.logContent}>
        <View style={styles.logTopRow}>
          <Ionicons name={icon as any} size={14} color={color} />
          <Text style={[styles.levelBadge, { color }]}>
            {log.level.toUpperCase()}
          </Text>
          <Text style={styles.logTimestamp}>{formatTimestamp(log.timestamp)}</Text>
        </View>
        <Text style={styles.logMessage}>{log.message}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Logs Screen
// ---------------------------------------------------------------------------

export default function AdminLogsScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<LevelFilter>('all');

  const filteredLogs = useMemo(() => {
    if (filter === 'all') return mockLogs;
    return mockLogs.filter((l) => l.level === filter);
  }, [filter]);

  const counts = useMemo(() => ({
    all: mockLogs.length,
    info: mockLogs.filter((l) => l.level === 'info').length,
    warn: mockLogs.filter((l) => l.level === 'warn').length,
    error: mockLogs.filter((l) => l.level === 'error').length,
  }), []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Logs</Text>
        <Text style={styles.headerSubtitle}>{filteredLogs.length} entradas</Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersRow}>
        {levelFilters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === f.key && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
            <View
              style={[
                styles.filterCount,
                filter === f.key && styles.filterCountActive,
              ]}
            >
              <Text
                style={[
                  styles.filterCountText,
                  filter === f.key && styles.filterCountTextActive,
                ]}
              >
                {counts[f.key]}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Log list */}
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
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 2,
  },

  // Filters
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginVertical: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
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
  filterCount: {
    backgroundColor: C.border,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  filterCountActive: {
    backgroundColor: C.accent + '30',
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.textMuted,
  },
  filterCountTextActive: {
    color: C.accent,
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  logRow: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 6,
    overflow: 'hidden',
  },
  levelBar: {
    width: 3,
  },
  logContent: {
    flex: 1,
    padding: 12,
  },
  logTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  levelBadge: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  logTimestamp: {
    fontSize: 10,
    color: C.textMuted,
    marginLeft: 'auto',
  },
  logMessage: {
    fontSize: 13,
    color: C.text,
    lineHeight: 18,
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
