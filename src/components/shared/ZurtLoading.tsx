import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function ZurtLoading({ message = 'Atualizando mercado...' }: { message?: string }) {
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0.4)).current;
  const logoScale = useRef(new Animated.Value(0.95)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(logoScale, { toValue: 1.05, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(logoScale, { toValue: 0.95, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0.6, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.timing(waveAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: false })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(textFade, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(textFade, { toValue: 0.4, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    const dotAnim = (dot, delay) => Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]));
    dotAnim(dot1, 0).start();
    dotAnim(dot2, 200).start();
    dotAnim(dot3, 400).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.logo, { transform: [{ scale: logoScale }], opacity: pulseAnim, textShadowColor: 'rgba(0,212,170,0.6)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 }]}>
        ZURT
      </Animated.Text>
      <View style={styles.waveContainer}>
        <Svg width={width * 0.65} height={70} viewBox="0 0 220 70">
          <Defs>
            <LinearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#00D4AA" stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#00D4AA" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Path d="M0,55 Q25,35 50,40 T100,25 T150,35 T200,18 L220,18 L220,70 L0,70 Z" fill="url(#waveGradient)" />
          <Path d="M0,55 Q25,35 50,40 T100,25 T150,35 T200,18 L220,18" stroke="#00D4AA" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <Path d="M0,60 Q30,45 55,47 T105,35 T155,42 T205,28 L220,25" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.35" />
          <Path d="M0,58 Q35,50 60,48 T110,40 T160,45 T210,32 L220,30" stroke="#8B5CF6" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.2" />
          <Path d="M218,18 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0" fill="#00D4AA" />
        </Svg>
        <Animated.View style={[styles.scanLine, { left: waveAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
      <Animated.Text style={[styles.loadingText, { opacity: textFade }]}>{message}</Animated.Text>
      <View style={styles.dotsRow}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: dot, transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.2] }) }] }, i === 1 && { backgroundColor: '#3B82F6' }, i === 2 && { backgroundColor: '#8B5CF6' }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  logo: { fontSize: 42, fontWeight: '900', color: '#00D4AA', letterSpacing: 8, marginBottom: 30 },
  waveContainer: { position: 'relative', overflow: 'hidden', marginBottom: 24 },
  scanLine: { position: 'absolute', top: 0, width: 2, height: '100%', backgroundColor: 'rgba(0,212,170,0.3)' },
  loadingText: { fontSize: 13, color: '#6B7280', letterSpacing: 2, marginBottom: 12 },
  dotsRow: { flexDirection: 'row', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00D4AA' },
});