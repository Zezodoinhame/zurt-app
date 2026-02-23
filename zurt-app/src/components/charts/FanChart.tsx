import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Line, Text as SvgText } from 'react-native-svg';
import type { MonteCarloPercentile } from '../../types';

interface FanChartProps {
  percentiles: MonteCarloPercentile[];
  years: number[];
  width: number;
  height: number;
  accentColor?: string;
}

export function FanChart({ percentiles, years, width, height, accentColor = '#3A86FF' }: FanChartProps) {
  const padding = { top: 20, right: 16, bottom: 30, left: 16 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const { paths, medianPath, yMax, yMin } = useMemo(() => {
    if (!percentiles.length || !years.length) return { paths: [], medianPath: '', yMax: 0, yMin: 0 };

    // Find global min/max across all percentiles
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const p of percentiles) {
      for (const v of p.values) {
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      }
    }

    const yRange = maxVal - minVal || 1;
    const xScale = (i: number) => padding.left + (i / (years.length - 1)) * chartW;
    const yScale = (v: number) => padding.top + chartH - ((v - minVal) / yRange) * chartH;

    // Build band paths (10-90, 25-75)
    const bandPairs = [
      { lower: percentiles[0], upper: percentiles[4], color: percentiles[0]?.color || 'rgba(58,134,255,0.15)' },
      { lower: percentiles[1], upper: percentiles[3], color: percentiles[1]?.color || 'rgba(58,134,255,0.30)' },
    ];

    const bandPaths = bandPairs.map(({ lower, upper, color }) => {
      const forwardPath = years.map((_, i) => {
        const x = xScale(i);
        const y = yScale(upper.values[i]);
        return i === 0 ? `M${x},${y}` : `L${x},${y}`;
      }).join(' ');

      const reversePath = [...years].reverse().map((_, ri) => {
        const i = years.length - 1 - ri;
        const x = xScale(i);
        const y = yScale(lower.values[i]);
        return `L${x},${y}`;
      }).join(' ');

      return { d: `${forwardPath} ${reversePath} Z`, color };
    });

    // Median line
    const median = percentiles[2];
    const mPath = median
      ? years.map((_, i) => {
          const x = xScale(i);
          const y = yScale(median.values[i]);
          return i === 0 ? `M${x},${y}` : `L${x},${y}`;
        }).join(' ')
      : '';

    return { paths: bandPaths, medianPath: mPath, yMax: maxVal, yMin: minVal };
  }, [percentiles, years, width, height]);

  if (!percentiles.length) return null;

  // X-axis labels (every 5 years)
  const xLabels = years.filter((y) => y % 5 === 0 || y === years[years.length - 1]);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* Bands */}
        {paths.map((band, i) => (
          <Path key={i} d={band.d} fill={band.color} strokeWidth={0} />
        ))}

        {/* Median line */}
        {medianPath ? (
          <Path d={medianPath} fill="none" stroke={accentColor} strokeWidth={2.5} />
        ) : null}

        {/* X-axis labels */}
        {xLabels.map((yr) => {
          const x = padding.left + (yr / (years[years.length - 1] || 1)) * chartW;
          return (
            <SvgText
              key={yr}
              x={x}
              y={height - 6}
              fill="#888"
              fontSize={10}
              textAnchor="middle"
            >
              {yr}y
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
