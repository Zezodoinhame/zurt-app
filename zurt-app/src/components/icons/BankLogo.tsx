import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  ItauLogo, BTGLogo, NubankLogo, XPLogo, InterLogo,
  SantanderLogo, BradescoLogo, BBLogo, CaixaLogo, C6Logo,
  RicoLogo, ClearLogo, ModalLogo, AgoraLogo, BinanceLogo,
  MercadoBitcoinLogo, GenialLogo, SafraLogo, ToroLogo, GuideLogo,
} from './BankLogos';

interface BankLogoProps {
  institutionName: string;
  size?: number;
}

// Pattern → Component mapping (order matters: first match wins)
const LOGO_MAP: Array<{ pattern: RegExp; Component: React.FC<{ size?: number }> }> = [
  { pattern: /ita[uú]/i, Component: ItauLogo },
  { pattern: /btg/i, Component: BTGLogo },
  { pattern: /nubank|nu\b/i, Component: NubankLogo },
  { pattern: /\bxp\b/i, Component: XPLogo },
  { pattern: /\binter\b/i, Component: InterLogo },
  { pattern: /santander/i, Component: SantanderLogo },
  { pattern: /bradesco/i, Component: BradescoLogo },
  { pattern: /banco do brasil|\bbb\b/i, Component: BBLogo },
  { pattern: /caixa|cef\b/i, Component: CaixaLogo },
  { pattern: /\bc6\b/i, Component: C6Logo },
  { pattern: /\brico\b/i, Component: RicoLogo },
  { pattern: /\bclear\b/i, Component: ClearLogo },
  { pattern: /\bmodal\b/i, Component: ModalLogo },
  { pattern: /[aá]gora/i, Component: AgoraLogo },
  { pattern: /binance/i, Component: BinanceLogo },
  { pattern: /mercado\s*bitcoin|mb\b/i, Component: MercadoBitcoinLogo },
  { pattern: /genial/i, Component: GenialLogo },
  { pattern: /safra/i, Component: SafraLogo },
  { pattern: /\btoro\b/i, Component: ToroLogo },
  { pattern: /guide/i, Component: GuideLogo },
];

// Brand colors for fallback styling
const BRAND_COLORS: Record<string, string> = {
  itau: '#FF6200', btg: '#001E3D', nubank: '#820AD1', xp: '#000000',
  inter: '#FF7A00', santander: '#EC0000', bradesco: '#CC092F',
  bb: '#003882', caixa: '#0070AF', c6: '#242424', rico: '#FF5900',
  clear: '#00C2FF', modal: '#1A1A1A', agora: '#00205B', binance: '#1E2026',
  mercadobitcoin: '#1C1C1C', genial: '#F26522', safra: '#003C71',
  toro: '#00D1A7', guide: '#1B3A5C',
};

export function BankLogo({ institutionName, size = 32 }: BankLogoProps) {
  const match = LOGO_MAP.find((entry) => entry.pattern.test(institutionName));

  if (match) {
    const { Component } = match;
    return <Component size={size} />;
  }

  // Fallback: colored rounded rect with first letter
  const initial = institutionName.charAt(0).toUpperCase();
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size * 0.25, backgroundColor: '#4A5568' }]}>
      <Text style={[styles.fallbackText, { fontSize: size * 0.45 }]}>{initial}</Text>
    </View>
  );
}

// Helper to get brand color from institution name (useful for accent styling)
export function getBrandColor(institutionName: string): string | undefined {
  for (const [key, color] of Object.entries(BRAND_COLORS)) {
    if (institutionName.toLowerCase().includes(key)) return color;
  }
  return undefined;
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
