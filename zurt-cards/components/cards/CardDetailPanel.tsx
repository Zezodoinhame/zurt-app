// components/cards/CardDetailPanel.tsx
// Painel de detalhes que aparece abaixo do cartão expandido

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CreditCard } from '../../data/cardsData';
import { formatBRL, getUsageColor } from '../../utils/formatters';

interface Props {
  card: CreditCard;
  hideValues: boolean;
}

export default function CardDetailPanel({ card, hideValues }: Props) {
  const disponivel = card.limiteTotal - card.limiteUsado;
  const pctUsado = card.limiteUsado / card.limiteTotal;
  const barColor = getUsageColor(pctUsado);

  const mask = (val: string) => hideValues ? 'R$ ••••••' : val;

  return (
    <View style={styles.container}>
      {/* ── Fatura + Disponível ── */}
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>Fatura atual</Text>
          <Text style={styles.valueDark}>{mask(formatBRL(card.faturaAtual))}</Text>
        </View>
        <View style={[styles.col, { alignItems: 'flex-end' }]}>
          <Text style={styles.label}>Disponível</Text>
          <Text style={[styles.valueDark, { color: '#2ED573' }]}>
            {mask(formatBRL(disponivel))}
          </Text>
        </View>
      </View>

      {/* ── Barra de utilização ── */}
      <View style={styles.usageSection}>
        <View style={styles.usageLabels}>
          <Text style={styles.usageText}>{(pctUsado * 100).toFixed(0)}% utilizado</Text>
          <Text style={styles.usageText}>Limite {hideValues ? '•••' : formatBRL(card.limiteTotal)}</Text>
        </View>
        <View style={styles.usageBarBg}>
          <View style={[styles.usageBarFill, { width: `${pctUsado * 100}%`, backgroundColor: barColor }]} />
        </View>
      </View>

      {/* ── Datas ── */}
      <View style={styles.datesRow}>
        <View style={styles.dateItem}>
          <Ionicons name="calendar-outline" size={14} color="#8e8ea0" />
          <Text style={styles.dateLabel}>Fecha </Text>
          <Text style={styles.dateValue}>{card.fechamento}</Text>
        </View>
        <View style={styles.dateItem}>
          <Ionicons name="alert-circle-outline" size={14} color="#8e8ea0" />
          <Text style={styles.dateLabel}>Vence </Text>
          <Text style={styles.dateValue}>{card.vencimento}</Text>
        </View>
      </View>

      {/* ── Status da fatura ── */}
      <View style={[styles.statusBadge, {
        backgroundColor: card.faturaStatus === 'fechada' ? '#FF475715' :
          card.faturaStatus === 'paga' ? '#2ED57315' : '#0066FF10',
      }]}>
        <View style={[styles.statusDot, {
          backgroundColor: card.faturaStatus === 'fechada' ? '#FF4757' :
            card.faturaStatus === 'paga' ? '#2ED573' : '#0066FF',
        }]} />
        <Text style={[styles.statusText, {
          color: card.faturaStatus === 'fechada' ? '#FF4757' :
            card.faturaStatus === 'paga' ? '#2ED573' : '#0066FF',
        }]}>
          {card.faturaStatus === 'fechada'
            ? `Fatura fechada — pagar até ${card.vencimento}`
            : card.faturaStatus === 'paga'
              ? 'Fatura paga'
              : `Fatura aberta — fecha em ${card.fechamento}`}
        </Text>
      </View>

      {/* ── Botões de ação ── */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnSecondary} activeOpacity={0.7}>
          <Ionicons name="receipt-outline" size={16} color="#1a1a2e" />
          <Text style={styles.btnSecondaryText}>Ver fatura</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.7}>
          <Ionicons name="card-outline" size={16} color="#fff" />
          <Text style={styles.btnPrimaryText}>Pagar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: -8,
    padding: 20,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  col: {},
  label: {
    fontSize: 11,
    color: '#8e8ea0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
    fontWeight: '500',
  },
  valueDark: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
    fontVariant: ['tabular-nums'],
  },
  usageSection: {
    marginBottom: 16,
  },
  usageLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  usageText: {
    fontSize: 11,
    color: '#8e8ea0',
    fontWeight: '400',
  },
  usageBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f0f0f5',
    overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateLabel: {
    fontSize: 12,
    color: '#8e8ea0',
  },
  dateValue: {
    fontSize: 12,
    color: '#1a1a2e',
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  btnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8f0',
    backgroundColor: '#fff',
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#0066FF',
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
