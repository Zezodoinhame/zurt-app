import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Text as SvgText, Line } from 'react-native-svg';
import { useSettingsStore } from '../../stores/settingsStore';

interface AreaChartData {
  label: string;
  income: number;
  expenses: number;
}

interface AreaChartProps {
  data: AreaChartData[];
  width: number;
  height?: number;
}

export function AreaChart({ data, width, height = 200 }: AreaChartProps) {
  const colors = useSettingsStore((s) => s.colors);

  if (data.length === 0) return null;

  const paddingLeft = 10;
  const paddingRight = 10;
  const paddingTop = 10;
  const paddingBottom = 28;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const allValues = data.flatMap((d) => [d.income, d.expenses]);
  const maxVal = Math.max(...allValues) * 1.1;

  const getX = (i: number) => paddingLeft + (i / (data.length - 1)) * chartWidth;
  const getY = (v: number) => paddingTop + chartHeight - (v / maxVal) * chartHeight;

  // Build path strings
  const buildAreaPath = (values: number[]): string => {
    const points = values.map((v, i) => `${getX(i)},${getY(v)}`);
    const baseline = `${getX(values.length - 1)},${paddingTop + chartHeight} ${getX(0)},${paddingTop + chartHeight}`;
    return `M ${points.join(' L ')} L ${baseline} Z`;
  };

  const buildLinePath = (values: number[]): string => {
    const points = values.map((v, i) => `${getX(i)},${getY(v)}`);
    return `M ${points.join(' L ')}`;
  };

  const incomeValues = data.map((d) => d.income);
  const expenseValues = data.map((d) => d.expenses);

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((pct) => (
          <Line
            key={pct}
            x1={paddingLeft}
            y1={getY(maxVal * pct)}
            x2={width - paddingRight}
            y2={getY(maxVal * pct)}
            stroke={colors.border}
            strokeWidth={0.5}
            strokeDasharray="4,4"
          />
        ))}

        {/* Income area (green) */}
        <Path d={buildAreaPath(incomeValues)} fill={colors.positive + '20'} />
        <Path d={buildLinePath(incomeValues)} stroke={colors.positive} strokeWidth={2} fill="none" />

        {/* Expenses area (red) */}
        <Path d={buildAreaPath(expenseValues)} fill={colors.negative + '20'} />
        <Path d={buildLinePath(expenseValues)} stroke={colors.negative} strokeWidth={2} fill="none" />

        {/* X axis labels */}
        {data.map((d, i) => (
          <SvgText
            key={i}
            x={getX(i)}
            y={height - 6}
            fontSize={11}
            fill={colors.text.secondary}
            textAnchor="middle"
          >
            {d.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}
