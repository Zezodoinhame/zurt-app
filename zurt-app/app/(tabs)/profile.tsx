import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { useAuthStore } from '../../src/stores/authStore';
import { usePortfolioStore } from '../../src/stores/portfolioStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import type { Language } from '../../src/i18n/translations';
import type { Currency } from '../../src/stores/settingsStore';
import { Toggle } from '../../src/components/ui/Toggle';
import { Card } from '../../src/components/ui/Card';
import { formatBRL, formatDate } from '../../src/utils/formatters';
import { changePassword } from '../../src/services/api';

// ---------------------------------------------------------------------------
// Language & Currency options
// ---------------------------------------------------------------------------

const languageOptions: Array<{ key: Language; flag: string; label: string }> = [
  { key: 'pt', flag: '🇧🇷', label: 'Português' },
  { key: 'en', flag: '🇺🇸', label: 'English' },
  { key: 'zh', flag: '🇨🇳', label: '中文' },
  { key: 'ar', flag: '🇸🇦', label: 'العربية' },
];

const currencyOptions: Array<{ key: Currency; flag: string; label: string }> = [
  { key: 'BRL', flag: '🇧🇷', label: 'BRL (R$)' },
  { key: 'USD', flag: '🇺🇸', label: 'USD ($)' },
  { key: 'EUR', flag: '🇪🇺', label: 'EUR (€)' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

function SectionTitle({ title }: { title: string }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Picker Modal
// ---------------------------------------------------------------------------

interface PickerModalProps<T extends string> {
  visible: boolean;
  title: string;
  options: Array<{ key: T; flag: string; label: string }>;
  selected: T;
  onSelect: (key: T) => void;
  onClose: () => void;
}

function PickerModal<T extends string>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: PickerModalProps<T>) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.modalOption,
                selected === opt.key && styles.modalOptionSelected,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                onSelect(opt.key);
                onClose();
              }}
            >
              <Text style={styles.modalOptionFlag}>{opt.flag}</Text>
              <Text style={[
                styles.modalOptionLabel,
                selected === opt.key && styles.modalOptionLabelSelected,
              ]}>
                {opt.label}
              </Text>
              {selected === opt.key && (
                <Text style={styles.modalCheck}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Password Modal
// ---------------------------------------------------------------------------

function PasswordModal({
  visible,
  onClose,
  isDemoMode,
}: {
  visible: boolean;
  onClose: () => void;
  isDemoMode: boolean;
}) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    if (!currentPw || !newPw || !confirmPw) {
      setError('Preencha todos os campos');
      return;
    }
    if (newPw !== confirmPw) {
      setError('As senhas não coincidem');
      return;
    }
    if (newPw.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    setIsLoading(true);
    try {
      await changePassword(currentPw, newPw);
      Alert.alert('Sucesso', 'Senha alterada com sucesso!');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao alterar senha');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setError('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <Text style={styles.modalTitle}>Alterar senha</Text>

          <TextInput
            style={styles.passwordInput}
            placeholder="Senha atual"
            placeholderTextColor={colors.text.muted}
            secureTextEntry
            value={currentPw}
            onChangeText={setCurrentPw}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.passwordInput}
            placeholder="Nova senha"
            placeholderTextColor={colors.text.muted}
            secureTextEntry
            value={newPw}
            onChangeText={setNewPw}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.passwordInput}
            placeholder="Confirmar nova senha"
            placeholderTextColor={colors.text.muted}
            secureTextEntry
            value={confirmPw}
            onChangeText={setConfirmPw}
            autoCapitalize="none"
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Salvar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.modalClose} onPress={handleClose}>
            <Text style={styles.modalCloseText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ===========================================================================
// ProfileScreen
// ===========================================================================

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, updateUser, isDemoMode } = useAuthStore();
  const { institutions } = usePortfolioStore();
  const { language, currency, setLanguage, setCurrency, t } = useSettingsStore();

  // Modal states
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const currentLanguageLabel = languageOptions.find((l) => l.key === language)?.label ?? 'Português';
  const currentCurrencyLabel = currencyOptions.find((c) => c.key === currency)?.label ?? 'BRL (R$)';

  const handleLogout = useCallback(() => {
    Alert.alert(t('profile.logout'), t('profile.logoutConfirm'), [
      { text: t('profile.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }, [logout, router, t]);

  const handleChangePassword = useCallback(() => {
    if (isDemoMode) {
      Alert.alert('Demo', t('profile.demoUnavailable'));
      return;
    }
    setShowPasswordModal(true);
  }, [isDemoMode, t]);

  const handleConnectBank = useCallback(() => {
    if (isDemoMode) {
      Alert.alert('Demo', t('profile.demoUnavailable'));
      return;
    }
    router.push('/connect-bank');
  }, [isDemoMode, router, t]);

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
              <Text style={styles.demoLabel}>{t('profile.demoMode')}</Text>
            )}
          </View>
          <TouchableOpacity style={styles.editButton} accessibilityLabel="Editar perfil">
            <Text style={styles.editIcon}>✏️</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Security */}
      <SectionTitle title={`🔐 ${t('profile.security')}`} />
      <View>
        <View style={styles.section}>
          <SettingRow
            icon="👆"
            label={t('profile.biometric')}
            rightElement={
              <Toggle
                value={user.biometricEnabled}
                onValueChange={toggleBiometric}
                accessibilityLabel={t('profile.biometric')}
              />
            }
          />
          <SettingRow icon="🔑" label={t('profile.changePassword')} onPress={handleChangePassword} />
          <SettingRow icon="🔢" label={t('profile.changePin')} onPress={() => {}} />
        </View>
      </View>

      {/* Preferences */}
      <SectionTitle title={`⚙️ ${t('profile.preferences')}`} />
      <View>
        <View style={styles.section}>
          <SettingRow
            icon="🔔"
            label={t('profile.pushNotifications')}
            rightElement={
              <Toggle
                value={user.pushEnabled}
                onValueChange={togglePush}
                accessibilityLabel={t('profile.pushNotifications')}
              />
            }
          />
          <SettingRow
            icon="👁️"
            label={t('profile.hideValuesOnOpen')}
            rightElement={
              <Toggle
                value={user.hideValuesOnOpen}
                onValueChange={toggleHideValues}
                accessibilityLabel={t('profile.hideValuesOnOpen')}
              />
            }
          />
          <SettingRow
            icon="🌐"
            label={t('profile.language')}
            value={currentLanguageLabel}
            onPress={() => setShowLanguagePicker(true)}
          />
          <SettingRow
            icon="💰"
            label={t('profile.defaultCurrency')}
            value={currentCurrencyLabel}
            onPress={() => setShowCurrencyPicker(true)}
          />
        </View>
      </View>

      {/* Connected accounts */}
      <SectionTitle title={`🏦 ${t('profile.connectedAccounts')}`} />
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
                ? t('status.connected')
                : inst.status === 'syncing'
                  ? t('status.syncing')
                  : t('status.error');

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
          <TouchableOpacity style={styles.connectButton} onPress={handleConnectBank}>
            <Text style={styles.connectButtonText}>
              {t('profile.connectOpenFinance')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ZURT Token */}
      <SectionTitle title={`📊 ${t('profile.zurtToken')}`} />
      <Card variant="elevated" delay={450}>
        <View style={styles.tokenRow}>
          <View style={styles.tokenItem}>
            <Text style={styles.tokenLabel}>{t('profile.tokenBalance')}</Text>
            <Text style={styles.tokenValue}>
              {user.zurtTokens.toLocaleString('pt-BR')} ZURT
            </Text>
          </View>
          <View style={styles.tokenItem}>
            <Text style={styles.tokenLabel}>{t('profile.revenueShare')}</Text>
            <Text style={[styles.tokenValue, { color: colors.accent }]}>
              {formatBRL(user.revenueShareReceived)}
            </Text>
          </View>
        </View>
        <View style={styles.tokenDivider} />
        <View style={styles.tokenDistribution}>
          <Text style={styles.tokenLabel}>{t('profile.nextDistribution')}</Text>
          <Text style={styles.tokenDate}>
            {user.nextDistribution ? formatDate(user.nextDistribution) : '-'}
          </Text>
        </View>
      </Card>

      {/* About */}
      <SectionTitle title={`ℹ️ ${t('profile.about')}`} />
      <View>
        <View style={styles.section}>
          <SettingRow icon="📄" label={t('profile.terms')} onPress={() => {}} />
          <SettingRow icon="🔒" label={t('profile.privacy')} onPress={() => {}} />
          <SettingRow icon="❓" label={t('profile.help')} onPress={() => {}} />
          <SettingRow icon="💬" label={t('profile.support')} onPress={() => {}} />
        </View>
      </View>

      {/* Logout */}
      <View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 {t('profile.logout')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>ZURT Wealth v1.0.0</Text>

      {/* Modals */}
      <PickerModal<Language>
        visible={showLanguagePicker}
        title={t('profile.language')}
        options={languageOptions}
        selected={language}
        onSelect={setLanguage}
        onClose={() => setShowLanguagePicker(false)}
      />
      <PickerModal<Currency>
        visible={showCurrencyPicker}
        title={t('profile.defaultCurrency')}
        options={currencyOptions}
        selected={currency}
        onSelect={setCurrency}
        onClose={() => setShowCurrencyPicker(false)}
      />
      <PasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        isDemoMode={isDemoMode}
      />
    </ScrollView>
  );
}

// ===========================================================================
// Styles
// ===========================================================================

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

  // -- Modal styles --------------------------------------------------------
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  modalOptionSelected: {
    backgroundColor: colors.accent + '15',
  },
  modalOptionFlag: {
    fontSize: 22,
    marginRight: spacing.md,
  },
  modalOptionLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  modalOptionLabelSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
  modalCheck: {
    fontSize: 18,
    color: colors.accent,
    fontWeight: '700',
  },
  modalClose: {
    marginTop: spacing.lg,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  modalCloseText: {
    fontSize: 14,
    color: colors.text.secondary,
  },

  // -- Password modal styles -----------------------------------------------
  passwordInput: {
    backgroundColor: colors.input,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.negative,
    fontSize: 13,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background,
  },
});
