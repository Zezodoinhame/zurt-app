import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle, Animated, Easing } from 'react-native';
import { colors } from '../../theme/colors';
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
  return (
    <View style={[skeletonStyles.card, style]}>
      <Skeleton width="60%" height={20} />
      <View style={skeletonStyles.spacer} />
      <Skeleton width="40%" height={32} />
      <View style={skeletonStyles.spacer} />
      <Skeleton width="80%" height={14} />
      <View style={skeletonStyles.smallSpacer} />
      <Skeleton width="50%" height={14} />
    </View>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={skeletonStyles.listItem}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <View style={skeletonStyles.listContent}>
            <Skeleton width="70%" height={14} />
            <View style={skeletonStyles.smallSpacer} />
            <Skeleton width="40%" height={12} />
          </View>
          <Skeleton width={80} height={16} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonChart() {
  return (
    <View style={skeletonStyles.chart}>
      <Skeleton width="100%" height={200} borderRadius={radius.md} />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
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
