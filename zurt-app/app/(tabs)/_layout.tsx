import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '../../src/theme/colors';
import { useNotificationStore } from '../../src/stores/notificationStore';
import { useSettingsStore } from '../../src/stores/settingsStore';

interface TabIconProps {
  icon: string;
  label: string;
  focused: boolean;
  badge?: number;
}

function TabIcon({ icon, label, focused, badge }: TabIconProps) {
  return (
    <View style={styles.tabItem}>
      <View style={styles.iconContainer}>
        <Text style={[styles.icon, focused && styles.iconFocused]}>{icon}</Text>
        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.label, focused && styles.labelFocused]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const getUnreadCount = useNotificationStore((s) => s.getUnreadCount);
  const t = useSettingsStore((s) => s.t);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.text.muted,
      }}
      screenListeners={{
        tabPress: () => {
          Haptics.selectionAsync();
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🏠" label={t('tab.home')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="💼" label={t('tab.wallet')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="cards"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="💳" label={t('tab.cards')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="🔔"
              label={t('tab.alerts')}
              focused={focused}
              badge={getUnreadCount()}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="👤" label={t('tab.profile')} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 0.5,
    height: 85,
    paddingTop: 8,
    paddingBottom: 20,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  iconContainer: {
    position: 'relative',
  },
  icon: {
    fontSize: 22,
    opacity: 0.5,
  },
  iconFocused: {
    opacity: 1,
  },
  label: {
    fontSize: 10,
    color: colors.text.muted,
    marginTop: 4,
    fontWeight: '500',
  },
  labelFocused: {
    color: colors.accent,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: colors.negative,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
});
