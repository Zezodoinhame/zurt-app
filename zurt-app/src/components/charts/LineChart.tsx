import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle } from 'react-native-svg';
import { type ThemeColors } from '../../theme/colors';
import { useSettingsStore } from '../../stores/settingsStore';
import { spacing } from '../../theme/spacing';
import { formatBRL } from '../../utils/formatters';

interface DataPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  showGradient?: boolean;
  referenceValue?: number;
  onPointSelect?: (point: DataPoint | null) => void;
}

export function LineChart({
  data,
  width: propWidth,
  height = 200,
  color,
  showGradient = true,
  referenceValue,
  onPointSelect,
}: LineChartProps) {
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const lineColor = color ?? colors.accent;

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = propWidth ?? screenWidth - 80;
  const padding = { top: 20, right: 10, bottom: 30, left: 10 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (data.length < 2) return null;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values) * 0.98;
  const maxVal = Math.max(...values) * 1.02;
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * innerWidth,
    y: padding.top + innerHeight - ((d.value - minVal) / range) * innerHeight,
  }));

  // Build smooth curve path
  const linePath = points.reduce((path, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = points[i - 1];
    const cpx = (prev.x + point.x) / 2;
    return `${path} C ${cpx} ${prev.y}, ${cpx} ${point.y}, ${point.x} ${point.y}`;
  }, '');

  // Gradient fill path
  const gradientPath = `${linePath} L ${points[points.length - 1].x} ${
    height - padding.bottom
  } L ${points[0].x} ${height - padding.bottom} Z`;

  // Reference line Y position
  const refY = referenceValue
    ? padding.top +
      innerHeight -
      ((referenceValue - minVal) / range) * innerHeight
    : null;

  const handlePress = (index: number) => {
    setSelectedIndex(index === selectedIndex ? null : index);
    onPointSelect?.(index === selectedIndex ? null : data[index]);
  };

  return (
    <View>
      <View style={styles.container}>
        <Svg width={chartWidth} height={height}>
          <Defs>
            <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={lineColor} stopOpacity="0.3" />
              <Stop offset="1" stopColor={lineColor} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Reference line */}
          {refY !== null && (
            <Line
              x1={padding.left}
              y1={refY}
              x2={chartWidth - padding.right}
              y2={refY}
              stroke={colors.text.muted}
              strokeWidth={1}
              strokeDasharray="4,4"
              opacity={0.5}
            />
          )}

          {/* Gradient fill */}
          {showGradient && (
            <Path d={gradientPath} fill="url(#gradient)" />
          )}

          {/* Main line */}
          <Path
            d={linePath}
            stroke={lineColor}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Selected point */}
          {selectedIndex !== null && points[selectedIndex] && (
            <>
              <Line
                x1={points[selectedIndex].x}
                y1={padding.top}
                x2={points[selectedIndex].x}
                y2={height - padding.bottom}
                stroke={colors.text.muted}
                strokeWidth={1}
                strokeDasharray="4,4"
                opacity={0.4}
              />
              <Circle
                cx={points[selectedIndex].x}
                cy={points[selectedIndex].y}
                r={6}
                fill={lineColor}
                stroke={colors.background}
                strokeWidth={3}
              />
            </>
          )}
        </Svg>

        {/* Touch targets */}
        <View style={[styles.touchLayer, { width: chartWidth, height }]}>
          {points.map((point, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.touchTarget,
                {
                  left: point.x - 15,
                  top: 0,
                  height,
                  width: 30,
                },
              ]}
              onPress={() => handlePress(i)}
              activeOpacity={1}
            />
          ))}
        </View>

        {/* Tooltip */}
        {selectedIndex !== null && data[selectedIndex] && (
          <View
            style={[
              styles.tooltip,
              {
                left: Math.min(
                  Math.max(points[selectedIndex].x - 50, 0),
                  chartWidth - 100
                ),
                top: points[selectedIndex].y - 50,
              },
            ]}
          >
            <Text style={styles.tooltipValue}>
              {formatBRL(data[selectedIndex].value)}
            </Text>
            <Text style={styles.tooltipLabel}>
              {data[selectedIndex].label}
            </Text>
          </View>
        )}

        {/* X-axis labels */}
        <View style={[styles.labels, { width: chartWidth }]}>
          {data
            .filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1)
            .map((d, i) => (
              <Text key={i} style={styles.label}>
                {d.label}
              </Text>
            ))}
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    position: 'relative',
  },
  touchLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
  },
  touchTarget: {
    position: 'absolute',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: colors.elevated,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    minWidth: 100,
  },
  tooltipValue: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  tooltipLabel: {
    color: colors.text.muted,
    fontSize: 10,
    marginTop: 2,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 4,
  },
  label: {
    color: colors.text.muted,
    fontSize: 10,
  },
});
