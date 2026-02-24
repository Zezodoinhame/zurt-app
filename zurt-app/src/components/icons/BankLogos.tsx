import React from 'react';
import Svg, { Path, Rect, Circle, G, Text as SvgText } from 'react-native-svg';

interface BankLogoProps {
  size?: number;
}

// Itaú - Orange rounded rect with "Itaú" text
export function ItauLogo({ size = 32 }: BankLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width="48" height="48" rx="12" fill="#FF6200" />
      <SvgText x="24" y="30" fontSize="16" fontWeight="800" fill="#FFF" textAnchor="middle">Itaú</SvgText>
    </Svg>
  );
}

// BTG Pactual - Dark navy with "BTG" bold
export function BTGLogo({ size = 32 }: BankLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width="48" height="48" rx="12" fill="#001E3D" />
      <SvgText x="24" y="30" fontSize="16" fontWeight="800" fill="#FFF" textAnchor="middle">BTG</SvgText>
    </Svg>
  );
}

// Nubank - Purple with stylized N
export function NubankLogo({ size = 32 }: BankLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width="48" height="48" rx="12" fill="#820AD1" />
      <Path d="M14 33V21l8 12h4V15h-4v12l-8-12h-4v18z" fill="#FFF" />
    </Svg>
  );
}

// XP Investimentos - Black with yellow "XP"
export function XPLogo({ size = 32 }: BankLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width="48" height="48" rx="12" fill="#000000" />
      <SvgText x="24" y="31" fontSize="20" fontWeight="800" fill="#FFD100" textAnchor="middle">XP</SvgText>
    </Svg>
  );
}

// Inter - Orange with diamond shape
export function InterLogo({ size = 32 }: BankLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width="48" height="48" rx="12" fill="#FF7A00" />
      <Path d="M24 12l10 12-10 12-10-12z" fill="#FFF" />
      <Path d="M24 18l5 6-5 6-5-6z" fill="#FF7A00" />
    </Svg>
  );
}

// Santander - Red with flame
export function SantanderLogo({ size = 32 }: BankLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width="48" height="48" rx="12" fill="#EC0000" />
      <Path d="M24 10c-3 5-8 9-8 16a8 8 0 0016 0c0-7-5-11-8-16z" fill="#FFF" />
      <Path d="M24 16c-1.5 3-4 5-4 9a4 4 0 008 0c0-4-2.5-6-4-9z" fill="#EC0000" />
    </Svg>
  );
}

// Bradesco - Red with tree of life
export function BradescoLogo({ size = 32 }: BankLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width="48" height="48" rx="12" fill="#CC092F" />
      <Path d="M24 36V18" stroke="#FFF" strokeWidth="3" strokeLinecap="round" />
      <Circle cx="24" cy="14" r="4" fill="#FFF" />
      <Path d="M17 22c3-1 5 1 7 1s4-2 7-1c-2 2-5 2-7 4-2-2-5-2-7-4z" fill="#FFF" />
      <Path d="M15 28c4-1 6 1 9 1s5-2 9-1c-3 2-6 2-9 4-3-2-6-2-9-4z" fill="#FFF" />
    </Svg>
  );
}

// Banco do Brasil - Blue with yellow BB
export function BBLogo({ size = 32 }: BankLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width="48" height="48" rx="12" fill="#003882" />
      <SvgText x="24" y="31" fontSize="22" fontWeight="800" fill="#FFEF00" textAnchor="middle">BB</SvgText>
    </Svg>
  );
}

// Caixa Econômica - Blue with CEF cross
export function CaixaLogo({ size = 32 }: BankLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width="48" height="48" rx="12" fill="#0070AF" />
      <Path d="M14 14h20v20H14z" fill="none" stroke="#FFF" strokeWidth="3" />
      <Path d="M20 14v20M14 20h20" stroke="#FFF" strokeWidth="3" />
    </Svg>
  );
}

// C6 Bank - Dark with "C6"
export function C6Logo({ size = 32 }: BankLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width="48" height="48" rx="12" fill="#242424" />
      <SvgText x="24" y="31" fontSize="20" fontWeight="800" fill="#FFFFFF" textAnchor="middle">C6</SvgText>
    </Svg>
  );
}

// Rico - Orange with "R"
export function RicoLogo({ size = 32 }: BankLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width="48" height="48" rx="12" fill="#FF5900" />
      <SvgText x="24" y="32" fontSize="26" fontWeight="800" fill="#FFF" textAnchor="middle">R</SvgText>
    </Svg>
  );
}

// Clear - Blue with "C"
export function ClearLogo({ size = 32 }: BankLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width="48" height="48" rx="12" fill="#00C2FF" />
      <SvgText x="24" y="32" fontSize="26" fontWeight="800" fill="#FFF" textAnchor="middle">C</SvgText>
    </Svg>
  );
}

// Modal - Black with "M"
export function ModalLogo({ size = 32 }: BankLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width="48" height="48" rx="12" fill="#1A1A1A" />
      <SvgText x="24" y="32" fontSize="24" fontWeight="800" fill="#FFF" textAnchor="middle">M</SvgText>
    </Svg>
  );
}

// Ágora - Navy with "A"
export function AgoraLogo({ size = 32 }: BankLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width="48" height="48" rx="12" fill="#00205B" />
      <SvgText x="24" y="32" fontSize="26" fontWeight="800" fill="#FFF" textAnchor="middle">A</SvgText>
    </Svg>
  );
}

// Binance - Dark with yellow diamond
export function BinanceLogo({ size = 32 }: BankLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width="48" height="48" rx="12" fill="#1E2026" />
      <Path d="M24 12l4 4-4 4-4-4z" fill="#F0B90B" />
      <Path d="M16 20l4 4-4 4-4-4z" fill="#F0B90B" />
      <Path d="M32 20l4 4-4 4-4-4z" fill="#F0B90B" />
      <Path d="M24 28l4 4-4 4-4-4z" fill="#F0B90B" />
    </Svg>
  );
}

// Mercado Bitcoin - Dark with green "MB"
export function MercadoBitcoinLogo({ size = 32 }: BankLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width="48" height="48" rx="12" fill="#1C1C1C" />
      <SvgText x="24" y="31" fontSize="18" fontWeight="800" fill="#00FFA3" textAnchor="middle">MB</SvgText>
    </Svg>
  );
}

// Genial - Orange with "G"
export function GenialLogo({ size = 32 }: BankLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width="48" height="48" rx="12" fill="#F26522" />
      <SvgText x="24" y="32" fontSize="26" fontWeight="800" fill="#FFF" textAnchor="middle">G</SvgText>
    </Svg>
  );
}

// Safra - Navy with stylized tree
export function SafraLogo({ size = 32 }: BankLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width="48" height="48" rx="12" fill="#003C71" />
      <Path d="M24 36V22" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M24 12l7 10H17z" fill="#FFF" />
    </Svg>
  );
}

// Toro - Teal with bull horns
export function ToroLogo({ size = 32 }: BankLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width="48" height="48" rx="12" fill="#00D1A7" />
      <Path d="M12 18c2-4 6-6 8-6v8M36 18c-2-4-6-6-8-6v8" stroke="#FFF" strokeWidth="3" strokeLinecap="round" fill="none" />
      <Circle cx="24" cy="28" r="7" fill="#FFF" />
      <Circle cx="24" cy="28" r="4" fill="#00D1A7" />
    </Svg>
  );
}

// Guide - Navy with "G"
export function GuideLogo({ size = 32 }: BankLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width="48" height="48" rx="12" fill="#1B3A5C" />
      <SvgText x="24" y="32" fontSize="26" fontWeight="800" fill="#FFF" textAnchor="middle">G</SvgText>
    </Svg>
  );
}
