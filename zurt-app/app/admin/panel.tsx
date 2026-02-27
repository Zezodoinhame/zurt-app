import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { isAdminAuthenticated } from './data/adminAuth';

import AdminHome from './_components/AdminHome';
import AdminUsers from './_components/AdminUsers';
import AdminConnections from './_components/AdminConnections';
import AdminLogs from './_components/AdminLogs';

const C = {
  bg: '#0A0E14',
  card: '#0F1520',
  border: '#1E2A3A',
  accent: '#00D4AA',
  text: '#E8ECF0',
  textSec: '#8B95A5',
  textMuted: '#64748B',
  positive: '#00D4AA',
};

const TABS = [
  { key: 'home', label: 'Home' },
  { key: 'users', label: 'Usuarios' },
  { key: 'connections', label: 'Conexoes' },
  { key: 'logs', label: 'Logs' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function AdminPanel() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    isAdminAuthenticated().then((ok) => {
      if (!ok) router.replace('/admin/login');
      setChecking(false);
    });
  }, []);

  const handleTabChange = (tab: TabKey) => {
    if (tab !== activeTab) {
      Haptics.selectionAsync();
      setActiveTab(tab);
    }
  };

  if (checking) {
    return (
      <View style={[styles.loader, { paddingTop: insets.top }]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin</Text>
          <View style={styles.greenDot} />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => { Haptics.selectionAsync(); router.push('/admin/settings'); }}
          >
            <Ionicons name="cog-outline" size={20} color={C.textSec} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentedContainer}>
        <View style={styles.segmentedBar}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.segmentedTab, activeTab === tab.key && styles.segmentedTabActive]}
              onPress={() => handleTabChange(tab.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.segmentedTabText,
                  activeTab === tab.key && styles.segmentedTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'home' && (
          <AdminHome onNavigateToConnections={() => setActiveTab('connections')} />
        )}
        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'connections' && <AdminConnections />}
        {activeTab === 'logs' && <AdminLogs />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  loader: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.positive,
    marginLeft: -4,
    marginTop: -8,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Segmented Control
  segmentedContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  segmentedBar: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 3,
  },
  segmentedTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentedTabActive: {
    backgroundColor: C.border,
  },
  segmentedTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textMuted,
  },
  segmentedTabTextActive: {
    color: C.accent,
    fontWeight: '700',
  },
  // Content
  content: {
    flex: 1,
  },
});
