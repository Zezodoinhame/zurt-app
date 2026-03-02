import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { type ThemeColors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { useSettingsStore } from '../../stores/settingsStore';
import { AppIcon, type AppIconName } from '../../hooks/useIcon';

type InsightType = 'positive' | 'negative' | 'warning' | 'info';

interface InsightCardProps {
  icon: AppIconName;
  text: string;
  type?: InsightType;
  onPress?: () => void;
}

function getTypeColor(colors: ThemeColors, type: InsightType): string {
  switch (type) {
    case 'positive': return colors.positive;
    case 'negative': return colors.negative;
    case 'warning': return colors.warning;
    case 'info': return colors.info;
  }
}

export function InsightCard({ icon, text, type = 'info', onPress }: InsightCardProps) {
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const typeColor = getTypeColor(colors, type);

  const content = (
    <View style={[styles.container, { borderLeftColor: typeColor }]}>
      <View style={[styles.iconWrap, { backgroundColor: typeColor + '18' }]}>
        <AppIcon name={icon} size={18} color={typeColor} />
      </View>
      <Text style={styles.text} numberOfLines={2}>
        {text}
      </Text>
      {onPress && (
        <AppIcon name="chevron" size={16} color={colors.text.muted} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 3,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginBottom: spacing.sm,
      gap: spacing.md,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: colors.text.primary,
    },
  });
