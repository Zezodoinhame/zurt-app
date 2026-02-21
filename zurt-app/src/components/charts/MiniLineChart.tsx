import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSettingsStore } from '../../stores/settingsStore';

interface MiniLineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}

export function MiniLineChart({
  data,
  width = 80,
  height = 30,
  color,
  strokeWidth = 1.5,
}: MiniLineChartProps) {
  const colors = useSettingsStore((s) => s.colors);

  if (data.length < 2) return null;

  const isPositive = data[data.length - 1] >= data[0];
  const lineColor = color ?? (isPositive ? colors.positive : colors.negative);

  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;
  const padding = 2;

  const points = data.map((val, i) => ({
    x: padding + (i / (data.length - 1)) * (width - padding * 2),
    y: padding + (height - padding * 2) - ((val - minVal) / range) * (height - padding * 2),
  }));

  const pathD = points.reduce((path, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = points[i - 1];
    const cpx = (prev.x + point.x) / 2;
    return `${path} C ${cpx} ${prev.y}, ${cpx} ${point.y}, ${point.x} ${point.y}`;
  }, '');

  return (
    <View>
      <Svg width={width} height={height}>
        <Path
          d={pathD}
          stroke={lineColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
