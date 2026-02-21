import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

interface BadgeProps {
  value: string;
  variant?: 'positive' | 'negative' | 'warning' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Badge({
  value,
  variant = 'neutral',
  size = 'md',
  style,
}: BadgeProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  return (
    <View style={[styles.base, variantStyle.container, sizeStyle.container, style]}>
      <Text
        style={[
          styles.text,
          variantStyle.text,
          sizeStyle.text,
          { fontVariant: ['tabular-nums'] },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

interface DotBadgeProps {
  count?: number;
  style?: ViewStyle;
}

export function DotBadge({ count, style }: DotBadgeProps) {
  if (count !== undefined && count <= 0) return null;

  return (
    <View style={[styles.dot, style]}>
      {count !== undefined && count > 0 && (
        <Text style={styles.dotText}>
          {count > 99 ? '99+' : count}
        </Text>
      )}
    </View>
  );
}

const variantStyles = {
  positive: {
    container: { backgroundColor: colors.positive + '20' } as ViewStyle,
    text: { color: colors.positive },
  },
  negative: {
    container: { backgroundColor: colors.negative + '20' } as ViewStyle,
    text: { color: colors.negative },
  },
  warning: {
    container: { backgroundColor: colors.warning + '20' } as ViewStyle,
    text: { color: colors.warning },
  },
  info: {
    container: { backgroundColor: colors.info + '20' } as ViewStyle,
    text: { color: colors.info },
  },
  neutral: {
    container: { backgroundColor: colors.elevated } as ViewStyle,
    text: { color: colors.text.secondary },
  },
};

const sizeStyles = {
  sm: {
    container: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.sm,
    } as ViewStyle,
    text: { fontSize: 10, fontWeight: '600' as const },
  },
  md: {
    container: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
    } as ViewStyle,
    text: { fontSize: 12, fontWeight: '600' as const },
  },
};

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
  },
  text: {},
  dot: {
    backgroundColor: colors.accent,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  dotText: {
    color: '#060A0F',
    fontSize: 10,
    fontWeight: '700',
  },
});
