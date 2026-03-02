import React from 'react';
import { View } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';
import { useSettingsStore } from '../../stores/settingsStore';

interface RadarChartProps {
  dimensions: { label: string; value: number }[];
  size?: number;
  color?: string;
  fillOpacity?: number;
}

export function RadarChart({
  dimensions,
  size = 200,
  color,
  fillOpacity = 0.25,
}: RadarChartProps) {
  const colors = useSettingsStore((s) => s.colors);
  const strokeColor = color ?? colors.accent;
  const n = dimensions.length;
  if (n < 3) return null;

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 30;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  const getPoint = (i: number, r: number) => ({
    x: cx + r * Math.cos(startAngle + i * angleStep),
    y: cy + r * Math.sin(startAngle + i * angleStep),
  });

  // Grid rings at 25%, 50%, 75%, 100%
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Data polygon points
  const dataPoints = dimensions.map((d, i) => {
    const r = (d.value / 100) * maxR;
    return getPoint(i, r);
  });
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {/* Grid polygons */}
        {rings.map((ring) => {
          const pts = Array.from({ length: n }, (_, i) => {
            const p = getPoint(i, maxR * ring);
            return `${p.x},${p.y}`;
          }).join(' ');
          return (
            <Polygon
              key={ring}
              points={pts}
              fill="none"
              stroke={colors.border}
              strokeWidth={0.5}
              opacity={0.6}
            />
          );
        })}

        {/* Axis lines */}
        {Array.from({ length: n }, (_, i) => {
          const p = getPoint(i, maxR);
          return (
            <Line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke={colors.border}
              strokeWidth={0.5}
              opacity={0.4}
            />
          );
        })}

        {/* Data polygon */}
        <Polygon
          points={dataPolygon}
          fill={strokeColor}
          fillOpacity={fillOpacity}
          stroke={strokeColor}
          strokeWidth={2}
        />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={strokeColor} />
        ))}

        {/* Labels */}
        {dimensions.map((d, i) => {
          const labelR = maxR + 18;
          const p = getPoint(i, labelR);
          const anchor =
            Math.abs(p.x - cx) < 5
              ? 'middle'
              : p.x > cx
                ? 'start'
                : 'end';
          return (
            <SvgText
              key={i}
              x={p.x}
              y={p.y + 4}
              textAnchor={anchor}
              fontSize={10}
              fill={colors.text.secondary}
              fontWeight="500"
            >
              {d.label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
