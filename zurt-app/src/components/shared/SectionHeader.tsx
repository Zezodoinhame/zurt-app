import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { type ThemeColors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useSettingsStore } from '../../stores/settingsStore';
import { AppIcon } from '../../hooks/useIcon';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {onAction && (
        <TouchableOpacity
          style={styles.action}
          onPress={onAction}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.actionText}>
            {actionLabel ?? t('common.seeAll')}
          </Text>
          <AppIcon name="chevron" size={14} color={colors.accent} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text.primary,
    },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    actionText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
  });
