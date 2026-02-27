import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../../src/stores/settingsStore';

export default function SubscriptionCancel() {
  const router = useRouter();
  const colors = useSettingsStore((s) => s.colors);
  const { t } = useSettingsStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.back();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={styles.icon}>❌</Text>
      <Text style={[styles.title, { color: colors.negative }]}>
        {t('plans.paymentCancelled')}
      </Text>
      <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
        {t('plans.paymentCancelledDesc')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
});
