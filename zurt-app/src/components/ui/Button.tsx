import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  fullWidth = true,
}: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      stiffness: 300,
      damping: 20,
      mass: 1,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      stiffness: 300,
      damping: 20,
      mass: 1,
    }).start();
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const variantStyles = variants[variant];
  const sizeStyles = sizes[size];

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[
        styles.base,
        variantStyles.container,
        sizeStyles.container,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        { transform: [{ scale }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variantStyles.text.color as string}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              variantStyles.text,
              sizeStyles.text,
              icon ? { marginLeft: spacing.sm } : undefined,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </AnimatedTouchable>
  );
}

const variants = {
  primary: {
    container: {
      backgroundColor: colors.accent,
    } as ViewStyle,
    text: {
      color: '#060A0F',
      fontWeight: '700' as const,
    } as TextStyle,
  },
  secondary: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.accent,
    } as ViewStyle,
    text: {
      color: colors.accent,
      fontWeight: '600' as const,
    } as TextStyle,
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
    } as ViewStyle,
    text: {
      color: colors.accent,
      fontWeight: '600' as const,
    } as TextStyle,
  },
  danger: {
    container: {
      backgroundColor: colors.negative,
    } as ViewStyle,
    text: {
      color: '#FFFFFF',
      fontWeight: '700' as const,
    } as TextStyle,
  },
};

const sizes = {
  sm: {
    container: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.sm,
    } as ViewStyle,
    text: { fontSize: 13 } as TextStyle,
  },
  md: {
    container: {
      paddingVertical: spacing.md + 2,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.md,
    } as ViewStyle,
    text: { fontSize: 15 } as TextStyle,
  },
  lg: {
    container: {
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xxl,
      borderRadius: radius.lg,
    } as ViewStyle,
    text: { fontSize: 16 } as TextStyle,
  },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
