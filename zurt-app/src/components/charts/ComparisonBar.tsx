import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSettingsStore } from '../../stores/settingsStore';
import { spacing, radius } from '../../theme/spacing';

interface ComparisonBarItem {
  label: string;
  current: number;
  target: number;
  color: string;
}

interface ComparisonBarProps {
  data: ComparisonBarItem[];
}

export function ComparisonBar({ data }: ComparisonBarProps) {
  const colors = useSettingsStore((s) => s.colors);
  const maxVal = Math.max(...data.map((d) => Math.max(d.current, d.target)), 1);

  return (
    <View>
      {data.map((item, i) => {
        const currentWidth = (item.current / maxVal) * 100;
        const targetWidth = (item.target / maxVal) * 100;

        return (
          <View key={i} style={styles.row}>
            <View style={styles.labelCol}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={[styles.label, { color: colors.text.primary }]} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
            <View style={styles.barCol}>
              {/* Current bar (solid) */}
              <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${Math.max(currentWidth, 2)}%`, backgroundColor: item.color },
                  ]}
                />
              </View>
              {/* Target bar (outline) */}
              <View style={[styles.barTrack, { backgroundColor: 'transparent', marginTop: 3 }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.max(targetWidth, 2)}%`,
                      backgroundColor: 'transparent',
                      borderWidth: 1.5,
                      borderColor: item.color,
                      borderStyle: 'dashed',
                    },
                  ]}
                />
              </View>
            </View>
            <View style={styles.valCol}>
              <Text style={[styles.val, { color: item.color }]}>{item.current.toFixed(1)}%</Text>
              <Text style={[styles.valTarget, { color: colors.text.muted }]}>{item.target.toFixed(1)}%</Text>
            </View>
          </View>
        );
      })}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: colors.text.muted }]} />
          <Text style={[styles.legendText, { color: colors.text.muted }]}>Atual</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBoxDashed, { borderColor: colors.text.muted }]} />
          <Text style={[styles.legendText, { color: colors.text.muted }]}>Meta</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  labelCol: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  barCol: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  valCol: {
    width: 50,
    alignItems: 'flex-end',
  },
  val: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  valTarget: {
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendBox: {
    width: 12,
    height: 6,
    borderRadius: 2,
  },
  legendBoxDashed: {
    width: 12,
    height: 6,
    borderRadius: 2,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  legendText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
