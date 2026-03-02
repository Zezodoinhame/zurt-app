import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSettingsStore } from '../../stores/settingsStore';
import { spacing, radius } from '../../theme/spacing';
import type { DarfEntry } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface DarfCalendarProps {
  darfs: DarfEntry[];
  onSelectMonth?: (entry: DarfEntry) => void;
}

export function DarfCalendar({ darfs, onSelectMonth }: DarfCalendarProps) {
  const colors = useSettingsStore((s) => s.colors);
  const currency = useSettingsStore((s) => s.currency);
  const [selected, setSelected] = useState<number | null>(null);

  const statusColor = (status: DarfEntry['status']) => {
    switch (status) {
      case 'paid': return colors.positive;
      case 'pending': return colors.warning;
      case 'overdue': return colors.negative;
      case 'exempt': return colors.text.muted;
    }
  };

  const handlePress = (entry: DarfEntry) => {
    setSelected(entry.month === selected ? null : entry.month);
    onSelectMonth?.(entry);
  };

  // 4 rows x 3 columns
  const rows: DarfEntry[][] = [];
  for (let i = 0; i < darfs.length; i += 3) {
    rows.push(darfs.slice(i, i + 3));
  }

  const selectedEntry = darfs.find((d) => d.month === selected);

  return (
    <View>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((entry) => {
            const isSelected = entry.month === selected;
            const sc = statusColor(entry.status);
            return (
              <TouchableOpacity
                key={entry.month}
                style={[
                  styles.cell,
                  {
                    backgroundColor: colors.elevated,
                    borderColor: isSelected ? colors.accent : colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => handlePress(entry)}
                activeOpacity={0.7}
              >
                <Text style={[styles.monthLabel, { color: colors.text.primary }]}>{entry.label}</Text>
                <Text style={[styles.amount, { color: entry.amount > 0 ? colors.text.primary : colors.text.muted }]}>
                  {entry.amount > 0 ? formatCurrency(entry.amount, currency) : '-'}
                </Text>
                <View style={[styles.statusDot, { backgroundColor: sc }]} />
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Selected month detail */}
      {selectedEntry && (
        <View style={[styles.detail, { backgroundColor: colors.elevated, borderColor: colors.accent }]}>
          <Text style={[styles.detailTitle, { color: colors.text.primary }]}>
            {selectedEntry.label} 2026
          </Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Status</Text>
            <Text style={[styles.detailValue, { color: statusColor(selectedEntry.status) }]}>
              {selectedEntry.status === 'paid' ? 'Pago' :
               selectedEntry.status === 'pending' ? 'Pendente' :
               selectedEntry.status === 'overdue' ? 'Atrasado' : 'Isento'}
            </Text>
          </View>
          {selectedEntry.amount > 0 && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Valor</Text>
              <Text style={[styles.detailValue, { color: colors.text.primary }]}>
                {formatCurrency(selectedEntry.amount, currency)}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Vencimento</Text>
            <Text style={[styles.detailValue, { color: colors.text.primary }]}>{selectedEntry.dueDate}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
  },
  monthLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  amount: {
    fontSize: 10,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  detail: {
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
