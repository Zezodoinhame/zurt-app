import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '../../stores/settingsStore';
import { AppIcon } from '../../hooks/useIcon';

type Listener = (message: string) => void;
const listeners = new Set<Listener>();

export function triggerRateLimitToast(message: string) {
  listeners.forEach((fn) => fn(message));
}

export function RateLimitToast() {
  const insets = useSafeAreaInsets();
  const colors = useSettingsStore((s) => s.colors);
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(-100)).current;

  const show = useCallback(
    (msg: string) => {
      setMessage(msg);
      setVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();

      setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setVisible(false));
      }, 3000);
    },
    [slideAnim],
  );

  useEffect(() => {
    listeners.add(show);
    return () => { listeners.delete(show); };
  }, [show]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 8,
          backgroundColor: colors.warning + 'E6',
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <AppIcon name="hourglass" size={16} color="#FFF" />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  text: {
    flex: 1,
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
