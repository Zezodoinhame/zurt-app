import React, { useCallback, useState, useMemo } from 'react';
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
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { type ThemeColors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { useAuthStore } from '../../src/stores/authStore';
import { usePortfolioStore } from '../../src/stores/portfolioStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import type { Language } from '../../src/i18n/translations';
import type { Currency, ThemeMode } from '../../src/stores/settingsStore';
import { Toggle } from '../../src/components/ui/Toggle';
import { Card } from '../../src/components/ui/Card';
import { formatDate, formatCurrency } from '../../src/utils/formatters';
import { changePassword, updateUserProfile } from '../../src/services/api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WHATSAPP_SUPPORT_NUMBER = '5592991234567';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_SUPPORT_NUMBER}`;
const TERMS_URL = 'https://zurt.com.br/termos';
const PRIVACY_URL = 'https://zurt.com.br/privacidade';
const BIOMETRIC_STORAGE_KEY = 'biometric_enabled';

// ---------------------------------------------------------------------------
// Language & Currency options
// ---------------------------------------------------------------------------

const languageOptions: Array<{ key: Language; flag: string; label: string }> = [
  { key: 'pt', flag: '\u{1F1E7}\u{1F1F7}', label: 'Portugu\u00EAs' },
  { key: 'en', flag: '\u{1F1FA}\u{1F1F8}', label: 'English' },
  { key: 'zh', flag: '\u{1F1E8}\u{1F1F3}', label: '\u4E2D\u6587' },
  { key: 'ar', flag: '\u{1F1F8}\u{1F1E6}', label: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629' },
];

const currencyOptions: Array<{ key: Currency; flag: string; label: string }> = [
  { key: 'BRL', flag: '\u{1F1E7}\u{1F1F7}', label: 'BRL (R$)' },
  { key: 'USD', flag: '\u{1F1FA}\u{1F1F8}', label: 'USD ($)' },
  { key: 'EUR', flag: '\u{1F1EA}\u{1F1FA}', label: 'EUR (\u20AC)' },
];

// ---------------------------------------------------------------------------
// Theme options
// ---------------------------------------------------------------------------

const themeOptions: Array<{ key: ThemeMode; emoji: string; labelKey: string }> = [
  { key: 'dark', emoji: '\uD83C\uDF19', labelKey: 'profile.themeDark' },
  { key: 'light', emoji: '\u2600\uFE0F', labelKey: 'profile.themeLight' },
  { key: 'system', emoji: '\uD83D\uDCF1', labelKey: 'profile.themeSystem' },
];

// ---------------------------------------------------------------------------
// FAQ items
// ---------------------------------------------------------------------------

const FAQ_KEYS = [
  { q: 'profile.faqConnectBank', a: 'profile.faqConnectBankAnswer' },
  { q: 'profile.faqChangePassword', a: 'profile.faqChangePasswordAnswer' },
  { q: 'profile.faqZurtToken', a: 'profile.faqZurtTokenAnswer' },
  { q: 'profile.faqDataSecurity', a: 'profile.faqDataSecurityAnswer' },
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
  const colors = useSettingsStore((s) => s.colors);
  const styles = React.useMemo(() => createStyles(colors), [colors]);

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
  const colors = useSettingsStore((s) => s.colors);
  const styles = React.useMemo(() => createStyles(colors), [colors]);

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
  const colors = useSettingsStore((s) => s.colors);
  const styles = React.useMemo(() => createStyles(colors), [colors]);

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
                <Text style={styles.modalCheck}>{'\u2713'}</Text>
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
  const colors = useSettingsStore((s) => s.colors);
  const styles = React.useMemo(() => createStyles(colors), [colors]);

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
      setError('As senhas n\u00E3o coincidem');
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

// ---------------------------------------------------------------------------
// Edit Profile Modal
// ---------------------------------------------------------------------------

function EditProfileModal({
  visible,
  onClose,
  currentName,
  currentEmail,
  isDemoMode,
  t,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  currentName: string;
  currentEmail: string;
  isDemoMode: boolean;
  t: (key: string) => string;
  onSuccess: (updates: { name: string; email: string; initials: string }) => void;
}) {
  const colors = useSettingsStore((s) => s.colors);
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [fullName, setFullName] = useState(currentName);
  const [email, setEmail] = useState(currentEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    if (!fullName.trim()) {
      setError(t('login.nameError'));
      return;
    }
    if (isDemoMode) {
      Alert.alert('Demo', t('profile.demoUnavailable'));
      return;
    }
    setIsLoading(true);
    try {
      const updatedUser = await updateUserProfile({
        full_name: fullName.trim(),
        email: email.trim(),
      });
      onSuccess({
        name: updatedUser.name,
        email: updatedUser.email,
        initials: updatedUser.initials,
      });
      Alert.alert(t('common.ok'), t('profile.editSuccess'));
      onClose();
    } catch (err: any) {
      setError(err?.message ?? t('profile.editError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFullName(currentName);
    setEmail(currentEmail);
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
          <Text style={styles.modalTitle}>{t('profile.editProfile')}</Text>

          <Text style={styles.inputLabel}>{t('profile.fullName')}</Text>
          <TextInput
            style={styles.passwordInput}
            placeholder={t('login.yourName')}
            placeholderTextColor={colors.text.muted}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />

          <Text style={styles.inputLabel}>{t('login.email')}</Text>
          <TextInput
            style={styles.passwordInput}
            placeholder="email@exemplo.com"
            placeholderTextColor={colors.text.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
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
              <Text style={styles.saveButtonText}>{t('profile.saveProfile')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.modalClose} onPress={handleClose}>
            <Text style={styles.modalCloseText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Help / FAQ Modal
// ---------------------------------------------------------------------------

function HelpModal({
  visible,
  onClose,
  t,
}: {
  visible: boolean;
  onClose: () => void;
  t: (key: string) => string;
}) {
  const colors = useSettingsStore((s) => s.colors);
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [expanded, setExpanded] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    Haptics.selectionAsync();
    setExpanded((prev) => (prev === index ? null : index));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.helpModalContent} onStartShouldSetResponder={() => true}>
          <Text style={styles.modalTitle}>{t('profile.helpTitle')}</Text>

          <ScrollView style={styles.faqScrollView} showsVerticalScrollIndicator={false}>
            {FAQ_KEYS.map((faq, index) => (
              <View key={faq.q}>
                <TouchableOpacity
                  style={styles.faqQuestion}
                  onPress={() => toggleItem(index)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.faqQuestionText}>{t(faq.q)}</Text>
                  <Text style={styles.faqChevron}>
                    {expanded === index ? '\u2303' : '\u2304'}
                  </Text>
                </TouchableOpacity>
                {expanded === index && (
                  <View style={styles.faqAnswer}>
                    <Text style={styles.faqAnswerText}>{t(faq.a)}</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>{t('common.close')}</Text>
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
  const colors = useSettingsStore((s) => s.colors);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const styles = React.useMemo(() => createStyles(colors), [colors]);

  // Modal states
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const currentLanguageLabel = languageOptions.find((l) => l.key === language)?.label ?? 'Portugu\u00EAs';
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

  // -- Biometric toggle with actual authentication --------------------------
  const toggleBiometric = useCallback(
    async (value: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (value) {
        // Enabling: verify device supports biometrics first
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (!hasHardware || !isEnrolled) {
          Alert.alert(t('common.error'), t('biometric.notAvailable'));
          return;
        }

        // Authenticate to confirm
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: t('biometric.enablePrompt'),
          cancelLabel: t('common.cancel'),
          disableDeviceFallback: false,
        });

        if (!result.success) return;

        // Save preference
        await AsyncStorage.setItem(BIOMETRIC_STORAGE_KEY, 'true');
        updateUser({ biometricEnabled: true });
      } else {
        // Disabling: just remove preference
        await AsyncStorage.removeItem(BIOMETRIC_STORAGE_KEY);
        updateUser({ biometricEnabled: false });
      }
    },
    [updateUser, t]
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

  // -- Theme handler --------------------------------------------------------
  const handleThemeSelect = useCallback(
    (selected: ThemeMode) => {
      Haptics.selectionAsync();
      setTheme(selected);
    },
    [setTheme]
  );

  // -- About section handlers -----------------------------------------------
  const handleTerms = useCallback(() => {
    Linking.openURL(TERMS_URL).catch(() => {
      Alert.alert(t('profile.terms'), t('profile.termsPlaceholder'));
    });
  }, [t]);

  const handlePrivacy = useCallback(() => {
    Linking.openURL(PRIVACY_URL).catch(() => {
      Alert.alert(t('profile.privacy'), t('profile.privacyPlaceholder'));
    });
  }, [t]);

  const handleHelp = useCallback(() => {
    setShowHelpModal(true);
  }, []);

  const handleSupport = useCallback(() => {
    Linking.openURL(WHATSAPP_URL).catch(() => {
      Alert.alert(t('common.error'), t('profile.demoUnavailable'));
    });
  }, [t]);

  // -- Edit profile handler -------------------------------------------------
  const handleEditProfile = useCallback(() => {
    if (isDemoMode) {
      Alert.alert('Demo', t('profile.demoUnavailable'));
      return;
    }
    setShowEditProfileModal(true);
  }, [isDemoMode, t]);

  const handleEditProfileSuccess = useCallback(
    (updates: { name: string; email: string; initials: string }) => {
      updateUser(updates);
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
          <TouchableOpacity
            style={styles.editButton}
            accessibilityLabel={t('profile.editProfile')}
            onPress={handleEditProfile}
          >
            <Text style={styles.editIcon}>{'\u270F\uFE0F'}</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Security */}
      <SectionTitle title={`\uD83D\uDD10 ${t('profile.security')}`} />
      <View>
        <View style={styles.section}>
          <SettingRow
            icon={'\uD83D\uDC46'}
            label={t('profile.biometric')}
            rightElement={
              <Toggle
                value={user.biometricEnabled}
                onValueChange={toggleBiometric}
                accessibilityLabel={t('profile.biometric')}
              />
            }
          />
          <SettingRow icon={'\uD83D\uDD11'} label={t('profile.changePassword')} onPress={handleChangePassword} />
        </View>
      </View>

      {/* Preferences */}
      <SectionTitle title={`\u2699\uFE0F ${t('profile.preferences')}`} />
      <View>
        <View style={styles.section}>
          <SettingRow
            icon={'\uD83D\uDD14'}
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
            icon={'\uD83D\uDC41\uFE0F'}
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
            icon={'\uD83C\uDF10'}
            label={t('profile.language')}
            value={currentLanguageLabel}
            onPress={() => setShowLanguagePicker(true)}
          />
          <SettingRow
            icon={'\uD83D\uDCB0'}
            label={t('profile.defaultCurrency')}
            value={currentCurrencyLabel}
            onPress={() => setShowCurrencyPicker(true)}
          />
        </View>
      </View>

      {/* Appearance (Theme Selector) */}
      <SectionTitle title={`\uD83C\uDFA8 ${t('profile.appearance')}`} />
      <View>
        <View style={styles.section}>
          <View style={styles.themeRow}>
            {themeOptions.map((opt) => {
              const isSelected = theme === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.themeButton,
                    isSelected && styles.themeButtonSelected,
                  ]}
                  onPress={() => handleThemeSelect(opt.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.themeEmoji}>{opt.emoji}</Text>
                  <Text
                    style={[
                      styles.themeLabel,
                      isSelected && styles.themeLabelSelected,
                    ]}
                  >
                    {t(opt.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Connected accounts */}
      <SectionTitle title={`\uD83C\uDFE6 ${t('profile.connectedAccounts')}`} />
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
      <SectionTitle title={`\uD83D\uDCCA ${t('profile.zurtToken')}`} />
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
              {formatCurrency(user.revenueShareReceived, currency)}
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

      {/* Report */}
      <SectionTitle title={`\uD83D\uDCCA ${t('report.title')}`} />
      <View>
        <View style={styles.section}>
          <SettingRow
            icon={'\uD83D\uDCC4'}
            label={t('report.title')}
            value={t('report.subtitle')}
            onPress={() => router.push('/report')}
          />
        </View>
      </View>

      {/* About */}
      <SectionTitle title={`\u2139\uFE0F ${t('profile.about')}`} />
      <View>
        <View style={styles.section}>
          <SettingRow icon={'\uD83D\uDCC4'} label={t('profile.terms')} onPress={handleTerms} />
          <SettingRow icon={'\uD83D\uDD12'} label={t('profile.privacy')} onPress={handlePrivacy} />
          <SettingRow icon={'\u2753'} label={t('profile.help')} onPress={handleHelp} />
          <SettingRow icon={'\uD83D\uDCAC'} label={t('profile.support')} onPress={handleSupport} />
        </View>
      </View>

      {/* Logout */}
      <View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>{'\uD83D\uDEAA'} {t('profile.logout')}</Text>
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
      <EditProfileModal
        visible={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        currentName={user.name}
        currentEmail={user.email}
        isDemoMode={isDemoMode}
        t={t}
        onSuccess={handleEditProfileSuccess}
      />
      <HelpModal
        visible={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        t={t}
      />
    </ScrollView>
  );
}

// ===========================================================================
// Styles
// ===========================================================================

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
    color: colors.text.inverse,
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

  // -- Theme selector styles ------------------------------------------------
  themeRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  themeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  themeButtonSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '15',
  },
  themeEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  themeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  themeLabelSelected: {
    color: colors.accent,
    fontWeight: '700',
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
  helpModalContent: {
    width: '90%',
    maxHeight: '75%',
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

  // -- Password / edit modal styles ----------------------------------------
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
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

  // -- FAQ styles ----------------------------------------------------------
  faqScrollView: {
    maxHeight: 400,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border + '50',
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  faqChevron: {
    fontSize: 16,
    color: colors.text.muted,
    marginLeft: spacing.sm,
  },
  faqAnswer: {
    paddingVertical: spacing.md,
    paddingLeft: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border + '50',
  },
  faqAnswerText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});
