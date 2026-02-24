import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { type ThemeColors } from '../../theme/colors';
import { useSettingsStore } from '../../stores/settingsStore';
import { spacing, radius } from '../../theme/spacing';
import { formatBRL, formatPct } from '../../utils/formatters';
import type { Allocation } from '../../types';

interface AllocationBarProps {
  allocations: Allocation[];
  onSelectClass?: (allocation: Allocation) => void;
}

export function AllocationBar({ allocations, onSelectClass }: AllocationBarProps) {
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const total = allocations.reduce((sum, a) => sum + a.value, 0);

  return (
    <View style={styles.container}>
      {/* Segmented bar */}
      <View style={styles.barContainer}>
        {allocations.map((alloc, index) => (
          <View
            key={`${alloc.class}-${index}`}
            style={[
              styles.segment,
              {
                flex: alloc.percentage,
                backgroundColor: alloc.color,
              },
              index === 0 && styles.segmentFirst,
              index === allocations.length - 1 && styles.segmentLast,
            ]}
          />
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {allocations.map((alloc, index) => (
          <View key={`${alloc.class}-${index}`}>
            <TouchableOpacity
              style={styles.legendItem}
              onPress={() => onSelectClass?.(alloc)}
              activeOpacity={0.7}
              accessibilityLabel={`${alloc.label}: ${formatPct(alloc.percentage, false)}`}
            >
              <View style={[styles.dot, { backgroundColor: alloc.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {alloc.label}
              </Text>
              <Text style={styles.legendPct}>
                {alloc.percentage.toFixed(1).replace('.', ',')}%
              </Text>
              <Text style={styles.legendValue}>
                {formatBRL(alloc.value)}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {},
  barContainer: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: colors.elevated,
    marginBottom: spacing.lg,
  },
  segment: {
    height: '100%',
  },
  segmentFirst: {
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
  },
  segmentLast: {
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
  },
  legend: {},
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
  },
  legendPct: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    marginRight: spacing.md,
    fontVariant: ['tabular-nums'],
    width: 45,
    textAlign: 'right',
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
    width: 100,
    textAlign: 'right',
  },
});
