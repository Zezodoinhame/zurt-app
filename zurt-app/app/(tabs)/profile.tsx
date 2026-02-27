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
import { usePushStore, type PushPreferences } from '../../src/stores/pushStore';
import type { Language } from '../../src/i18n/translations';
import type { Currency, ThemeMode, IconStyle, AccentColor } from '../../src/stores/settingsStore';
import { ACCENT_COLORS } from '../../src/stores/settingsStore';
import { useCardsStore } from '../../src/stores/cardsStore';
import { generatePatrimonialReport } from '../../src/services/reportGenerator';
import { Toggle } from '../../src/components/ui/Toggle';
import { Card } from '../../src/components/ui/Card';
import { UserAvatar, AVATAR_CHARACTER_LIST, useAvatarState, type AvatarPresetId } from '../../src/components/ui/UserAvatar';
import { AVATAR_ICON_MAP } from '../../src/components/ui/AvatarIcons';
import { formatDate, formatCurrency } from '../../src/utils/formatters';
import { changePassword, updateUserProfile } from '../../src/services/api';
import { usePlanStore, type PlanTier } from '../../src/stores/planStore';
import { UsageBadge } from '../../src/components/shared/UsageBadge';
import { PLANS, PLAN_HIERARCHY, type PlanId } from '../../src/config/plans';
import { AppIcon, type AppIconName } from '../../src/hooks/useIcon';
import { BankLogo } from '../../src/components/icons/BankLogo';
import * as ImagePicker from 'expo-image-picker';
import { getAnalyticsOptOut, setAnalyticsOptOut } from '../../src/services/analytics';
import { notificationService, type LocalNotifPreferences } from '../../src/services/notificationService';

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
  { key: 'pt', flag: '\u{1F1E7}\u{1F1F7}', label: 'Português' },
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

const iconStyleOptions: Array<{ key: IconStyle; emoji: string; labelKey: string }> = [
  { key: 'icons', emoji: '\uD83C\uDFA8', labelKey: 'profile.iconStyleIcons' },
  { key: 'emoji', emoji: '\uD83D\uDE0A', labelKey: 'profile.iconStyleEmoji' },
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
  iconName: AppIconName;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

function SettingRow({ iconName, label, value, onPress, rightElement, danger }: SettingRowProps) {
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
      <View style={styles.settingIcon}><AppIcon name={iconName} size={16} color={colors.text.secondary} /></View>
      <Text style={[styles.settingLabel, danger && styles.dangerText]}>{label}</Text>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {rightElement}
      {onPress && !rightElement && (
        <AppIcon name="chevron" size={20} color={colors.text.muted} />
      )}
    </TouchableOpacity>
  );
}

function SectionTitle({ title, iconName }: { title: string; iconName?: AppIconName }) {
  const colors = useSettingsStore((s) => s.colors);
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.sectionTitleRow}>
      {iconName && <AppIcon name={iconName} size={18} color={colors.text.secondary} />}
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
  const { t } = useSettingsStore();
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
            <Text style={styles.modalCloseText}>{t('common.close')}</Text>
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
  const { t } = useSettingsStore();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    if (!currentPw || !newPw || !confirmPw) {
      setError(t('password.allFieldsRequired'));
      return;
    }
    if (newPw !== confirmPw) {
      setError(t('password.mismatch'));
      return;
    }
    if (newPw.length < 6) {
      setError(t('password.minLength'));
      return;
    }
    setIsLoading(true);
    try {
      await changePassword(currentPw, newPw);
      Alert.alert(t('common.ok'), t('password.success'));
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      onClose();
    } catch (err: any) {
      setError(t('password.error'));
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
          <Text style={styles.modalTitle}>{t('password.title')}</Text>

          <TextInput
            style={styles.passwordInput}
            placeholder={t('password.current')}
            placeholderTextColor={colors.text.muted}
            secureTextEntry
            value={currentPw}
            onChangeText={setCurrentPw}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.passwordInput}
            placeholder={t('password.new')}
            placeholderTextColor={colors.text.muted}
            secureTextEntry
            value={newPw}
            onChangeText={setNewPw}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.passwordInput}
            placeholder={t('password.confirm')}
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
              <Text style={styles.saveButtonText}>{t('password.save')}</Text>
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
  avatarState,
}: {
  visible: boolean;
  onClose: () => void;
  currentName: string;
  currentEmail: string;
  isDemoMode: boolean;
  t: (key: string) => string;
  onSuccess: (updates: { name: string; email: string; initials: string }) => void;
  avatarState: ReturnType<typeof useAvatarState>;
}) {
  const colors = useSettingsStore((s) => s.colors);
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [fullName, setFullName] = useState(currentName);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    if (!fullName.trim()) {
      setError(t('login.nameError'));
      return;
    }
    if (isDemoMode) {
      Alert.alert(t('common.demo'), t('profile.demoUnavailable'));
      return;
    }
    setIsLoading(true);
    try {
      const updatedUser = await updateUserProfile({
        full_name: fullName.trim(),
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

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('profile.photoPermission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      avatarState.saveCustomUri(uri);
      avatarState.savePresetId(null);
    }
  };

  const handleSelectPreset = (id: AvatarPresetId) => {
    avatarState.savePresetId(id);
    avatarState.saveCustomUri(null);
  };

  const handleClose = () => {
    setFullName(currentName);
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
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.modalContent, { width: '90%' }]} onStartShouldSetResponder={() => true}>
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
            <View style={[styles.passwordInput, { backgroundColor: colors.border + '30' }]}>
              <Text style={{ color: colors.text.muted, fontSize: 14 }}>{currentEmail}</Text>
            </View>

            {/* Avatar selection */}
            <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>{t('profile.profilePhoto')}</Text>

            {/* Photo upload */}
            <TouchableOpacity style={styles.uploadPhotoBtn} onPress={handlePickPhoto} activeOpacity={0.7}>
              <AppIcon name="person" size={16} color={colors.accent} />
              <Text style={styles.uploadPhotoText}>{t('profile.uploadPhoto')}</Text>
            </TouchableOpacity>

            {/* Character avatar grid — 4x4 */}
            <View style={styles.avatarGrid}>
              {AVATAR_CHARACTER_LIST.map((char) => {
                const isSelected = avatarState.presetId === char.id && !avatarState.customUri;
                const AvatarComp = AVATAR_ICON_MAP[char.id];
                return (
                  <TouchableOpacity
                    key={char.id}
                    style={styles.avatarPresetItem}
                    onPress={() => handleSelectPreset(char.id)}
                    activeOpacity={0.7}
                  >
                    <AvatarComp size={60} selected={isSelected} />
                    {isSelected && (
                      <Text style={[styles.avatarPresetLabel, { color: colors.accent }]}>
                        {t(char.labelKey)}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

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
        </ScrollView>
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
  const iconStyle = useSettingsStore((s) => s.iconStyle);
  const setIconStyle = useSettingsStore((s) => s.setIconStyle);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const setAccentColor = useSettingsStore((s) => s.setAccentColor);
  const avatarState = useAvatarState();
  const { cards } = useCardsStore();
  const planTier = usePlanStore((s) => s.plan);
  const isAdminUser = usePlanStore((s) => s.isAdmin());
  const allOverrides = usePlanStore((s) => s.getAllOverrides());
  const setPlanOverride = usePlanStore((s) => s.setPlanOverride);
  const removePlanOverride = usePlanStore((s) => s.removePlanOverride);
  const planUsage = usePlanStore((s) => s.usage);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [analyticsOptOut, setAnalyticsOptOutState] = useState(false);
  const [localNotifPrefs, setLocalNotifPrefs] = useState<LocalNotifPreferences>({
    syncReminder: true,
    weeklySummary: true,
    dueDates: true,
    marketAlerts: true,
  });

  // Load analytics opt-out, PIN status, and local notification prefs
  React.useEffect(() => {
    getAnalyticsOptOut().then(setAnalyticsOptOutState);
    notificationService.loadPreferences().then(setLocalNotifPrefs);
  }, []);

  const {
    permissionStatus,
    preferences: pushPreferences,
    registerForPushNotifications,
    unregisterPushToken,
    setTypePreference,
  } = usePushStore();

  const styles = React.useMemo(() => createStyles(colors), [colors]);

  // Modal states
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAddTesterModal, setShowAddTesterModal] = useState(false);
  const [newTesterEmail, setNewTesterEmail] = useState('');
  const [newTesterPlan, setNewTesterPlan] = useState<PlanTier>('pro');

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
      Alert.alert(t('common.demo'), t('profile.demoUnavailable'));
      return;
    }
    setShowPasswordModal(true);
  }, [isDemoMode, t]);

  const handleConnectBank = useCallback(() => {
    if (isDemoMode) {
      Alert.alert(t('common.demo'), t('profile.demoUnavailable'));
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

  const toggleAnalyticsOptOut = useCallback(
    async (value: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setAnalyticsOptOutState(value);
      await setAnalyticsOptOut(value);
    },
    []
  );

  const togglePush = useCallback(
    (value: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updateUser({ pushEnabled: value });
      if (value) {
        registerForPushNotifications();
      } else {
        unregisterPushToken();
      }
    },
    [updateUser, registerForPushNotifications, unregisterPushToken]
  );

  const togglePushType = useCallback(
    (type: keyof PushPreferences, value: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTypePreference(type, value);
    },
    [setTypePreference]
  );

  const toggleLocalNotif = useCallback(
    async (key: keyof LocalNotifPreferences, value: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const updated = { ...localNotifPrefs, [key]: value };
      setLocalNotifPrefs(updated);
      await notificationService.savePreferences(updated);
      // Re-schedule recurring notifications with updated prefs
      notificationService.rescheduleAll();
    },
    [localNotifPrefs]
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

  // -- Icon style handler ---------------------------------------------------
  const handleIconStyleSelect = useCallback(
    (selected: IconStyle) => {
      Haptics.selectionAsync();
      setIconStyle(selected);
    },
    [setIconStyle]
  );

  // -- Accent color handler -------------------------------------------------
  const handleAccentColorSelect = useCallback(
    (selected: AccentColor) => {
      Haptics.selectionAsync();
      setAccentColor(selected);
    },
    [setAccentColor]
  );

  // -- PDF report handler ---------------------------------------------------
  const handleGenerateReport = useCallback(async () => {
    if (!user || isExportingPdf) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsExportingPdf(true);
    try {
      const { summary, institutions: insts, allocations: allocs, assets, insights: portfolioInsights } = usePortfolioStore.getState();
      const { dashboardTransactions } = useCardsStore.getState();
      if (!summary) {
        Alert.alert(t('common.error'), t('report.error'));
        return;
      }
      await generatePatrimonialReport(
        { summary, institutions: insts, allocations: allocs, cards, assets, transactions: dashboardTransactions, insights: portfolioInsights },
        user,
        accentColor,
      );
    } catch {
      Alert.alert(t('common.error'), t('report.error'));
    } finally {
      setIsExportingPdf(false);
    }
  }, [user, cards, accentColor, isExportingPdf, t]);

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
      Alert.alert(t('common.demo'), t('profile.demoUnavailable'));
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

  // -- Admin handlers -------------------------------------------------------
  const handleAddTester = useCallback(async () => {
    const email = newTesterEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await setPlanOverride(email, newTesterPlan);
    setNewTesterEmail('');
    setNewTesterPlan('pro');
    setShowAddTesterModal(false);
  }, [newTesterEmail, newTesterPlan, setPlanOverride]);

  const handleRemoveTester = useCallback(async (email: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Remover tester', `Remover override de ${email}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await removePlanOverride(email);
        },
      },
    ]);
  }, [removePlanOverride]);

  if (!user) return null;

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Profile Header ── */}
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={handleEditProfile} activeOpacity={0.8}>
          <UserAvatar
            size={88}
            initials={user.initials}
            customUri={avatarState.customUri}
            presetId={avatarState.presetId}
            accentColor={colors.accent}
          />
        </TouchableOpacity>
        <Text style={styles.headerName}>{user.name}</Text>
        <Text style={styles.headerEmail}>{user.email}</Text>
        <View style={[styles.planBadge, { backgroundColor: colors.accent + '20', borderColor: colors.accent + '40' }]}>
          <Text style={[styles.planBadgeText, { color: colors.accent }]}>
            {isDemoMode ? t('profile.demoMode') : t(`plan.${planTier}` as any)}
          </Text>
        </View>
      </View>

      {/* ── Conta ── */}
      <SectionTitle title={t('profile.accountSection')} iconName="person" />
      <View>
        <View style={styles.section}>
          <SettingRow iconName="person" label={t('profile.editProfile')} onPress={handleEditProfile} />
          <SettingRow iconName="password" label={t('profile.changePassword')} onPress={handleChangePassword} />
          <SettingRow
            iconName="biometric"
            label={t('profile.biometric')}
            rightElement={
              <Toggle
                value={user.biometricEnabled}
                onValueChange={toggleBiometric}
                accessibilityLabel={t('profile.biometric')}
              />
            }
          />
        </View>
      </View>

      {/* ── Preferências ── */}
      <SectionTitle title={t('profile.preferences')} iconName="settings" />
      <View>
        <View style={styles.section}>
          <SettingRow
            iconName="globe"
            label={t('profile.language')}
            value={currentLanguageLabel}
            onPress={() => setShowLanguagePicker(true)}
          />

          {/* Theme selector */}
          <View style={styles.inlineLabel}>
            <View style={styles.settingIcon}><AppIcon name="theme" size={16} color={colors.text.secondary} /></View>
            <Text style={styles.settingLabel}>{t('profile.appearance')}</Text>
          </View>
          <View style={styles.themeRow}>
            {themeOptions.map((opt) => {
              const isSelected = theme === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.themeButton, isSelected && styles.themeButtonSelected]}
                  onPress={() => handleThemeSelect(opt.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.themeEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.themeLabel, isSelected && styles.themeLabelSelected]}>
                    {t(opt.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Accent color */}
          <Text style={styles.iconStyleLabel}>{t('profile.accentColor')}</Text>
          <View style={styles.accentColorRow}>
            {ACCENT_COLORS.map((opt) => {
              const isSelected = accentColor === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.accentColorButton, { borderColor: isSelected ? opt.key : colors.border }]}
                  onPress={() => handleAccentColorSelect(opt.key)}
                  activeOpacity={0.7}
                  accessibilityLabel={t(opt.label)}
                >
                  <View style={[styles.accentColorSwatch, { backgroundColor: opt.key }]} />
                  {isSelected && (
                    <Text style={[styles.accentColorCheck, { color: opt.key }]}>{'\u2713'}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <SettingRow
            iconName="wallet"
            label={t('profile.defaultCurrency')}
            value={currentCurrencyLabel}
            onPress={() => setShowCurrencyPicker(true)}
          />

          {/* Icon style */}
          <Text style={styles.iconStyleLabel}>{t('profile.iconStyle')}</Text>
          <View style={styles.themeRow}>
            {iconStyleOptions.map((opt) => {
              const isSelected = iconStyle === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.themeButton, isSelected && styles.themeButtonSelected]}
                  onPress={() => handleIconStyleSelect(opt.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.themeEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.themeLabel, isSelected && styles.themeLabelSelected]}>
                    {t(opt.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Notifications & privacy toggles */}
      <View>
        <View style={styles.section}>
          <SettingRow
            iconName="push"
            label={t('profile.pushNotifications')}
            rightElement={
              <Toggle
                value={user.pushEnabled}
                onValueChange={togglePush}
                accessibilityLabel={t('profile.pushNotifications')}
              />
            }
          />
          {user.pushEnabled && permissionStatus === 'denied' && (
            <View style={styles.permissionWarning}>
              <AppIcon name="warning" size={14} color={colors.warning} />
              <Text style={styles.permissionWarningText}>{t('push.permissionDenied')}</Text>
            </View>
          )}
          {user.pushEnabled && (
            <>
              <SettingRow
                iconName="token"
                label={t('push.distribution')}
                rightElement={<Toggle value={pushPreferences.distribution} onValueChange={(v) => togglePushType('distribution', v)} accessibilityLabel={t('push.distribution')} />}
              />
              <SettingRow
                iconName="warning"
                label={t('push.maturity')}
                rightElement={<Toggle value={pushPreferences.maturity} onValueChange={(v) => togglePushType('maturity', v)} accessibilityLabel={t('push.maturity')} />}
              />
              <SettingRow
                iconName="card"
                label={t('push.invoice')}
                rightElement={<Toggle value={pushPreferences.invoice} onValueChange={(v) => togglePushType('invoice', v)} accessibilityLabel={t('push.invoice')} />}
              />
              <SettingRow
                iconName="idea"
                label={t('push.insight')}
                rightElement={<Toggle value={pushPreferences.insight} onValueChange={(v) => togglePushType('insight', v)} accessibilityLabel={t('push.insight')} />}
              />
              <SettingRow
                iconName="notification"
                label={t('push.system')}
                rightElement={<Toggle value={pushPreferences.system} onValueChange={(v) => togglePushType('system', v)} accessibilityLabel={t('push.system')} />}
              />
            </>
          )}

          {/* Local notification toggles */}
          <Text style={styles.subSectionLabel}>{t('push.localSection')}</Text>
          <SettingRow
            iconName="sync"
            label={t('push.syncReminder')}
            rightElement={<Toggle value={localNotifPrefs.syncReminder} onValueChange={(v) => toggleLocalNotif('syncReminder', v)} accessibilityLabel={t('push.syncReminder')} />}
          />
          <SettingRow
            iconName="chart"
            label={t('push.weeklySummary')}
            rightElement={<Toggle value={localNotifPrefs.weeklySummary} onValueChange={(v) => toggleLocalNotif('weeklySummary', v)} accessibilityLabel={t('push.weeklySummary')} />}
          />
          <SettingRow
            iconName="card"
            label={t('push.dueDates')}
            rightElement={<Toggle value={localNotifPrefs.dueDates} onValueChange={(v) => toggleLocalNotif('dueDates', v)} accessibilityLabel={t('push.dueDates')} />}
          />
          <SettingRow
            iconName="trending"
            label={t('push.marketAlerts')}
            rightElement={<Toggle value={localNotifPrefs.marketAlerts} onValueChange={(v) => toggleLocalNotif('marketAlerts', v)} accessibilityLabel={t('push.marketAlerts')} />}
          />

          <SettingRow
            iconName="eye"
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
            iconName="chart"
            label={t('analytics.optOut')}
            rightElement={
              <Toggle
                value={analyticsOptOut}
                onValueChange={toggleAnalyticsOptOut}
                accessibilityLabel={t('analytics.optOut')}
              />
            }
          />
        </View>
      </View>

      {/* ── Assinatura ── */}
      <SectionTitle title={t('profile.subscription')} iconName="token" />
      <Card variant="elevated" delay={300}>
        <View style={styles.subscriptionHeader}>
          <View>
            <Text style={styles.subscriptionPlanLabel}>{t('profile.currentPlan')}</Text>
            <Text style={styles.subscriptionPlanName}>
              {isDemoMode ? t('profile.demoMode') : t(`plan.${planTier}` as any)}
            </Text>
          </View>
          {!isDemoMode && planTier !== 'enterprise' && (
            <TouchableOpacity
              style={[styles.upgradeButton, { backgroundColor: colors.accent }]}
              onPress={() => router.push('/plans' as any)}
              activeOpacity={0.7}
            >
              <Text style={[styles.upgradeButtonText, { color: colors.background }]}>
                {t('profile.upgradePlan')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {/* Usage badges */}
        <View style={styles.tokenDivider} />
        <View style={styles.usageBadgesRow}>
          <UsageBadge feature="aiQueries" />
          <UsageBadge feature="connections" />
        </View>
        <View style={[styles.usageBadgesRow, { marginTop: spacing.sm }]}>
          <UsageBadge feature="reports" />
          <UsageBadge feature="alerts" />
        </View>
        <View style={styles.tokenDivider} />
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

      {/* ── Admin Panel (visible only to admins) ── */}
      {isAdminUser && (
        <>
          <SectionTitle title="Administracao" iconName="settings" />
          <Card variant="elevated" delay={350}>
            {/* Admin header */}
            <View style={styles.adminHeader}>
              <Text style={styles.adminTitle}>Gerenciar Testers</Text>
              <View style={[styles.adminBadge, { backgroundColor: colors.warning + '20' }]}>
                <Text style={[styles.adminBadgeText, { color: colors.warning }]}>ADMIN</Text>
              </View>
            </View>

            {/* Override list */}
            {Object.entries(allOverrides).map(([email, plan]) => {
              const planConfig = PLANS[plan as PlanId];
              const planColor = planConfig?.color || colors.accent;
              const planName = planConfig?.name || plan;
              return (
                <View key={email} style={styles.testerRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.testerEmail} numberOfLines={1}>{email}</Text>
                  </View>
                  <View style={[styles.testerPlanBadge, { backgroundColor: planColor + '20', borderColor: planColor + '40' }]}>
                    <Text style={[styles.testerPlanText, { color: planColor }]}>{planName}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveTester(email)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.testerRemove}
                  >
                    <AppIcon name="close" size={16} color={colors.negative} />
                  </TouchableOpacity>
                </View>
              );
            })}

            {/* Add tester button */}
            <TouchableOpacity
              style={styles.addTesterButton}
              onPress={() => setShowAddTesterModal(true)}
              activeOpacity={0.7}
            >
              <AppIcon name="add" size={16} color={colors.accent} />
              <Text style={[styles.addTesterText, { color: colors.accent }]}>Adicionar tester</Text>
            </TouchableOpacity>

            {/* Current user usage */}
            <View style={styles.tokenDivider} />
            <Text style={styles.adminUsageTitle}>Seu uso hoje</Text>
            <View style={styles.adminUsageRow}>
              <Text style={styles.adminUsageItem}>IA: {planUsage.aiQueriesToday}</Text>
              <Text style={styles.adminUsageItem}>Relatorios: {planUsage.reportsThisMonth}</Text>
              <Text style={styles.adminUsageItem}>Conexoes: {planUsage.connectionsCount}</Text>
            </View>
          </Card>
        </>
      )}

      {/* Connected accounts */}
      <SectionTitle title={t('profile.connectedAccounts')} iconName="bank" />
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
                <View style={{ marginRight: spacing.md }}>
                  <BankLogo institutionName={inst.name} imageUrl={inst.imageUrl} size={28} />
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

      {/* Tools */}
      <SectionTitle title={t('profile.tools')} iconName="tools" />
      <View>
        <View style={styles.section}>
          <SettingRow
            iconName="taxes"
            label={t('taxes.title')}
            onPress={() => router.push('/taxes')}
          />
          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleGenerateReport}
            activeOpacity={0.7}
            disabled={isExportingPdf}
          >
            <View style={styles.settingIcon}>
              {isExportingPdf
                ? <ActivityIndicator size="small" color={colors.accent} />
                : <AppIcon name="report" size={16} color={colors.accent} />
              }
            </View>
            <Text style={[styles.settingLabel, { color: colors.accent }]}>{t('profile.generateReport')}</Text>
            <AppIcon name="chevron" size={20} color={colors.text.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Sobre ── */}
      <SectionTitle title={t('profile.about')} iconName="info" />
      <View>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}><AppIcon name="info" size={16} color={colors.text.secondary} /></View>
            <Text style={styles.settingLabel}>{t('profile.appVersion')}</Text>
            <Text style={styles.settingValue}>v1.0.0</Text>
          </View>
          <SettingRow iconName="report" label={t('profile.terms')} onPress={handleTerms} />
          <SettingRow iconName="security" label={t('profile.privacy')} onPress={handlePrivacy} />
          <SettingRow iconName="info" label={t('profile.help')} onPress={handleHelp} />
          <SettingRow iconName="send" label={t('profile.support')} onPress={handleSupport} />
        </View>
      </View>

      {/* Admin */}
      <View style={{ marginTop: 8 }}>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/admin/login')}
            activeOpacity={0.7}
          >
            <View style={styles.settingIcon}>
              <AppIcon name="shield" size={16} color={colors.text.muted} />
            </View>
            <Text style={[styles.settingLabel, { color: colors.text.muted }]}>Administracao</Text>
            <AppIcon name="chevron" size={20} color={colors.text.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout */}
      <View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppIcon name="logout" size={15} color={colors.negative} />
            <Text style={styles.logoutText}>{t('profile.logout')}</Text>
          </View>
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
        avatarState={avatarState}
      />
      <HelpModal
        visible={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        t={t}
      />

      {/* Add Tester Modal */}
      <Modal
        visible={showAddTesterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddTesterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddTesterModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Adicionar Tester</Text>

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.passwordInput}
              value={newTesterEmail}
              onChangeText={setNewTesterEmail}
              placeholder="email@exemplo.com"
              placeholderTextColor={colors.text.muted}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Plano</Text>
            <View style={styles.adminPlanSelector}>
              {(['basic', 'pro', 'unlimited', 'enterprise'] as PlanTier[]).map((planId) => {
                const cfg = PLANS[planId as PlanId];
                const isSelected = newTesterPlan === planId;
                return (
                  <TouchableOpacity
                    key={planId}
                    style={[
                      styles.adminPlanOption,
                      isSelected && { borderColor: cfg?.color || colors.accent, backgroundColor: (cfg?.color || colors.accent) + '15' },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setNewTesterPlan(planId);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.adminPlanOptionText,
                      isSelected && { color: cfg?.color || colors.accent, fontWeight: '700' },
                    ]}>
                      {cfg?.name || planId}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.saveButton, !newTesterEmail.includes('@') && styles.saveButtonDisabled]}
              onPress={handleAddTester}
              disabled={!newTesterEmail.includes('@')}
            >
              <Text style={styles.saveButtonText}>Salvar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalClose} onPress={() => setShowAddTesterModal(false)}>
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  // ── Profile Header (centered) ──
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  headerName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
    marginTop: spacing.md,
    letterSpacing: -0.3,
  },
  headerEmail: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
  },
  planBadge: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // ── Inline section label (theme inside preferences) ──
  inlineLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border + '50',
  },

  // ── Subscription ──
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  subscriptionPlanLabel: {
    fontSize: 11,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subscriptionPlanName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  upgradeButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  upgradeButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  subSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
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
    marginRight: spacing.md,
    width: 28,
    height: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
  dangerText: {
    color: colors.negative,
  },
  permissionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.warning + '10',
    gap: spacing.sm,
  },
  permissionWarningText: {
    flex: 1,
    fontSize: 12,
    color: colors.warning,
    lineHeight: 16,
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
    color: colors.background,
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
  usageBadgesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  iconStyleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  accentColorRow: {
    flexDirection: 'row',
    padding: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  accentColorButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentColorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  accentColorCheck: {
    position: 'absolute',
    fontSize: 14,
    fontWeight: '800',
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

  // -- Avatar styles -------------------------------------------------------
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  uploadPhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  avatarPresetItem: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  avatarPresetLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 3,
    textAlign: 'center',
  },

  // -- Admin styles --------------------------------------------------------
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  adminTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  adminBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  testerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border + '50',
    gap: spacing.sm,
  },
  testerEmail: {
    fontSize: 13,
    color: colors.text.primary,
  },
  testerPlanBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  testerPlanText: {
    fontSize: 11,
    fontWeight: '700',
  },
  testerRemove: {
    padding: spacing.xs,
  },
  addTesterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderStyle: 'dashed',
    marginTop: spacing.sm,
  },
  addTesterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  adminUsageTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  adminUsageRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  adminUsageItem: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  adminPlanSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  adminPlanOption: {
    flex: 1,
    minWidth: '40%',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  adminPlanOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
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
