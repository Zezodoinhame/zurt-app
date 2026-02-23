import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '../../stores/settingsStore';
import { useNetworkStore } from '../../stores/networkStore';
import { AppIcon } from '../../hooks/useIcon';
import { formatRelativeDate } from '../../utils/formatters';

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const colors = useSettingsStore((s) => s.colors);
  const { t } = useSettingsStore();
  const isOnline = useNetworkStore((s) => s.isOnline);
  const lastSyncTime = useNetworkStore((s) => s.lastSyncTime);
  const heightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: isOnline ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isOnline, heightAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          marginTop: heightAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-50, 0],
          }),
          opacity: heightAnim,
          backgroundColor: '#F97316',
        },
      ]}
      pointerEvents={isOnline ? 'none' : 'auto'}
    >
      <View style={[styles.content, { paddingTop: 6 }]}>
        <AppIcon name="wifiOff" size={16} color="#FFF" />
        <Text style={styles.text}>{t('offline.banner')}</Text>
        {lastSyncTime && (
          <Text style={styles.syncText}>
            {t('offline.lastSync').replace('{n}', formatRelativeDate(lastSyncTime))}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    zIndex: 9998,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  text: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  syncText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },
});
