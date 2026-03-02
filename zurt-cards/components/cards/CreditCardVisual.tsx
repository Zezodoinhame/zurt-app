// components/cards/CreditCardVisual.tsx
// Componente visual do cartão de crédito — estilo Apple Wallet
// Usa react-native-svg para chip, bandeira e ícones

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Circle, Line, Text as SvgText, G, Path } from 'react-native-svg';
import { CreditCard } from '../../data/cardsData';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 40;
const CARD_H = 210;

// ─── SVG Icons ──────────────────────────────────────────────

const ChipSVG = ({ color = 'rgba(255,215,0,0.4)' }: { color?: string }) => (
  <Svg width={36} height={28} viewBox="0 0 36 28">
    <Rect x={2} y={2} width={32} height={24} rx={4} fill={color} />
    <Line x1={2} y1={10} x2={34} y2={10} stroke="rgba(0,0,0,0.15)" strokeWidth={0.8} />
    <Line x1={2} y1={18} x2={34} y2={18} stroke="rgba(0,0,0,0.15)" strokeWidth={0.8} />
    <Line x1={14} y1={2} x2={14} y2={26} stroke="rgba(0,0,0,0.15)" strokeWidth={0.8} />
    <Line x1={22} y1={2} x2={22} y2={26} stroke="rgba(0,0,0,0.15)" strokeWidth={0.8} />
  </Svg>
);

const VisaLogo = () => (
  <View>
    <Svg width={56} height={28} viewBox="0 0 56 28">
      <SvgText x={0} y={18} fill="#fff" fontSize={22} fontWeight="bold" fontStyle="italic" fontFamily="sans-serif">
        VISA
      </SvgText>
      <SvgText x={24} y={27} fill="rgba(255,255,255,0.5)" fontSize={7} fontFamily="sans-serif">
        Infinite
      </SvgText>
    </Svg>
  </View>
);

const MastercardLogo = () => (
  <Svg width={44} height={28} viewBox="0 0 44 28">
    <Circle cx={16} cy={14} r={12} fill="#EB001B" opacity={0.9} />
    <Circle cx={28} cy={14} r={12} fill="#F79E1B" opacity={0.85} />
  </Svg>
);

const ContactlessIcon = ({ color = 'rgba(255,255,255,0.4)' }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2C10.4 4.2 9.5 6.9 9.5 9.8s.9 5.6 2.5 7.8" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M16 4c-1.2 1.7-1.8 3.7-1.8 5.8s.6 4.1 1.8 5.8" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M8 4c1.2 1.7 1.8 3.7 1.8 5.8S9.2 13.9 8 15.6" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// ─── Texturas ───────────────────────────────────────────────

const MetalTexture = () => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <View style={{
      ...StyleSheet.absoluteFillObject,
      opacity: 0.03,
      backgroundColor: 'transparent',
      // Simula textura metálica com bordas sutis
      borderTopWidth: 0.5,
      borderBottomWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.1)',
    }} />
  </View>
);

const CarbonTexture = () => (
  <View style={[StyleSheet.absoluteFill, { opacity: 0.04 }]} pointerEvents="none">
    <Svg width="100%" height="100%">
      <G>
        {Array.from({ length: 40 }, (_, i) => (
          <React.Fragment key={i}>
            <Circle cx={(i % 10) * 12 + 6} cy={Math.floor(i / 10) * 12 + 6} r={1} fill="#fff" />
          </React.Fragment>
        ))}
      </G>
    </Svg>
  </View>
);

// ─── Glow de fundo ──────────────────────────────────────────

const CardGlow = () => (
  <View style={{
    position: 'absolute',
    top: -20,
    right: -30,
    width: CARD_W * 0.5,
    height: CARD_H * 0.7,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.04)',
  }} pointerEvents="none" />
);

// ─── Logo do Banco ──────────────────────────────────────────

const BancoLogo = ({ card }: { card: CreditCard }) => {
  const fontSize = card.bancoAbrev.length <= 2 ? 26 : card.bancoAbrev.length <= 3 ? 18 : 14;
  const isXP = card.bancoAbrev === 'XP';

  return (
    <View>
      <Text style={{
        fontSize,
        fontWeight: '800',
        color: isXP ? '#FFD700' : card.textColor,
        letterSpacing: card.bancoAbrev.length > 3 ? 2 : -0.5,
      }}>
        {card.bancoAbrev}
      </Text>
      {card.parceiro && (
        <Text style={{
          fontSize: 9,
          color: 'rgba(255,255,255,0.45)',
          marginTop: 2,
          letterSpacing: 0.5,
        }}>
          {card.parceiro}
        </Text>
      )}
    </View>
  );
};

// ─── Componente Principal ───────────────────────────────────

interface Props {
  card: CreditCard;
  style?: any;
}

export default function CreditCardVisual({ card, style }: Props) {
  return (
    <LinearGradient
      colors={card.gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, style]}
    >
      {card.hasMetalTexture && <MetalTexture />}
      {card.hasCarbonTexture && <CarbonTexture />}
      <CardGlow />

      {/* ── Top: Logo + Bandeira ── */}
      <View style={styles.topRow}>
        <BancoLogo card={card} />
        <View style={styles.topRight}>
          {card.hasContactless && (
            <ContactlessIcon color={`${card.textColor}66`} />
          )}
          {card.bandeira === 'visa' ? <VisaLogo /> : <MastercardLogo />}
        </View>
      </View>

      {/* ── Middle: Chip ── */}
      <View style={styles.chipRow}>
        <ChipSVG color={card.chipColor} />
      </View>

      {/* ── Bottom: Número + Tipo ── */}
      <View style={styles.bottomRow}>
        <Text style={[styles.cardNumber, { color: card.textColor }]}>
          •••• •••• •••• {card.ultimos4}
        </Text>
        <View style={styles.bottomInfo}>
          <Text style={[styles.cardType, { color: `${card.textColor}80` }]}>
            {card.tipo}
          </Text>
          <Text style={[styles.cardBanco, { color: `${card.textColor}80` }]}>
            {card.banco}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 14,
    padding: 22,
    justifyContent: 'space-between',
    overflow: 'hidden',
    // Shadow para iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    // Shadow para Android
    elevation: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipRow: {
    marginTop: 4,
  },
  bottomRow: {},
  cardNumber: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Courier',
    letterSpacing: 2.5,
    marginBottom: 6,
    opacity: 0.85,
  },
  bottomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardType: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '500',
  },
  cardBanco: {
    fontSize: 11,
    fontWeight: '400',
  },
});
