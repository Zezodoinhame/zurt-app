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
        <Text style={styles.chevron}>›</Text>
      )}
    </TouchableOpacity>
  );
}

function SectionTitle({ title, delay = 0 }: { title: string; delay?: number }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, updateUser } = useAuthStore();
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
          </View>
          <TouchableOpacity style={styles.editButton} accessibilityLabel="Editar perfil">
            <Text style={styles.editIcon}>✏️</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Security */}
      <SectionTitle title="🔐 Segurança" delay={100} />
      <View>
        <View style={styles.section}>
          <SettingRow
            icon="👆"
            label="Biometria"
            rightElement={
              <Toggle
                value={user.biometricEnabled}
                onValueChange={toggleBiometric}
                accessibilityLabel="Ativar biometria"
              />
            }
          />
          <SettingRow icon="🔑" label="Alterar senha" onPress={() => {}} />
          <SettingRow icon="🔢" label="Alterar PIN" onPress={() => {}} />
        </View>
      </View>

      {/* Preferences */}
      <SectionTitle title="⚙️ Preferências" delay={200} />
      <View>
        <View style={styles.section}>
          <SettingRow
            icon="🔔"
            label="Notificações push"
            rightElement={
              <Toggle
                value={user.pushEnabled}
                onValueChange={togglePush}
                accessibilityLabel="Ativar notificações"
              />
            }
          />
          <SettingRow
            icon="👁️"
            label="Ocultar valores ao abrir"
            rightElement={
              <Toggle
                value={user.hideValuesOnOpen}
                onValueChange={toggleHideValues}
                accessibilityLabel="Ocultar valores"
              />
            }
          />
          <SettingRow icon="🌐" label="Idioma" value="Português" onPress={() => {}} />
          <SettingRow icon="💰" label="Moeda padrão" value="BRL" onPress={() => {}} />
        </View>
      </View>

      {/* Connected accounts */}
      <SectionTitle title="🏦 Contas Conectadas" delay={300} />
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
      <SectionTitle title="📊 ZURT Token" delay={400} />
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
          <Text style={styles.tokenLabel}>Próxima distribuição</Text>
          <Text style={styles.tokenDate}>
            {formatDate(user.nextDistribution)}
          </Text>
        </View>
      </Card>

      {/* About */}
      <SectionTitle title="ℹ️ Sobre" delay={500} />
      <View>
        <View style={styles.section}>
          <SettingRow icon="📄" label="Termos de uso" onPress={() => {}} />
          <SettingRow icon="🔒" label="Política de privacidade" onPress={() => {}} />
          <SettingRow icon="❓" label="Ajuda" onPress={() => {}} />
          <SettingRow icon="💬" label="Suporte (WhatsApp)" onPress={() => {}} />
        </View>
      </View>

      {/* Logout */}
      <View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Sair</Text>
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
