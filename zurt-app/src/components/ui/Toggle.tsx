import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function Toggle({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: ToggleProps) {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: value ? 1 : 0,
      stiffness: 300,
      damping: 20,
      mass: 1,
      useNativeDriver: false,
    }).start();
  }, [value, progress]);

  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.accent],
  });

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(!value);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
    >
      <Animated.View style={[styles.track, { backgroundColor }, disabled && styles.disabled]}>
        <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 3,
    justifyContent: 'center',
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  disabled: {
    opacity: 0.5,
  },
});
