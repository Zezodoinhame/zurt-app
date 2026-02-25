import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { type ThemeColors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatCurrency, maskValue } from '../../utils/formatters';
import type { Allocation } from '../../types';

interface AllocationBarProps {
  allocations: Allocation[];
  valuesHidden: boolean;
  onSelectClass?: (allocation: Allocation) => void;
}

export function AllocationBar({ allocations, valuesHidden, onSelectClass }: AllocationBarProps) {
  const { currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View>
      {/* Stacked horizontal bar */}
      <View style={styles.barContainer}>
        {allocations.map((alloc, index) => (
          <View
            key={`${alloc.class}-${index}`}
            style={[
              styles.segment,
              {
                flex: Math.max(
                  0,
                  Math.min(100, typeof alloc.percentage === 'number' ? alloc.percentage : 0),
                ),
                backgroundColor: alloc.color,
              },
              index === 0 && styles.segmentFirst,
              index === allocations.length - 1 && styles.segmentLast,
            ]}
          />
        ))}
      </View>

      {/* Legend list */}
      <View style={styles.legend}>
        {allocations.map((alloc, index) => (
          <TouchableOpacity
            key={`${alloc.class}-${index}`}
            style={styles.legendItem}
            onPress={() => onSelectClass?.(alloc)}
            activeOpacity={onSelectClass ? 0.7 : 1}
          >
            <View style={[styles.dot, { backgroundColor: alloc.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {alloc.label}
            </Text>
            <Text style={styles.legendPct}>
              {(typeof alloc.percentage === 'number'
                ? alloc.percentage
                : parseFloat(String(alloc.percentage)) || 0
              )
                .toFixed(1)
                .replace('.', ',')}
              %
            </Text>
            <Text style={styles.legendValue}>
              {valuesHidden ? maskValue('', currency) : formatCurrency(alloc.value, currency)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
