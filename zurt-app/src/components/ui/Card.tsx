import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { type ThemeColors } from '../../theme/colors';
import { useSettingsStore } from '../../stores/settingsStore';
import { spacing, radius } from '../../theme/spacing';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'glow';
  delay?: number;
  animated?: boolean;
}

export function Card({
  children,
  style,
  variant = 'default',
  delay = 0,
  animated = true,
}: CardProps) {
  const colors = useSettingsStore((s) => s.colors);
  const variantStyle = createVariantStyles(colors)[variant];
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.base, variantStyle, style]}>
      {children}
    </View>
  );
}

const createVariantStyles = (colors: ThemeColors) => ({
  default: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  elevated: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  glow: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent + '30',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  } as ViewStyle,
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
});
