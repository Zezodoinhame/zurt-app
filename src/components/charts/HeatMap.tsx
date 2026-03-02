import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSettingsStore } from '../../stores/settingsStore';

interface HeatMapProps {
  tickers: string[];
  values: number[][]; // NxN, -1 to +1
  onCellPress?: (row: number, col: number) => void;
  cellSize?: number;
}

/** Interpolate from red (-1) through white (0) to green (+1) */
function correlationColor(value: number, isDark: boolean): string {
  const clamped = Math.max(-1, Math.min(1, value));
  if (clamped > 0) {
    // White → Green
    const t = clamped;
    const r = Math.round(isDark ? 30 + (1 - t) * 50 : 255 * (1 - t));
    const g = Math.round(isDark ? 80 + t * 120 : 180 + t * 75);
    const b = Math.round(isDark ? 30 + (1 - t) * 50 : 255 * (1 - t));
    return `rgb(${r},${g},${b})`;
  }
  if (clamped < 0) {
    // White → Red
    const t = -clamped;
    const r = Math.round(isDark ? 80 + t * 140 : 200 + t * 55);
    const g = Math.round(isDark ? 30 + (1 - t) * 50 : 255 * (1 - t));
    const b = Math.round(isDark ? 30 + (1 - t) * 50 : 255 * (1 - t));
    return `rgb(${r},${g},${b})`;
  }
  return isDark ? 'rgb(80,80,80)' : 'rgb(255,255,255)';
}

export function HeatMap({ tickers, values, onCellPress, cellSize = 44 }: HeatMapProps) {
  const colors = useSettingsStore((s) => s.colors);
  const isDark = useSettingsStore((s) => s.isDark);
  const n = tickers.length;
  const labelWidth = 48;

  return (
    <View>
      {/* Column headers */}
      <View style={[styles.row, { marginLeft: labelWidth }]}>
        {tickers.map((t, i) => (
          <View key={i} style={[styles.headerCell, { width: cellSize }]}>
            <Text style={[styles.headerText, { color: colors.text.muted }]} numberOfLines={1}>
              {t.length > 5 ? t.slice(0, 4) : t}
            </Text>
          </View>
        ))}
      </View>

      {/* Rows */}
      {tickers.map((rowTicker, r) => (
        <View key={r} style={styles.row}>
          {/* Row label */}
          <View style={[styles.rowLabel, { width: labelWidth }]}>
            <Text style={[styles.rowLabelText, { color: colors.text.secondary }]} numberOfLines={1}>
              {rowTicker.length > 6 ? rowTicker.slice(0, 5) : rowTicker}
            </Text>
          </View>
          {/* Cells */}
          {values[r].map((val, c) => (
            <TouchableOpacity
              key={c}
              activeOpacity={0.7}
              onPress={() => onCellPress?.(r, c)}
              style={[
                styles.cell,
                {
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: correlationColor(val, isDark),
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.cellText, { color: Math.abs(val) > 0.5 ? '#FFFFFF' : colors.text.primary }]}>
                {val.toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  headerText: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  rowLabel: {
    justifyContent: 'center',
    paddingRight: 4,
  },
  rowLabelText: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'right',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderRadius: 3,
    margin: 1,
  },
  cellText: {
    fontSize: 9,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
