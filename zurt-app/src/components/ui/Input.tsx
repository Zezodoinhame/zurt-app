import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export function Input({
  label,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  style,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error
    ? colors.negative
    : isFocused
    ? colors.accent
    : colors.border;

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.container,
          { borderColor },
          error ? styles.errorBorder : undefined,
        ]}
      >
        {icon && <View style={styles.icon}>{icon}</View>}
        <TextInput
          style={[styles.input, icon ? styles.inputWithIcon : undefined, style]}
          placeholderTextColor={colors.text.muted}
          selectionColor={colors.accent}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            accessibilityLabel="Toggle"
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.input,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 52,
  },
  icon: {
    paddingLeft: spacing.lg,
  },
  input: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 15,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  inputWithIcon: {
    paddingLeft: spacing.md,
  },
  rightIcon: {
    paddingRight: spacing.lg,
    padding: spacing.sm,
  },
  error: {
    fontSize: 12,
    color: colors.negative,
    marginTop: spacing.xs,
  },
  errorBorder: {
    borderColor: colors.negative,
  },
});
