import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type ThemeColors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatCurrency, maskValue } from '../../utils/formatters';

const CATEGORY_ICONS: Record<string, string> = {
  food: 'restaurant-outline',
  transport: 'car-outline',
  subscriptions: 'card-outline',
  shopping: 'bag-outline',
  fuel: 'speedometer-outline',
  health: 'medkit-outline',
  travel: 'airplane-outline',
  tech: 'laptop-outline',
};

const CATEGORY_COLORS: Record<string, string> = {
  food: '#FF6B6B',
  transport: '#4ECDC4',
  subscriptions: '#A855F7',
  shopping: '#F472B6',
  fuel: '#FB923C',
  health: '#34D399',
  travel: '#60A5FA',
  tech: '#818CF8',
};

interface TransactionRowProps {
  description: string;
  category: string;
  categoryLabel: string;
  amount: number;
  date: string;
  valuesHidden: boolean;
  installment?: string;
}

export function TransactionRow({
  description,
  category,
  categoryLabel,
  amount,
  date,
  valuesHidden,
  installment,
}: TransactionRowProps) {
  const { currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const iconName = CATEGORY_ICONS[category] || 'ellipsis-horizontal-outline';
  const iconColor = CATEGORY_COLORS[category] || colors.text.muted;

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={iconName as any} size={18} color={iconColor} />
      </View>

      <View style={styles.middle}>
        <Text style={styles.description} numberOfLines={1}>
          {description}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {categoryLabel}
          {installment ? ` · ${installment}` : ''}
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.amount}>
          {valuesHidden ? maskValue('', currency) : formatCurrency(amount, currency)}
        </Text>
        <Text style={styles.date}>{date}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    middle: {
      flex: 1,
    },
    description: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.primary,
    },
    meta: {
      fontSize: 12,
      color: colors.text.muted,
      marginTop: 2,
    },
    right: {
      alignItems: 'flex-end',
    },
    amount: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    date: {
      fontSize: 11,
      color: colors.text.muted,
      marginTop: 2,
    },
  });
