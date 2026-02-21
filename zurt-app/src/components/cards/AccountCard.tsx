import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { type ThemeColors } from '../../theme/colors';
import { useSettingsStore } from '../../stores/settingsStore';
import { spacing, radius } from '../../theme/spacing';
import { formatBRL } from '../../utils/formatters';
import type { Institution } from '../../types';

interface AccountCardProps {
  institution: Institution;
  index: number;
  onPress?: (institution: Institution) => void;
}

export function AccountCard({ institution, index, onPress }: AccountCardProps) {
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const statusColor =
    institution.status === 'connected'
      ? colors.positive
      : institution.status === 'syncing'
        ? colors.warning
        : colors.negative;

  const statusLabel =
    institution.status === 'connected'
      ? 'Conectado'
      : institution.status === 'syncing'
        ? 'Sincronizando'
        : 'Erro';

  return (
    <View>
      <TouchableOpacity
        style={styles.container}
        onPress={() => onPress?.(institution)}
        activeOpacity={0.7}
        accessibilityLabel={`${institution.name}, ${formatBRL(institution.totalValue)}, ${statusLabel}`}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: institution.color },
          ]}
        >
          <Text style={[styles.iconText, { color: institution.secondaryColor ?? '#FFFFFF' }]}>
            {institution.name.charAt(0)}
          </Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.name}>{institution.name}</Text>
          <Text style={styles.assetCount}>
            {institution.assetCount} ativos
          </Text>
        </View>

        <View style={styles.right}>
          <Text style={styles.value}>{formatBRL(institution.totalValue)}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
    fontWeight: '800',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  assetCount: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
