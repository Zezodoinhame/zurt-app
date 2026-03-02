import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

// ---------------------------------------------------------------------------
// Local SVG logos (loaded via react-native-svg-transformer)
// ---------------------------------------------------------------------------
import ItauLogo from '../../assets/bank-logos/itau.svg';
import BtgLogo from '../../assets/bank-logos/btg.svg';
import NubankLogo from '../../assets/bank-logos/nubank.svg';
import SantanderLogo from '../../assets/bank-logos/santander.svg';
import BradescoLogo from '../../assets/bank-logos/bradesco.svg';
import BbLogo from '../../assets/bank-logos/bb.svg';
import InterLogo from '../../assets/bank-logos/inter.svg';
import CaixaLogo from '../../assets/bank-logos/caixa.svg';
import C6Logo from '../../assets/bank-logos/c6.svg';
import XpLogo from '../../assets/bank-logos/xp.svg';
import SafraLogo from '../../assets/bank-logos/safra.svg';
import OriginalLogo from '../../assets/bank-logos/original.svg';
import BmgLogo from '../../assets/bank-logos/bmg.svg';
import NeonLogo from '../../assets/bank-logos/neon.svg';
import PicpayLogo from '../../assets/bank-logos/picpay.svg';
import MercadoPagoLogo from '../../assets/bank-logos/mercadopago.svg';
import StoneLogo from '../../assets/bank-logos/stone.svg';
import SicoobLogo from '../../assets/bank-logos/sicoob.svg';
import SicrediLogo from '../../assets/bank-logos/sicredi.svg';
import BanrisulLogo from '../../assets/bank-logos/banrisul.svg';
import PagbankLogo from '../../assets/bank-logos/pagbank.svg';
import BrbLogo from '../../assets/bank-logos/brb.svg';
import BvLogo from '../../assets/bank-logos/bv.svg';
import DaycovalLogo from '../../assets/bank-logos/daycoval.svg';
import SofisaLogo from '../../assets/bank-logos/sofisa.svg';

// ---------------------------------------------------------------------------
// Map institution name patterns → SVG component
// ---------------------------------------------------------------------------
const SVG_MAP: Array<[string[], React.FC<any>]> = [
  [['itau', 'itaú'], ItauLogo],
  [['btg'], BtgLogo],
  [['nubank', 'nu pagamentos', 'nu '], NubankLogo],
  [['santander'], SantanderLogo],
  [['bradesco'], BradescoLogo],
  [['banco do brasil', 'bb '], BbLogo],
  [['inter'], InterLogo],
  [['caixa', 'cef'], CaixaLogo],
  [['c6'], C6Logo],
  [['xp inv', 'xp '], XpLogo],
  [['safra'], SafraLogo],
  [['original'], OriginalLogo],
  [['bmg'], BmgLogo],
  [['neon'], NeonLogo],
  [['picpay'], PicpayLogo],
  [['mercado pago'], MercadoPagoLogo],
  [['stone'], StoneLogo],
  [['sicoob'], SicoobLogo],
  [['sicredi'], SicrediLogo],
  [['banrisul'], BanrisulLogo],
  [['pagbank', 'pagseguro'], PagbankLogo],
  [['brb', 'banco de brasilia'], BrbLogo],
  [['votorantim', ' bv'], BvLogo],
  [['daycoval'], DaycovalLogo],
  [['sofisa'], SofisaLogo],
];

// ---------------------------------------------------------------------------
// Brand colors (fallback)
// ---------------------------------------------------------------------------
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
  'bmg': '#FF6600',
  'sicoob': '#003641',
  'sicredi': '#33A02C',
  'banrisul': '#004B87',
  'brb': '#003399',
  'bv': '#0066CC',
  'daycoval': '#1B3667',
  'sofisa': '#00A551',
};

// Display abbreviations for fallback text
const DISPLAY_ABBREVS: Array<[string[], string]> = [
  [['itau', 'itaú'], 'Itaú'],
  [['btg'], 'BTG'],
  [['nubank', 'nu '], 'Nu'],
  [['xp'], 'XP'],
  [['c6'], 'C6'],
  [['bb', 'banco do brasil'], 'BB'],
  [['inter'], 'Inter'],
  [['santander'], 'San'],
  [['bradesco'], 'Brad'],
  [['caixa', 'cef'], 'CEF'],
  [['safra'], 'Safra'],
  [['original'], 'Orig'],
  [['binance'], 'BN'],
  [['mercado bitcoin'], 'MB'],
  [['rico'], 'Rico'],
  [['clear'], 'Clear'],
  [['genial'], 'Gen'],
  [['toro'], 'Toro'],
  [['modal'], 'Mod'],
  [['guide'], 'Gui'],
  [['agora', 'ágora'], 'Ág'],
  [['bmg'], 'BMG'],
  [['sicoob'], 'Sicoob'],
  [['sicredi'], 'Sicredi'],
  [['banrisul'], 'Banri'],
  [['brb'], 'BRB'],
  [['bv', 'votorantim'], 'BV'],
  [['stone'], 'Stone'],
  [['picpay'], 'PicPay'],
  [['neon'], 'Neon'],
  [['pagbank', 'pagseguro'], 'PagBank'],
  [['mercado pago'], 'MP'],
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface BankLogoProps {
  institutionName: string;
  imageUrl?: string | null;
  size?: number;
}

export function BankLogo({ institutionName, imageUrl, size = 36 }: BankLogoProps) {
  const [imgError, setImgError] = useState(false);
  const nameLower = institutionName.toLowerCase().trim();

  // 1. Try local SVG logo
  for (const [patterns, SvgComponent] of SVG_MAP) {
    if (patterns.some((p) => nameLower.includes(p))) {
      return (
        <View style={{ width: size, height: size, borderRadius: size * 0.22, overflow: 'hidden' }}>
          <SvgComponent width={size} height={size} />
        </View>
      );
    }
  }

  // 2. Try Pluggy imageUrl (PNG/JPG)
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

  // 3. Branded fallback with abbreviation
  let bgColor = '#4A5568';
  for (const [key, color] of Object.entries(BRAND_COLORS)) {
    if (nameLower.includes(key)) {
      bgColor = color;
      break;
    }
  }

  let displayText = institutionName.charAt(0).toUpperCase();
  for (const [patterns, abbrev] of DISPLAY_ABBREVS) {
    if (patterns.some((p) => nameLower.includes(p))) {
      displayText = abbrev;
      break;
    }
  }

  const fontSize =
    displayText.length > 3
      ? size * 0.2
      : displayText.length > 2
        ? size * 0.26
        : displayText.length > 1
          ? size * 0.32
          : size * 0.42;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size * 0.22,
          backgroundColor: bgColor,
        },
      ]}
    >
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
