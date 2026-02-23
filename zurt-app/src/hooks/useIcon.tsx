import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettingsStore } from '../stores/settingsStore';

// Map of semantic icon names to vector icon + emoji pairs
const ICON_MAP: Record<string, { lib: 'ion' | 'mci'; name: string; emoji: string }> = {
  family:       { lib: 'mci', name: 'account-group', emoji: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66' },
  wallet:       { lib: 'ion', name: 'wallet-outline', emoji: '\uD83D\uDCB0' },
  chart:        { lib: 'ion', name: 'bar-chart-outline', emoji: '\uD83D\uDCCA' },
  goal:         { lib: 'ion', name: 'flag-outline', emoji: '\uD83C\uDFAF' },
  idea:         { lib: 'ion', name: 'bulb-outline', emoji: '\uD83D\uDCA1' },
  education:    { lib: 'ion', name: 'school-outline', emoji: '\uD83C\uDF93' },
  mail:         { lib: 'ion', name: 'mail-outline', emoji: '\u2709\uFE0F' },
  eye:          { lib: 'ion', name: 'eye-outline', emoji: '\uD83D\uDC41\uFE0F' },
  unlock:       { lib: 'ion', name: 'lock-open-outline', emoji: '\uD83D\uDD13' },
  spouse:       { lib: 'ion', name: 'heart-outline', emoji: '\uD83D\uDC91' },
  child:        { lib: 'ion', name: 'happy-outline', emoji: '\uD83D\uDC76' },
  person:       { lib: 'ion', name: 'person-outline', emoji: '\uD83D\uDC64' },
  settings:     { lib: 'ion', name: 'settings-outline', emoji: '\u2699\uFE0F' },
  notification: { lib: 'ion', name: 'notifications-outline', emoji: '\uD83D\uDD14' },
  home:         { lib: 'ion', name: 'home-outline', emoji: '\uD83C\uDFE0' },
  trending:     { lib: 'ion', name: 'trending-up-outline', emoji: '\uD83D\uDCC8' },
  card:         { lib: 'ion', name: 'card-outline', emoji: '\uD83D\uDCB3' },
  agent:        { lib: 'mci', name: 'robot-outline', emoji: '\uD83E\uDD16' },
  success:      { lib: 'ion', name: 'checkmark-circle-outline', emoji: '\u2705' },
  warning:      { lib: 'ion', name: 'warning-outline', emoji: '\u26A0\uFE0F' },
  security:     { lib: 'ion', name: 'shield-checkmark-outline', emoji: '\uD83D\uDD12' },
  moon:         { lib: 'ion', name: 'moon-outline', emoji: '\uD83C\uDF19' },
  sun:          { lib: 'ion', name: 'sunny-outline', emoji: '\u2600\uFE0F' },
  globe:        { lib: 'ion', name: 'globe-outline', emoji: '\uD83C\uDF10' },
  currency:     { lib: 'ion', name: 'swap-horizontal-outline', emoji: '\uD83D\uDCB1' },
  report:       { lib: 'ion', name: 'document-text-outline', emoji: '\uD83D\uDCC4' },
  track:        { lib: 'ion', name: 'analytics-outline', emoji: '\uD83D\uDCCA' },
  learn:        { lib: 'ion', name: 'book-outline', emoji: '\uD83D\uDCD6' },
  biometric:    { lib: 'ion', name: 'finger-print-outline', emoji: '\uD83D\uDD10' },
  password:     { lib: 'ion', name: 'key-outline', emoji: '\uD83D\uDD11' },
  push:         { lib: 'ion', name: 'notifications-outline', emoji: '\uD83D\uDCF2' },
  theme:        { lib: 'ion', name: 'color-palette-outline', emoji: '\uD83C\uDFA8' },
  language:     { lib: 'ion', name: 'language-outline', emoji: '\uD83D\uDDE3\uFE0F' },
  logout:       { lib: 'ion', name: 'log-out-outline', emoji: '\uD83D\uDEAA' },
  delete:       { lib: 'ion', name: 'trash-outline', emoji: '\uD83D\uDDD1\uFE0F' },
  star:         { lib: 'ion', name: 'star-outline', emoji: '\u2B50' },
  fire:         { lib: 'ion', name: 'flame-outline', emoji: '\uD83D\uDD25' },
  clock:        { lib: 'ion', name: 'time-outline', emoji: '\u23F0' },
  link:         { lib: 'ion', name: 'link-outline', emoji: '\uD83D\uDD17' },
  plug:         { lib: 'ion', name: 'flash-outline', emoji: '\uD83D\uDD0C' },
  token:        { lib: 'mci', name: 'currency-usd', emoji: '\uD83E\uDE99' },
  sparkle:      { lib: 'ion', name: 'sparkles-outline', emoji: '\u2728' },
  tools:        { lib: 'ion', name: 'construct-outline', emoji: '\uD83D\uDEE0\uFE0F' },
  bank:         { lib: 'ion', name: 'business-outline', emoji: '\uD83C\uDFE6' },
  refresh:      { lib: 'ion', name: 'refresh-outline', emoji: '\uD83D\uDD04' },
  send:         { lib: 'ion', name: 'send-outline', emoji: '\u27A4' },
  info:         { lib: 'ion', name: 'information-circle-outline', emoji: '\u2139\uFE0F' },
  close:        { lib: 'ion', name: 'close-circle-outline', emoji: '\u274C' },
  back:         { lib: 'ion', name: 'arrow-back-outline', emoji: '\u2190' },
  chevron:      { lib: 'ion', name: 'chevron-forward-outline', emoji: '\u203A' },
  taxes:        { lib: 'ion', name: 'calculator-outline', emoji: '\uD83E\uDDEE' },
  search:       { lib: 'ion', name: 'search-outline', emoji: '\uD83D\uDD0D' },
  diamond:      { lib: 'ion', name: 'diamond-outline', emoji: '\uD83D\uDC8E' },
  briefcase:    { lib: 'ion', name: 'briefcase-outline', emoji: '\uD83D\uDCBC' },
  airplane:     { lib: 'ion', name: 'airplane-outline', emoji: '\u2708\uFE0F' },
  car:          { lib: 'ion', name: 'car-outline', emoji: '\uD83D\uDE97' },
  shield:       { lib: 'ion', name: 'shield-outline', emoji: '\uD83D\uDEE1\uFE0F' },
  add:          { lib: 'ion', name: 'add-outline', emoji: '\u2795' },
  rebalance:    { lib: 'mci', name: 'scale-balance', emoji: '\u2696\uFE0F' },
  radar:        { lib: 'mci', name: 'radar', emoji: '\uD83D\uDCE1' },
  gauge:        { lib: 'ion', name: 'speedometer-outline', emoji: '\uD83D\uDCDF' },
  trophy:       { lib: 'ion', name: 'trophy-outline', emoji: '\uD83C\uDFC6' },
  badge:        { lib: 'ion', name: 'ribbon-outline', emoji: '\uD83C\uDF96\uFE0F' },
  calendar:     { lib: 'ion', name: 'calendar-outline', emoji: '\uD83D\uDCC5' },
  health:       { lib: 'ion', name: 'pulse-outline', emoji: '\uD83D\uDC9A' },
  taxDashboard: { lib: 'ion', name: 'receipt-outline', emoji: '\uD83E\uDDFE' },
  hourglass:    { lib: 'ion', name: 'hourglass-outline', emoji: '\u23F3' },
  keypad:       { lib: 'ion', name: 'keypad-outline', emoji: '\uD83D\uDD22' },
  lock:         { lib: 'ion', name: 'lock-closed-outline', emoji: '\uD83D\uDD12' },
  target:       { lib: 'mci', name: 'target', emoji: '\uD83C\uDFAF' },
  dividend:     { lib: 'mci', name: 'cash-multiple', emoji: '\uD83D\uDCB8' },
  wifiOff:      { lib: 'ion', name: 'cloud-offline-outline', emoji: '\uD83D\uDCF5' },
  watchlist:    { lib: 'ion', name: 'list-outline', emoji: '\uD83D\uDCCB' },
  news:         { lib: 'ion', name: 'newspaper-outline', emoji: '\uD83D\uDCF0' },
  comparison:   { lib: 'ion', name: 'git-compare-outline', emoji: '\uD83D\uDD04' },
  budget:       { lib: 'ion', name: 'pie-chart-outline', emoji: '\uD83E\uDD67' },
  cashFlow:     { lib: 'mci', name: 'chart-timeline-variant', emoji: '\uD83D\uDCC8' },
  billReminder: { lib: 'ion', name: 'receipt-outline', emoji: '\uD83E\uDDFE' },
  insights:     { lib: 'ion', name: 'stats-chart-outline', emoji: '\uD83D\uDCC9' },
  correlation:  { lib: 'mci', name: 'grid', emoji: '\uD83D\uDD36' },
  backtest:     { lib: 'ion', name: 'time-outline', emoji: '\u23F0' },
  scenario:     { lib: 'mci', name: 'chart-line-variant', emoji: '\uD83C\uDFB2' },
  priceAlert:   { lib: 'ion', name: 'notifications-outline', emoji: '\uD83D\uDD14' },
  recurring:    { lib: 'mci', name: 'repeat', emoji: '\uD83D\uDD01' },
};

export type AppIconName = keyof typeof ICON_MAP;

interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: string;
}

export function AppIcon({ name, size = 24, color = '#A0AEC0' }: AppIconProps) {
  const iconStyle = useSettingsStore((s) => s.iconStyle);
  const entry = ICON_MAP[name];

  const box = { width: size, height: size, alignItems: 'center' as const, justifyContent: 'center' as const };

  if (!entry) return <View style={box}><Text style={{ fontSize: size * 0.8 }}>{String(name)}</Text></View>;

  if (iconStyle === 'emoji') {
    return <View style={box}><Text style={{ fontSize: size * 0.85 }}>{entry.emoji}</Text></View>;
  }

  if (entry.lib === 'mci') {
    return <View style={box}><MaterialCommunityIcons name={entry.name as any} size={size} color={color} /></View>;
  }
  return <View style={box}><Ionicons name={entry.name as any} size={size} color={color} /></View>;
}

/** Returns emoji string if iconStyle is 'emoji', empty string otherwise. For use in text templates. */
export function useIconText(name: AppIconName): string {
  const iconStyle = useSettingsStore((s) => s.iconStyle);
  const entry = ICON_MAP[name];
  if (!entry) return '';
  return iconStyle === 'emoji' ? entry.emoji : '';
}
