import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Clipboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { adminLogout } from './data/adminAuth';

const C = {
  bg: '#0A0E14',
  card: '#0F1520',
  border: '#1E2A3A',
  accent: '#00D4AA',
  text: '#E8ECF0',
  textSec: '#8B95A5',
  textMuted: '#64748B',
  negative: '#FF6B6B',
};

const API_KEYS = [
  { label: 'Pluggy Client ID', value: '3f8a\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022d2', full: '3f8a1b2c-d3e4-5f6a-7b8c-9d0e1f2a3b4d' },
  { label: 'Pluggy Client Secret', value: 'sk_\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022', full: 'sk_live_abc123def456ghi789' },
  { label: 'B3 Client ID', value: 'Nao configurado', full: '' },
];

export default function AdminSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [notifNewUser, setNotifNewUser] = useState(true);
  const [notifConnectionError, setNotifConnectionError] = useState(true);
  const [notifSuspiciousLogin, setNotifSuspiciousLogin] = useState(false);

  const handleCopy = (value: string, label: string) => {
    if (!value) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Clipboard.setString(value);
    Alert.alert('Copiado', `${label} copiado para a area de transferencia`);
  };

  const handleLogoutAdmin = () => {
    Alert.alert('Sair do Admin', 'Deseja sair do painel administrativo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await adminLogout();
          router.replace('/(tabs)/profile');
        },
      },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header with back */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuracoes</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* API Keys */}
        <Text style={styles.sectionTitle}>API Keys</Text>
        <View style={styles.card}>
          {API_KEYS.map((key, idx) => (
            <View key={key.label} style={[styles.keyRow, idx < API_KEYS.length - 1 && styles.keyRowBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.keyLabel}>{key.label}</Text>
                <Text style={styles.keyValue}>{key.value}</Text>
              </View>
              {key.full ? (
                <TouchableOpacity style={styles.copyBtn} onPress={() => handleCopy(key.full, key.label)}>
                  <Ionicons name="copy-outline" size={16} color={C.accent} />
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </View>

        {/* Notification Toggles */}
        <Text style={styles.sectionTitle}>Notificacoes Admin</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Novo usuario cadastrado</Text>
              <Text style={styles.toggleDesc}>Receber push quando novo usuario se cadastrar</Text>
            </View>
            <Switch
              value={notifNewUser}
              onValueChange={setNotifNewUser}
              trackColor={{ false: C.border, true: C.accent + '60' }}
              thumbColor={notifNewUser ? C.accent : C.textMuted}
            />
          </View>
          <View style={[styles.toggleRow, styles.toggleRowBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Erro de conexao Open Finance</Text>
              <Text style={styles.toggleDesc}>Alertar quando conexao Pluggy falhar</Text>
            </View>
            <Switch
              value={notifConnectionError}
              onValueChange={setNotifConnectionError}
              trackColor={{ false: C.border, true: C.accent + '60' }}
              thumbColor={notifConnectionError ? C.accent : C.textMuted}
            />
          </View>
          <View style={[styles.toggleRow, styles.toggleRowBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Login suspeito</Text>
              <Text style={styles.toggleDesc}>Alertar sobre logins de locais incomuns</Text>
            </View>
            <Switch
              value={notifSuspiciousLogin}
              onValueChange={setNotifSuspiciousLogin}
              trackColor={{ false: C.border, true: C.accent + '60' }}
              thumbColor={notifSuspiciousLogin ? C.accent : C.textMuted}
            />
          </View>
        </View>

        {/* App Info */}
        <Text style={styles.sectionTitle}>Info do App</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Versao</Text>
            <Text style={styles.infoValue}>v1.0.0</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Ambiente</Text>
            <View style={styles.envBadge}><Text style={styles.envBadgeText}>PROD</Text></View>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Build</Text>
            <Text style={styles.infoValue}>2026.02.27.1</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Expo SDK</Text>
            <Text style={styles.infoValue}>54</Text>
          </View>
        </View>

        {/* Exit Admin */}
        <TouchableOpacity style={styles.exitBtn} onPress={handleLogoutAdmin}>
          <Ionicons name="log-out-outline" size={18} color={C.negative} />
          <Text style={styles.exitBtnText}>Sair do Admin</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>ZURT Admin Panel v1.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.text },
  scrollContent: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 10, marginTop: 16 },
  card: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  keyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  keyRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  keyLabel: { fontSize: 12, color: C.textMuted, marginBottom: 2 },
  keyValue: { fontSize: 14, fontWeight: '600', color: C.text, fontFamily: 'monospace' },
  copyBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: C.accent + '15', alignItems: 'center', justifyContent: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  toggleRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: C.text },
  toggleDesc: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  infoRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  infoLabel: { fontSize: 13, color: C.textSec },
  infoValue: { fontSize: 13, fontWeight: '600', color: C.text },
  envBadge: { backgroundColor: C.accent + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  envBadgeText: { fontSize: 10, fontWeight: '700', color: C.accent, letterSpacing: 0.5 },
  exitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.negative + '10', borderRadius: 12, borderWidth: 1,
    borderColor: C.negative + '30', paddingVertical: 16, marginTop: 24,
  },
  exitBtnText: { fontSize: 15, fontWeight: '700', color: C.negative },
  footerText: { textAlign: 'center', fontSize: 11, color: C.textMuted, marginTop: 16 },
});
