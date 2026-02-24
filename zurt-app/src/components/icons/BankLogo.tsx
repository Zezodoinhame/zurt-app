import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const BRAND_COLORS: Record<string, string> = {
  'itau': '#FF6200',
  'itaú': '#FF6200',
  'btg': '#001E3D',
  'nubank': '#820AD1',
  'nu pagamentos': '#820AD1',
  'santander': '#EC0000',
  'bradesco': '#CC092F',
  'banco do brasil': '#003882',
  'inter': '#FF7A00',
  'caixa': '#0070AF',
  'c6': '#242424',
  'xp': '#000000',
  'safra': '#003C71',
  'original': '#00A650',
  'rico': '#FF5900',
  'clear': '#00C2FF',
  'modal': '#1A1A1A',
  'genial': '#F26522',
  'toro': '#00D1A7',
  'binance': '#F0B90B',
  'mercado bitcoin': '#1C1C1C',
  'guide': '#1B3A5C',
  'agora': '#00205B',
  'mercado pago': '#009EE3',
  'picpay': '#21C25E',
  'stone': '#00A868',
  'pagbank': '#FFC300',
  'neon': '#0098DA',
  'next': '#00E676',
};

interface BankLogoProps {
  institutionName: string;
  imageUrl?: string | null;
  size?: number;
}

export function BankLogo({ institutionName, imageUrl, size = 36 }: BankLogoProps) {
  const [imgError, setImgError] = useState(false);

  // Try image URL first (from Pluggy connector data)
  if (imageUrl && !imgError) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.22,
        }}
        resizeMode="contain"
        onError={() => setImgError(true)}
      />
    );
  }

  // Fallback: branded colored rounded square with abbreviation
  const name = institutionName.toLowerCase().trim();
  let bgColor = '#4A5568';

  for (const [key, color] of Object.entries(BRAND_COLORS)) {
    if (name.includes(key)) {
      bgColor = color;
      break;
    }
  }

  // Special abbreviations for known banks
  let displayText = institutionName.charAt(0).toUpperCase();
  if (name.includes('itau') || name.includes('itaú')) displayText = 'Itaú';
  else if (name.includes('btg')) displayText = 'BTG';
  else if (name.includes('nubank') || name.includes('nu ')) displayText = 'Nu';
  else if (name.includes('xp')) displayText = 'XP';
  else if (name.includes('c6')) displayText = 'C6';
  else if (name.includes('bb') || name.includes('banco do brasil')) displayText = 'BB';
  else if (name.includes('inter')) displayText = 'Inter';
  else if (name.includes('santander')) displayText = 'San';
  else if (name.includes('bradesco')) displayText = 'Brad';
  else if (name.includes('caixa') || name.includes('cef')) displayText = 'CEF';
  else if (name.includes('safra')) displayText = 'Safra';
  else if (name.includes('original')) displayText = 'Orig';
  else if (name.includes('binance')) displayText = 'BN';
  else if (name.includes('mercado bitcoin')) displayText = 'MB';
  else if (name.includes('rico')) displayText = 'Rico';
  else if (name.includes('clear')) displayText = 'Clear';
  else if (name.includes('genial')) displayText = 'Gen';
  else if (name.includes('toro')) displayText = 'Toro';
  else if (name.includes('modal')) displayText = 'Mod';
  else if (name.includes('guide')) displayText = 'Gui';
  else if (name.includes('agora') || name.includes('ágora')) displayText = 'Ág';

  const fontSize = displayText.length > 3 ? size * 0.2 : displayText.length > 2 ? size * 0.26 : size * 0.38;

  return (
    <View style={[styles.container, {
      width: size,
      height: size,
      borderRadius: size * 0.22,
      backgroundColor: bgColor,
    }]}>
      <Text style={[styles.text, { fontSize }]} numberOfLines={1}>
        {displayText}
      </Text>
    </View>
  );
}

// Helper to get brand color from institution name
export function getBrandColor(institutionName: string): string | undefined {
  const name = institutionName.toLowerCase().trim();
  for (const [key, color] of Object.entries(BRAND_COLORS)) {
    if (name.includes(key)) return color;
  }
  return undefined;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
  },
});
