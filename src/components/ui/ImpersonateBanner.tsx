import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useImpersonateStore } from '../../stores/impersonateStore';

export function ImpersonateBanner() {
  const router = useRouter();
  const isImpersonating = useImpersonateStore((s) => s.isImpersonating);
  const impersonatedUser = useImpersonateStore((s) => s.impersonatedUser);
  const stopImpersonation = useImpersonateStore((s) => s.stopImpersonation);
  const heightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: isImpersonating ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isImpersonating, heightAnim]);

  const handleExit = async () => {
    await stopImpersonation();
    router.replace('/admin/panel');
  };

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
        },
      ]}
      pointerEvents={isImpersonating ? 'auto' : 'none'}
    >
      <View style={styles.content}>
        <Ionicons name="eye-outline" size={16} color="#1A1A1A" />
        <Text style={styles.text} numberOfLines={1}>
          Vendo como: {impersonatedUser?.name ?? 'Usuario'}
        </Text>
        <TouchableOpacity style={styles.exitBtn} onPress={handleExit}>
          <Text style={styles.exitText}>Sair</Text>
          <Ionicons name="close" size={14} color="#1A1A1A" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFD93D',
    overflow: 'hidden',
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  text: {
    color: '#1A1A1A',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  exitText: {
    color: '#1A1A1A',
    fontSize: 12,
    fontWeight: '700',
  },
});
