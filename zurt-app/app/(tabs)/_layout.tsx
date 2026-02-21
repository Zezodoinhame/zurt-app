import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useNotificationStore } from '../../src/stores/notificationStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import type { ThemeColors } from '../../src/theme/colors';

interface TabIconProps {
  icon: string;
  label: string;
  focused: boolean;
  badge?: number;
  colors: ThemeColors;
}

function TabIcon({ icon, label, focused, badge, colors }: TabIconProps) {
  return (
    <View style={tabStyles.tabItem}>
      <View style={tabStyles.iconContainer}>
        <Text style={[tabStyles.icon, focused && tabStyles.iconFocused]}>{icon}</Text>
        {badge !== undefined && badge > 0 && (
          <View style={[tabStyles.badge, { backgroundColor: colors.negative }]}>
            <Text style={tabStyles.badgeText}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        )}
      </View>
      <Text style={[tabStyles.label, { color: colors.text.muted }, focused && { color: colors.accent, fontWeight: '600' as const }]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const getUnreadCount = useNotificationStore((s) => s.getUnreadCount);
  const t = useSettingsStore((s) => s.t);
  const colors = useSettingsStore((s) => s.colors);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 0.5,
          height: 85,
          paddingTop: 8,
          paddingBottom: 20,
          elevation: 0,
          shadowOpacity: 0,
        },
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
            <TabIcon icon="🏠" label={t('tab.home')} focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="💼" label={t('tab.wallet')} focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="agent"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="✨" label={t('tab.agent')} focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="cards"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="💳" label={t('tab.cards')} focused={focused} colors={colors} />
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
              colors={colors}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="👤" label={t('tab.profile')} focused={focused} colors={colors} />
          ),
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
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
    marginTop: 4,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
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
