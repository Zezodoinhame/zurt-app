import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotificationStore } from '../../src/stores/notificationStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { usePlanStore } from '../../src/stores/planStore';
import type { ThemeColors } from '../../src/theme/colors';

// ---------------------------------------------------------------------------
// Standard tab icon
// ---------------------------------------------------------------------------

interface TabIconProps {
  iconFocused: string;
  iconDefault: string;
  label: string;
  focused: boolean;
  badge?: number;
  colors: ThemeColors;
}

function TabIcon({ iconFocused, iconDefault, label, focused, badge, colors }: TabIconProps) {
  return (
    <View style={tabStyles.tabItem}>
      <View style={tabStyles.iconContainer}>
        <Ionicons
          name={(focused ? iconFocused : iconDefault) as any}
          size={22}
          color={focused ? colors.accent : colors.text.muted}
        />
        {badge !== undefined && badge > 0 && (
          <View style={[tabStyles.badge, { backgroundColor: colors.negative }]}>
            <Text style={tabStyles.badgeText}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        )}
      </View>
      {focused && <View style={[tabStyles.activeDot, { backgroundColor: colors.accent }]} />}
      <Text style={[tabStyles.label, { color: colors.text.muted }, focused && { color: colors.accent, fontWeight: '600' as const }]}>
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Agent tab icon (gradient highlight)
// ---------------------------------------------------------------------------

function AgentTabIcon({ focused, label, colors, showProBadge }: { focused: boolean; label: string; colors: ThemeColors; showProBadge?: boolean }) {
  return (
    <View style={tabStyles.tabItem}>
      <View style={tabStyles.agentIconOuter}>
        <LinearGradient
          colors={focused ? [colors.accent, colors.info] : [colors.text.muted + '30', colors.text.muted + '20']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={tabStyles.agentIconGradient}
        >
          <Ionicons
            name={focused ? 'sparkles' : 'sparkles-outline'}
            size={18}
            color={focused ? colors.background : colors.text.muted}
          />
        </LinearGradient>
        {showProBadge && (
          <View style={tabStyles.proBadge}>
            <Text style={tabStyles.proBadgeText}>PRO</Text>
          </View>
        )}
      </View>
      <Text style={[tabStyles.label, { color: colors.text.muted }, focused && { color: colors.accent, fontWeight: '600' as const }]}>
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tab Layout
// ---------------------------------------------------------------------------

export default function TabLayout() {
  const getUnreadCount = useNotificationStore((s) => s.getUnreadCount);
  const t = useSettingsStore((s) => s.t);
  const colors = useSettingsStore((s) => s.colors);
  const plan = usePlanStore((s) => s.plan);
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar + 'F2',
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 64 + (insets.bottom || 0),
          paddingTop: 6,
          paddingBottom: insets.bottom || 8,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          ...(Platform.OS === 'android' && { elevation: 8 }),
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
            <TabIcon iconFocused="home" iconDefault="home-outline" label={t('tab.home')} focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFocused="wallet" iconDefault="wallet-outline" label={t('tab.wallet')} focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="agent"
        options={{
          tabBarIcon: ({ focused }) => (
            <AgentTabIcon focused={focused} label={t('tab.agent')} colors={colors} showProBadge={plan === 'free'} />
          ),
        }}
      />
      <Tabs.Screen
        name="cards"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFocused="card" iconDefault="card-outline" label={t('tab.cards')} focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconFocused="notifications"
              iconDefault="notifications-outline"
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
            <TabIcon iconFocused="person" iconDefault="person-outline" label={t('tab.profile')} focused={focused} colors={colors} />
          ),
        }}
      />
    </Tabs>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const tabStyles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  iconContainer: {
    position: 'relative',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
    marginBottom: -1,
  },
  label: {
    fontSize: 10,
    marginTop: 3,
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

  // Agent special icon
  agentIconOuter: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
  },
  agentIconGradient: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proBadge: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: '#FF6B6B',
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  proBadgeText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
