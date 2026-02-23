import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';
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

  const fadeAnim = useRef(new Animated.Value(animated ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(animated ? 16 : 0)).current;

  useEffect(() => {
    if (!animated) return;
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [animated, delay, fadeAnim, translateY]);

  return (
    <Animated.View
      style={[
        styles.base,
        variantStyle,
        animated && { opacity: fadeAnim, transform: [{ translateY }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
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
