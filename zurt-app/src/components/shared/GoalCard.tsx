import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { type ThemeColors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { useSettingsStore } from '../../stores/settingsStore';
import { AppIcon, type AppIconName } from '../../hooks/useIcon';
import { CircularProgress } from '../charts/CircularProgress';
import { formatCurrency, maskValue } from '../../utils/formatters';

interface GoalCardProps {
  name: string;
  icon: AppIconName;
  progress: number; // 0 to 1
  currentValue: number;
  targetValue: number;
  valuesHidden: boolean;
  color?: string;
  onPress?: () => void;
}

export function GoalCard({
  name,
  icon,
  progress,
  currentValue,
  targetValue,
  valuesHidden,
  color,
  onPress,
}: GoalCardProps) {
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const progressColor = color ?? colors.accent;

  const display = (value: number) =>
    valuesHidden ? maskValue('', currency) : formatCurrency(value, currency);

  const content = (
    <View style={styles.container}>
      <CircularProgress
        progress={progress}
        size={56}
        strokeWidth={5}
        color={progressColor}
      >
        <AppIcon name={icon} size={20} color={progressColor} />
      </CircularProgress>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.values}>
          {display(currentValue)}{' '}
          <Text style={styles.target}>
            / {display(targetValue)}
          </Text>
        </Text>
      </View>

      <Text style={styles.pct}>{Math.round(progress * 100)}%</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.sm,
      gap: spacing.md,
    },
    info: {
      flex: 1,
    },
    name: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 2,
    },
    values: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    target: {
      color: colors.text.muted,
      fontWeight: '400',
    },
    pct: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.accent,
      fontVariant: ['tabular-nums'],
    },
  });
