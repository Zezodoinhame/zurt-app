import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { type ThemeColors } from '../../theme/colors';
import { useSettingsStore } from '../../stores/settingsStore';
import { spacing, radius } from '../../theme/spacing';
import { formatCurrency } from '../../utils/formatters';
import type { CreditCard } from '../../types';

const CARD_WIDTH = Dimensions.get('window').width - 64;
const CARD_HEIGHT = CARD_WIDTH * 0.6;

interface CreditCardVisualProps {
  card: CreditCard;
}

function MastercardLogo() {
  return (
    <Svg width={40} height={26}>
      <Circle cx={14} cy={13} r={10} fill="#EB001B" opacity={0.9} />
      <Circle cx={26} cy={13} r={10} fill="#F79E1B" opacity={0.9} />
      <Circle cx={20} cy={13} r={6} fill="#FF5F00" opacity={0.7} />
    </Svg>
  );
}

function VisaLogo() {
  return (
    <View>
      <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', fontStyle: 'italic', letterSpacing: -1 }}>
        VISA
      </Text>
    </View>
  );
}

export function CreditCardVisual({ card }: CreditCardVisualProps) {
  const colors = useSettingsStore((s) => s.colors);
  const { currency } = useSettingsStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const hasLimit = card.limit > 0;
  const utilization = hasLimit ? (card.used / card.limit) * 100 : 0;
  const utilizationColor =
    utilization > 80 ? colors.negative :
    utilization > 60 ? colors.warning : colors.accent;

  const formatDueDate = (dueDate: string | undefined | null): string => {
    if (!dueDate || dueDate === '') return '-';
    const d = new Date(dueDate);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <View
      style={[styles.card, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
    >
      {/* Background gradient */}
      <Svg
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id="cardBg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={card.color} />
            <Stop offset="0.5" stopColor={card.secondaryColor} stopOpacity="0.3" />
            <Stop offset="1" stopColor={card.color} />
          </LinearGradient>
        </Defs>
        <Rect
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
          rx={16}
          ry={16}
          fill="url(#cardBg)"
        />
        {/* Decorative circles */}
        <Circle cx={CARD_WIDTH * 0.8} cy={-20} r={100} fill={card.secondaryColor} opacity={0.05} />
        <Circle cx={CARD_WIDTH * 0.2} cy={CARD_HEIGHT + 30} r={80} fill={card.secondaryColor} opacity={0.05} />
      </Svg>

      <View style={styles.content}>
        {/* Header: Name + Brand */}
        <View style={styles.header}>
          <Text style={styles.cardName}>{card.name}</Text>
          {card.brand === 'mastercard' ? <MastercardLogo /> : <VisaLogo />}
        </View>

        {/* Card number */}
        <View style={styles.numberRow}>
          <Text style={styles.dots}>••••</Text>
          <Text style={styles.dots}>••••</Text>
          <Text style={styles.dots}>••••</Text>
          <Text style={styles.lastFour}>{card.lastFour}</Text>
        </View>

        {/* Invoice + Due date */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerLabel}>Fatura atual</Text>
            <Text style={styles.footerValue}>{formatCurrency(card.currentInvoice, currency)}</Text>
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.footerLabel}>Vencimento</Text>
            <Text style={styles.footerValue}>{formatDueDate(card.dueDate)}</Text>
          </View>
        </View>

        {/* Utilization bar */}
        <View style={styles.utilizationContainer}>
          <View style={styles.utilizationTrack}>
            <View
              style={[
                styles.utilizationFill,
                {
                  width: `${Math.min(utilization, 100)}%`,
                  backgroundColor: utilizationColor,
                },
              ]}
            />
          </View>
          <Text style={styles.utilizationText}>
            {formatCurrency(card.used, currency)}{hasLimit ? ` / ${formatCurrency(card.limit, currency)}` : ''}
          </Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    opacity: 0.9,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dots: {
    color: '#FFFFFF',
    fontSize: 18,
    opacity: 0.4,
    letterSpacing: 2,
  },
  lastFour: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerRight: {
    alignItems: 'flex-end',
  },
  footerLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  footerValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  utilizationContainer: {
    marginTop: 4,
  },
  utilizationTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  utilizationFill: {
    height: '100%',
    borderRadius: 2,
  },
  utilizationText: {
    color: '#FFFFFF',
    fontSize: 10,
    opacity: 0.5,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
});
