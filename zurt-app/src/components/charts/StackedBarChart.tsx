import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { useSettingsStore } from '../../stores/settingsStore';

interface BarData {
  label: string;
  invested: number;
  gains: number;
}

interface StackedBarChartProps {
  data: BarData[];
  width: number;
  height?: number;
}

export function StackedBarChart({
  data,
  width,
  height = 200,
}: StackedBarChartProps) {
  const colors = useSettingsStore((s) => s.colors);

  if (data.length === 0) return null;

  const paddingBottom = 24;
  const paddingTop = 8;
  const chartHeight = height - paddingBottom - paddingTop;

  const maxValue = Math.max(...data.map((d) => d.invested + d.gains), 1);
  const barGap = 8;
  const barWidth = Math.max(
    8,
    (width - barGap * (data.length + 1)) / data.length,
  );

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {data.map((d, i) => {
          const total = d.invested + d.gains;
          const totalHeight = (total / maxValue) * chartHeight;
          const investedHeight = (d.invested / maxValue) * chartHeight;
          const gainsHeight = totalHeight - investedHeight;
          const x = barGap + i * (barWidth + barGap);
          const yBase = paddingTop + chartHeight;

          return (
            <React.Fragment key={i}>
              {/* Invested (bottom) */}
              <Rect
                x={x}
                y={yBase - investedHeight}
                width={barWidth}
                height={Math.max(investedHeight, 0)}
                rx={4}
                fill={colors.info}
                opacity={0.7}
              />
              {/* Gains (top) */}
              {gainsHeight > 0 && (
                <Rect
                  x={x}
                  y={yBase - totalHeight}
                  width={barWidth}
                  height={gainsHeight}
                  rx={4}
                  fill={colors.accent}
                />
              )}
              {/* X-axis label */}
              <SvgText
                x={x + barWidth / 2}
                y={height - 4}
                textAnchor="middle"
                fontSize={10}
                fill={colors.text.muted}
              >
                {d.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}
