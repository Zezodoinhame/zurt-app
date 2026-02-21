import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, ViewStyle, Animated, Easing } from 'react-native';
import { type ThemeColors } from '../../theme/colors';
import { useSettingsStore } from '../../stores/settingsStore';
import { radius } from '../../theme/spacing';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width,
  height,
  borderRadius = radius.sm,
  style,
}: SkeletonProps) {
  const colors = useSettingsStore((s) => s.colors);
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: colors.elevated,
        },
        { opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createSkeletonStyles(colors), [colors]);

  return (
    <View style={[styles.card, style]}>
      <Skeleton width="60%" height={20} />
      <View style={styles.spacer} />
      <Skeleton width="40%" height={32} />
      <View style={styles.spacer} />
      <Skeleton width="80%" height={14} />
      <View style={styles.smallSpacer} />
      <Skeleton width="50%" height={14} />
    </View>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createSkeletonStyles(colors), [colors]);

  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.listItem}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <View style={styles.listContent}>
            <Skeleton width="70%" height={14} />
            <View style={styles.smallSpacer} />
            <Skeleton width="40%" height={12} />
          </View>
          <Skeleton width={80} height={16} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonChart() {
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createSkeletonStyles(colors), [colors]);

  return (
    <View style={styles.chart}>
      <Skeleton width="100%" height={200} borderRadius={radius.md} />
    </View>
  );
}

const createSkeletonStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  spacer: {
    height: 12,
  },
  smallSpacer: {
    height: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  listContent: {
    flex: 1,
    marginLeft: 12,
  },
  chart: {
    marginBottom: 16,
  },
});
