// components/cards/MiniCardRow.tsx
// Linha compacta de cartão — usada na lista "Outros cartões"

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CreditCard } from '../../data/cardsData';
import { formatBRL } from '../../utils/formatters';

interface Props {
  card: CreditCard;
  onPress: () => void;
  hideValues: boolean;
}

export default function MiniCardRow({ card, onPress, hideValues }: Props) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        {/* Mini card visual */}
        <LinearGradient
          colors={card.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.miniCard}
        >
          <Text style={[styles.miniCardText, { color: card.textColor }]}>
            {card.bancoAbrev.slice(0, 2)}
          </Text>
        </LinearGradient>
        <View>
          <Text style={styles.banco}>{card.banco}</Text>
          <Text style={styles.detail}>
            {card.tipo} •••• {card.ultimos4}
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.valor}>
          {hideValues ? '•••' : formatBRL(card.faturaAtual)}
        </Text>
        <Text style={styles.faturaLabel}>fatura</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    marginBottom: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  miniCard: {
    width: 42,
    height: 28,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  miniCardText: {
    fontSize: 9,
    fontWeight: '800',
  },
  banco: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  detail: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  valor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  faturaLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 2,
  },
});
