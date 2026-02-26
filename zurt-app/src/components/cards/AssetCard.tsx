import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { type ThemeColors } from '../../theme/colors';
import { useSettingsStore } from '../../stores/settingsStore';
import { spacing } from '../../theme/spacing';
import { formatBRL, formatPct } from '../../utils/formatters';
import { MiniLineChart } from '../charts/MiniLineChart';
import type { Asset, InstitutionId } from '../../types';

const institutionLabels: Record<InstitutionId, string> = {
  xp: 'XP',
  btg: 'BTG',
  nubank: 'Nubank',
  inter: 'Inter',
  binance: 'Binance',
};

interface AssetCardProps {
  asset: Asset;
  index: number;
  onPress?: (asset: Asset) => void;
  showInstitution?: boolean;
  dailyChange?: number;
}

export function AssetCard({
  asset,
  index,
  onPress,
  showInstitution = true,
  dailyChange,
}: AssetCardProps) {
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isPositive = asset.variation >= 0;

  return (
    <View>
      <TouchableOpacity
        style={styles.container}
        onPress={() => onPress?.(asset)}
        activeOpacity={0.7}
        accessibilityLabel={`${asset.name}, ${formatBRL(asset.currentValue)}, variação ${formatPct(asset.variation)}`}
      >
        <View style={styles.left}>
          <View style={styles.nameRow}>
            <Text style={styles.ticker}>{asset.ticker}</Text>
            {showInstitution && (
              <Text style={styles.institution}>
                {institutionLabels[asset.institution]}
              </Text>
            )}
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {asset.name}
          </Text>
          <Text style={styles.qty}>
            {asset.quantity < 1
              ? asset.quantity.toFixed(4)
              : asset.quantity.toLocaleString('pt-BR')}{' '}
            un
          </Text>
        </View>

        <View style={styles.chartArea}>
          <MiniLineChart data={asset.priceHistory} width={60} height={24} />
        </View>

        <View style={styles.right}>
          <Text style={styles.value}>{formatBRL(asset.currentValue)}</Text>
          <Text
            style={[
              styles.variation,
              { color: isPositive ? colors.positive : colors.negative },
            ]}
          >
            {formatPct(asset.variation)}
          </Text>
          {dailyChange !== undefined && (
            <Text
              style={[
                styles.dailyChange,
                { color: dailyChange >= 0 ? colors.positive : colors.negative },
              ]}
            >
              Hoje {formatPct(dailyChange)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border + '50',
  },
  left: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ticker: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  institution: {
    fontSize: 10,
    color: colors.text.muted,
    backgroundColor: colors.elevated,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  name: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  qty: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  chartArea: {
    marginHorizontal: spacing.md,
  },
  right: {
    alignItems: 'flex-end',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  variation: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  dailyChange: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
    fontVariant: ['tabular-nums'] as any,
  },
});
