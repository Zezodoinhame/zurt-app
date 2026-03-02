// components/cards/SpendingCategories.tsx
// Gastos por categoria com barra empilhada e lista

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpendingCategory } from '../../data/cardsData';
import { formatBRL } from '../../utils/formatters';

interface Props {
  categories: SpendingCategory[];
  hideValues: boolean;
}

export default function SpendingCategories({ categories, hideValues }: Props) {
  const total = categories.reduce((s, c) => s + c.valor, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gastos por categoria</Text>
      <Text style={styles.subtitle}>
        Total: {hideValues ? 'R$ ••••••' : formatBRL(total)}
      </Text>

      {/* Barra empilhada */}
      <View style={styles.stackedBar}>
        {categories.map((cat) => (
          <View
            key={cat.nome}
            style={[styles.barSegment, {
              width: `${cat.pct * 100}%`,
              backgroundColor: cat.cor,
            }]}
          />
        ))}
      </View>

      {/* Lista de categorias */}
      {categories.map((cat, i) => (
        <View
          key={cat.nome}
          style={[styles.catRow, i < categories.length - 1 && styles.catRowBorder]}
        >
          <View style={styles.catLeft}>
            <View style={[styles.catIcon, { backgroundColor: `${cat.cor}20` }]}>
              <Ionicons name={cat.icone as any} size={16} color={cat.cor} />
            </View>
            <View>
              <Text style={styles.catNome}>{cat.nome}</Text>
              <Text style={styles.catPct}>{(cat.pct * 100).toFixed(1)}% do total</Text>
            </View>
          </View>
          <Text style={styles.catValor}>
            {hideValues ? 'R$ •••' : formatBRL(cat.valor)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#8e8ea0',
    marginBottom: 16,
  },
  stackedBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 20,
  },
  barSegment: {
    height: '100%',
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  catRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5fa',
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catNome: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a2e',
  },
  catPct: {
    fontSize: 11,
    color: '#8e8ea0',
    marginTop: 2,
  },
  catValor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    fontVariant: ['tabular-nums'],
  },
});
