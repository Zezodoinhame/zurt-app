import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { useAuthStore } from '../../src/stores/authStore';
import { usePortfolioStore } from '../../src/stores/portfolioStore';
import { Toggle } from '../../src/components/ui/Toggle';
import { Card } from '../../src/components/ui/Card';
import { formatBRL, formatDate } from '../../src/utils/formatters';
import { changePassword } from '../../src/services/api';

interface SettingRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

function SettingRow({ icon, label, value, onPress, rightElement, danger }: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress && !rightElement}
      accessibilityLabel={label}
    >
      <Text style={styles.settingIcon}>{icon}</Text>
      <Text style={[styles.settingLabel, danger && styles.dangerText]}>{label}</Text>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {rightElement}
      {onPress && !rightElement && (
        <Text style={styles.chevron}>{'\u203A'}</Text>
      )}
    </TouchableOpacity>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, updateUser, isDemoMode } = useAuthStore();
  const { institutions } = usePortfolioStore();

  const handleLogout = useCallback(() => {
    Alert.alert('Sair', 'Deseja realmente sair do ZURT?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }, [logout, router]);

  const handleChangePassword = useCallback(() => {
    if (isDemoMode) {
      Alert.alert('Demo', 'Indisponivel no modo demonstracao');
      return;
    }
    Alert.prompt(
      'Alterar senha',
      'Funcionalidade disponivel em breve',
      [{ text: 'OK' }],
    );
  }, [isDemoMode]);

  const toggleBiometric = useCallback(
    (value: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updateUser({ biometricEnabled: value });
    },
    [updateUser]
  );

  const togglePush = useCallback(
    (value: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updateUser({ pushEnabled: value });
    },
    [updateUser]
  );

  const toggleHideValues = useCallback(
    (value: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updateUser({ hideValuesOnOpen: value });
    },
    [updateUser]
  );

  if (!user) return null;

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* User card */}
      <Card variant="glow" delay={0}>
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            {isDemoMode && (
              <Text style={styles.demoLabel}>Modo demonstracao</Text>
            )}
          </View>
          <TouchableOpacity style={styles.editButton} accessibilityLabel="Editar perfil">
            <Text style={styles.editIcon}>{'\u270F\uFE0F'}</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Security */}
      <SectionTitle title={'\uD83D\uDD10 Seguranca'} />
      <View>
        <View style={styles.section}>
          <SettingRow
            icon={'\uD83D\uDC46'}
            label="Biometria"
            rightElement={
              <Toggle
                value={user.biometricEnabled}
                onValueChange={toggleBiometric}
                accessibilityLabel="Ativar biometria"
              />
            }
          />
          <SettingRow icon={'\uD83D\uDD11'} label="Alterar senha" onPress={handleChangePassword} />
          <SettingRow icon={'\uD83D\uDD22'} label="Alterar PIN" onPress={() => {}} />
        </View>
      </View>

      {/* Preferences */}
      <SectionTitle title={'\u2699\uFE0F Preferencias'} />
      <View>
        <View style={styles.section}>
          <SettingRow
            icon={'\uD83D\uDD14'}
            label="Notificacoes push"
            rightElement={
              <Toggle
                value={user.pushEnabled}
                onValueChange={togglePush}
                accessibilityLabel="Ativar notificacoes"
              />
            }
          />
          <SettingRow
            icon={'\uD83D\uDC41\uFE0F'}
            label="Ocultar valores ao abrir"
            rightElement={
              <Toggle
                value={user.hideValuesOnOpen}
                onValueChange={toggleHideValues}
                accessibilityLabel="Ocultar valores"
              />
            }
          />
          <SettingRow icon={'\uD83C\uDF10'} label="Idioma" value="Portugues" onPress={() => {}} />
          <SettingRow icon={'\uD83D\uDCB0'} label="Moeda padrao" value="BRL" onPress={() => {}} />
        </View>
      </View>

      {/* Connected accounts */}
      <SectionTitle title={'\uD83C\uDFE6 Contas Conectadas'} />
      <View>
        <View style={styles.section}>
          {institutions.map((inst) => {
            const statusColor =
              inst.status === 'connected'
                ? colors.positive
                : inst.status === 'syncing'
                  ? colors.warning
                  : colors.negative;
            const statusLabel =
              inst.status === 'connected'
                ? 'Conectado'
                : inst.status === 'syncing'
                  ? 'Sincronizando'
                  : 'Erro';

            return (
              <View key={inst.id} style={styles.settingRow}>
                <View style={[styles.instIcon, { backgroundColor: inst.color }]}>
                  <Text style={styles.instIconText}>
                    {inst.name.charAt(0)}
                  </Text>
                </View>
                <Text style={styles.settingLabel}>{inst.name}</Text>
                <View style={styles.statusBadge}>
                  <View
                    style={[styles.statusDot, { backgroundColor: statusColor }]}
                  />
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {statusLabel}
                  </Text>
                </View>
              </View>
            );
          })}
          <TouchableOpacity style={styles.connectButton}>
            <Text style={styles.connectButtonText}>
              + Conectar via Open Finance
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ZURT Token */}
      <SectionTitle title={'\uD83D\uDCCA ZURT Token'} />
      <Card variant="elevated" delay={450}>
        <View style={styles.tokenRow}>
          <View style={styles.tokenItem}>
            <Text style={styles.tokenLabel}>Saldo de tokens</Text>
            <Text style={styles.tokenValue}>
              {user.zurtTokens.toLocaleString('pt-BR')} ZURT
            </Text>
          </View>
          <View style={styles.tokenItem}>
            <Text style={styles.tokenLabel}>Revenue share recebido</Text>
            <Text style={[styles.tokenValue, { color: colors.accent }]}>
              {formatBRL(user.revenueShareReceived)}
            </Text>
          </View>
        </View>
        <View style={styles.tokenDivider} />
        <View style={styles.tokenDistribution}>
          <Text style={styles.tokenLabel}>Proxima distribuicao</Text>
          <Text style={styles.tokenDate}>
            {user.nextDistribution ? formatDate(user.nextDistribution) : '-'}
          </Text>
        </View>
      </Card>

      {/* About */}
      <SectionTitle title={'\u2139\uFE0F Sobre'} />
      <View>
        <View style={styles.section}>
          <SettingRow icon={'\uD83D\uDCC4'} label="Termos de uso" onPress={() => {}} />
          <SettingRow icon={'\uD83D\uDD12'} label="Politica de privacidade" onPress={() => {}} />
          <SettingRow icon={'\u2753'} label="Ajuda" onPress={() => {}} />
          <SettingRow icon={'\uD83D\uDCAC'} label="Suporte (WhatsApp)" onPress={() => {}} />
        </View>
      </View>

      {/* Logout */}
      <View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>{'\uD83D\uDEAA'} Sair</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>ZURT Wealth v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 120,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#060A0F',
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  userEmail: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  demoLabel: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '600',
    marginTop: 4,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border + '50',
  },
  settingIcon: {
    fontSize: 16,
    marginRight: spacing.md,
    width: 24,
    textAlign: 'center',
  },
  settingLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
  },
  settingValue: {
    fontSize: 13,
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
  chevron: {
    fontSize: 20,
    color: colors.text.muted,
    fontWeight: '300',
  },
  dangerText: {
    color: colors.negative,
  },
  instIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  instIconText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  connectButton: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderStyle: 'dashed',
  },
  connectButtonText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
  },
  tokenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tokenItem: {
    flex: 1,
  },
  tokenLabel: {
    fontSize: 11,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  tokenValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  tokenDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  tokenDistribution: {},
  tokenDate: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  logoutButton: {
    backgroundColor: colors.negative + '15',
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.negative + '30',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.negative,
  },
  version: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.text.muted,
    marginTop: spacing.xl,
  },
});
