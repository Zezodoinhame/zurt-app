import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettingsStore } from '../../stores/settingsStore';
import { useMarketStore } from '../../stores/marketStore';
import { type ThemeColors } from '../../theme/colors';

interface TickerItem {
  symbol: string;
  value: string;
  change: string;
  up?: boolean;
  neutral?: boolean;
}

// Fallback data shown while loading
const FALLBACK_TICKER: TickerItem[] = [
  { symbol: 'IBOV', value: '---', change: '', neutral: true },
  { symbol: 'USD/BRL', value: '---', change: '', neutral: true },
  { symbol: 'BTC', value: '---', change: '', neutral: true },
  { symbol: 'SELIC', value: '---', change: '', neutral: true },
  { symbol: 'IPCA', value: '---', change: '', neutral: true },
];

const GREEN = '#4ade80';
const RED = '#f87171';

function formatNumber(n: number, decimals = 2): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatPercent(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2).replace('.', ',')}%`;
}

export function MarketTicker() {
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const ibovespa = useMarketStore((s) => s.ibovespa);
  const usdBrl = useMarketStore((s) => s.usdBrl);
  const btcBrl = useMarketStore((s) => s.btcBrl);
  const currentSelic = useMarketStore((s) => s.currentSelic);
  const currentInflation = useMarketStore((s) => s.currentInflation);
  const isLoading = useMarketStore((s) => s.isLoading);
  const loadMarketOverview = useMarketStore((s) => s.loadMarketOverview);

  // Load market data on mount if not already loaded
  useEffect(() => {
    if (!ibovespa && !isLoading) {
      loadMarketOverview();
    }
  }, []);

  // Build ticker items from live data
  const tickerData: TickerItem[] = useMemo(() => {
    if (!ibovespa && !usdBrl && !btcBrl) return FALLBACK_TICKER;

    const items: TickerItem[] = [];

    if (ibovespa) {
      const points = ibovespa.regularMarketPrice ?? 0;
      const change = ibovespa.regularMarketChangePercent ?? 0;
      items.push({
        symbol: 'IBOV',
        value: formatNumber(points, 0),
        change: formatPercent(change),
        up: change >= 0,
      });
    }

    if (usdBrl) {
      const bid = usdBrl.bidPrice ?? 0;
      const change = usdBrl.regularMarketChangePercent ?? 0;
      items.push({
        symbol: 'USD/BRL',
        value: formatNumber(bid),
        change: formatPercent(change),
        up: change >= 0,
      });
    }

    if (btcBrl) {
      const price = btcBrl.regularMarketPrice ?? 0;
      const change = btcBrl.regularMarketChangePercent ?? 0;
      items.push({
        symbol: 'BTC',
        value: `R$${formatNumber(price, 0)}`,
        change: formatPercent(change),
        up: change >= 0,
      });
    }

    if (currentSelic != null) {
      items.push({
        symbol: 'SELIC',
        value: `${formatNumber(currentSelic)}%`,
        change: '',
        neutral: true,
      });
    }

    if (currentInflation != null) {
      items.push({
        symbol: 'IPCA',
        value: `${formatNumber(currentInflation)}%`,
        change: '',
        neutral: true,
      });
    }

    return items.length > 0 ? items : FALLBACK_TICKER;
  }, [ibovespa, usdBrl, btcBrl, currentSelic, currentInflation]);

  const scrollRef = useRef<ScrollView>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [contentWidth, setContentWidth] = useState(0);
  const positionRef = useRef(0);

  // Pulsing LIVE dot
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  const duplicated = useMemo(() => [...tickerData, ...tickerData], [tickerData]);
  const halfWidth = contentWidth / 2;

  // Auto-scroll animation
  useEffect(() => {
    if (halfWidth <= 0) return;

    const interval = setInterval(() => {
      if (!isPaused) {
        positionRef.current += 0.5;
        if (positionRef.current >= halfWidth) {
          positionRef.current = 0;
        }
        scrollRef.current?.scrollTo({ x: positionRef.current, animated: false });
      }
    }, 16);

    return () => clearInterval(interval);
  }, [isPaused, halfWidth]);

  const handleContentSizeChange = useCallback((w: number) => {
    setContentWidth(w);
  }, []);

  const handleTouchStart = useCallback(() => setIsPaused(true), []);
  const handleTouchEnd = useCallback(() => {
    setTimeout(() => setIsPaused(false), 3000);
  }, []);

  return (
    <View style={styles.container}>
      {/* LIVE indicator with gradient fade */}
      <LinearGradient
        colors={[colors.background, colors.background, 'transparent']}
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.liveOverlay}
        pointerEvents="none"
      >
        <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
        <Text style={styles.liveText}>LIVE</Text>
      </LinearGradient>

      {/* Right fade */}
      <LinearGradient
        colors={['transparent', colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.fadeRight}
        pointerEvents="none"
      />

      {/* Scrolling ticker */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onContentSizeChange={handleContentSizeChange}
        contentContainerStyle={styles.tickerContent}
        style={styles.tickerScroll}
      >
        {duplicated.map((item, i) => (
          <View key={i} style={styles.tickerItemRow}>
            <Text style={styles.tickerSymbol}>{item.symbol}</Text>
            <Text style={styles.tickerValue}>{item.value}</Text>
            {item.change ? (
              <Text
                style={[
                  styles.tickerChange,
                  {
                    color: item.neutral
                      ? colors.warning
                      : item.up
                        ? GREEN
                        : RED,
                  },
                ]}
              >
                {item.change}
              </Text>
            ) : null}
            {i < duplicated.length - 1 && <View style={styles.tickerSep} />}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: 'rgba(0, 229, 204, 0.04)',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 7,
      position: 'relative',
      overflow: 'hidden',
    },
    liveOverlay: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 60,
      zIndex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 12,
      gap: 4,
    },
    liveDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: GREEN,
    },
    liveText: {
      color: GREEN,
      fontSize: 8,
      fontWeight: '800',
      letterSpacing: 1,
    },
    fadeRight: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 40,
      zIndex: 2,
    },
    tickerScroll: {
      marginLeft: 60,
    },
    tickerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    tickerItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    tickerSymbol: {
      color: colors.text.secondary,
      fontSize: 11,
      fontWeight: '600',
    },
    tickerValue: {
      color: colors.text.primary,
      fontSize: 11,
      fontWeight: '700',
    },
    tickerChange: {
      fontSize: 10,
      fontWeight: '700',
    },
    tickerSep: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: colors.border,
      marginLeft: 8,
    },
  });
