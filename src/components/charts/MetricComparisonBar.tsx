import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSettingsStore } from '../../stores/settingsStore';
import { type ThemeColors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface MetricItem {
  label: string;
  value: number;
  color: string;
}

interface MetricComparisonBarProps {
  metricLabel: string;
  items: MetricItem[];
  format: 'pct' | 'currency' | 'number' | 'ratio';
}

function formatValue(value: number, format: string): string {
  switch (format) {
    case 'pct': return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
    case 'currency': {
      if (value >= 1e12) return `R$ ${(value / 1e12).toFixed(1)}T`;
      if (value >= 1e9) return `R$ ${(value / 1e9).toFixed(1)}B`;
      if (value >= 1e6) return `R$ ${(value / 1e6).toFixed(1)}M`;
      return `R$ ${value.toLocaleString('pt-BR')}`;
    }
    case 'ratio': return value === 0 ? 'N/A' : value.toFixed(1);
    default: return value.toFixed(1);
  }
}

export function MetricComparisonBar({ metricLabel, items, format }: MetricComparisonBarProps) {
  const colors = useSettingsStore((s) => s.colors);
  // Find max absolute value for scaling
  const maxVal = Math.max(...items.map((i) => Math.abs(i.value)), 0.01);

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: spacing.sm }}>
        {metricLabel}
      </Text>
      {items.map((item, idx) => (
        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Text
            style={{ width: 50, fontSize: 12, fontWeight: '600', color: item.color }}
            numberOfLines={1}
          >
            {item.label}
          </Text>
          <View
            style={{
              flex: 1,
              height: 18,
              backgroundColor: colors.card,
              borderRadius: 4,
              marginHorizontal: spacing.sm,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${Math.min((Math.abs(item.value) / maxVal) * 100, 100)}%`,
                height: '100%',
                backgroundColor: item.color + '80',
                borderRadius: 4,
              }}
            />
          </View>
          <Text
            style={{
              width: 70,
              fontSize: 12,
              fontWeight: '500',
              color: colors.text.primary,
              textAlign: 'right',
            }}
          >
            {formatValue(item.value, format)}
          </Text>
        </View>
      ))}
    </View>
  );
}
