import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { type ThemeColors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { useSettingsStore } from '../../stores/settingsStore';
import { AppIcon, type AppIconName } from '../../hooks/useIcon';

interface QuickActionButtonProps {
  icon: AppIconName;
  label: string;
  onPress: () => void;
}

export function QuickActionButton({ icon, label, onPress }: QuickActionButtonProps) {
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrap}>
        <AppIcon name={icon} size={22} color={colors.accent} />
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.xs,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 14,
    },
  });
