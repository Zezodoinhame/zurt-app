import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSettingsStore } from '../../stores/settingsStore';

interface GaugeChartProps {
  score: number; // 0-100
  size?: number;
  label?: string;
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = {
    x: cx + r * Math.cos(startAngle),
    y: cy + r * Math.sin(startAngle),
  };
  const end = {
    x: cx + r * Math.cos(endAngle),
    y: cy + r * Math.sin(endAngle),
  };
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function interpolateColor(score: number): string {
  if (score <= 33) {
    const t = score / 33;
    const r = 239;
    const g = Math.round(68 + t * (158 - 68));
    const b = Math.round(68 + t * (0 - 68));
    return `rgb(${r},${g},${b})`;
  }
  if (score <= 66) {
    const t = (score - 33) / 33;
    const r = Math.round(239 - t * (239 - 0));
    const g = Math.round(158 + t * (212 - 158));
    const b = Math.round(0 + t * (170 - 0));
    return `rgb(${r},${g},${b})`;
  }
  return '#00D4AA';
}

export function GaugeChart({ score, size = 160, label }: GaugeChartProps) {
  const colors = useSettingsStore((s) => s.colors);
  const strokeWidth = size * 0.08;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = Math.PI * 0.75;
  const endAngle = Math.PI * 2.25;
  const range = endAngle - startAngle;
  const valueAngle = startAngle + (Math.min(Math.max(score, 0), 100) / 100) * range;
  const foregroundColor = interpolateColor(score);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size * 0.65 }}>
      <Svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.75}`}>
        {/* Background track */}
        <Path
          d={describeArc(cx, cy, r, startAngle, endAngle)}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        {/* Foreground arc */}
        {score > 0 && (
          <Path
            d={describeArc(cx, cy, r, startAngle, valueAngle)}
            stroke={foregroundColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
        )}
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: size * 0.22,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: size * 0.2,
            fontWeight: '800',
            color: foregroundColor,
            fontVariant: ['tabular-nums'],
          }}
        >
          {score}
        </Text>
        {label && (
          <Text
            style={{
              fontSize: size * 0.08,
              color: colors.text.secondary,
              fontWeight: '600',
              marginTop: 2,
            }}
          >
            {label}
          </Text>
        )}
      </View>
    </View>
  );
}
