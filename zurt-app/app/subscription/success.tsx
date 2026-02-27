import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { usePlanStore } from '../../src/stores/planStore';

export default function SubscriptionSuccess() {
  const router = useRouter();
  const colors = useSettingsStore((s) => s.colors);
  const { t } = useSettingsStore();

  useEffect(() => {
    // Reload subscription status after successful payment
    const store = usePlanStore.getState();
    store.reset();
    store.loadSubscription(store.userEmail);

    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={styles.icon}>✅</Text>
      <Text style={[styles.title, { color: colors.positive }]}>
        {t('plans.subscriptionActivated')}
      </Text>
      <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
        {t('plans.subscriptionActivatedDesc')}
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
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
