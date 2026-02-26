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
import { type ThemeColors } from '../../theme/colors';

interface TickerItem {
  symbol: string;
  value: string;
  change: string;
  up?: boolean;
  neutral?: boolean;
}

// TODO: connect to real market data from benchmarks.ts / brapi
const TICKER_DATA: TickerItem[] = [
  { symbol: 'IBOV', value: '126.842', change: '+0,82%', up: true },
  { symbol: 'USD/BRL', value: '5,94', change: '+0,12%', up: true },
  { symbol: 'BTC', value: '$97.420', change: '+2,1%', up: true },
  { symbol: 'ETH', value: '$2.741', change: '-0,8%', up: false },
  { symbol: 'SELIC', value: '13,25%', change: '', neutral: true },
  { symbol: 'IPCA', value: '4,87%', change: '', neutral: true },
  { symbol: 'CDI', value: '13,15%', change: '', neutral: true },
  { symbol: 'S&P500', value: '5.983', change: '+0,45%', up: true },
];

const GREEN = '#4ade80';
const RED = '#f87171';

export function MarketTicker() {
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  const duplicated = useMemo(() => [...TICKER_DATA, ...TICKER_DATA], []);
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
