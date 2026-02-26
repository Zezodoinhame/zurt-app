import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { type ThemeColors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { useAuthStore } from '../../src/stores/authStore';
import { Button } from '../../src/components/ui/Button';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { Input } from '../../src/components/ui/Input';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveToken } from '../../src/services/api';
import { logger } from '../../src/utils/logger';

const PLAN_STORAGE_KEY = '@zurt:selected_plan';


WebBrowser.maybeCompleteAuthSession();

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://zurt.com.br/api';

// Google web client ID — used as clientId fallback on all platforms
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/userinfo/v2/me';

// Expo Go proxy redirect — the only URI that works with Web Client ID in Expo Go
const GOOGLE_REDIRECT_URI = 'https://auth.expo.io/@zurt/zurt-app';

type Mode = 'login' | 'register';

/** Check if user has selected a plan — if not, redirect to onboarding flow */
async function getPostAuthRoute(): Promise<'/(tabs)' | '/onboarding'> {
  try {
    const plan = await AsyncStorage.getItem(PLAN_STORAGE_KEY);
    if (plan) return '/(tabs)';
  } catch { /* ignore */ }
  return '/onboarding';
}

// ===========================================================================
// LoginScreen
// ===========================================================================

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, register, loginDemo, restoreSession, isLoading, error: storeError, clearError } = useAuthStore();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [mode, setMode] = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleAvailable] = useState(true);

  const displayError = error || storeError || '';

  // -------------------------------------------------------------------------
  // Google Auth via expo-auth-session — uses useIdTokenAuthRequest.
  // Hardcoded auth.expo.io proxy URI — required for Expo Go with Web Client ID.
  // -------------------------------------------------------------------------
  logger.log('[ZURT Auth] Google redirectUri:', GOOGLE_REDIRECT_URI);

  let googleRequest: ReturnType<typeof Google.useIdTokenAuthRequest>[0] = null;
  let googleResponse: ReturnType<typeof Google.useIdTokenAuthRequest>[1] = null;
  let googlePromptAsync: ReturnType<typeof Google.useIdTokenAuthRequest>[2] = async () => ({ type: 'dismiss' as const, url: '' });

  try {
    const [req, res, prompt] = Google.useIdTokenAuthRequest({
      clientId: GOOGLE_WEB_CLIENT_ID,
      webClientId: GOOGLE_WEB_CLIENT_ID,
      redirectUri: GOOGLE_REDIRECT_URI,
    });
    googleRequest = req;
    googleResponse = res;
    googlePromptAsync = prompt;
  } catch (err: any) {
    logger.log('[ZURT Auth] Google hook init error:', err?.message ?? err);
  }

  // Handle Google OAuth response
  useEffect(() => {
    if (!googleResponse) return;
    logger.log('[ZURT Auth] Google OAuth response type:', googleResponse.type);

    if (googleResponse.type === 'success') {
      handleGoogleAuth(googleResponse);
    } else if (googleResponse.type === 'error') {
      const errMsg = (googleResponse as any).error?.message
        || (googleResponse as any).params?.error_description
        || (googleResponse as any).params?.error
        || 'Unknown';
      console.error('Google auth error:', errMsg);
      logger.log('[ZURT Auth] Google OAuth error details:', errMsg);
      setGoogleLoading(false);
      Alert.alert(
        t('common.error'),
        t('login.googleAuthError'),
        [{ text: 'OK' }],
      );
    } else {
      // cancel / dismiss
      logger.log('[ZURT Auth] Google OAuth dismissed:', googleResponse.type);
      setGoogleLoading(false);
    }
  }, [googleResponse]);

  const handleGoogleAuth = async (response: any) => {
    try {
      // Try to get id_token from response params
      const idToken: string | undefined =
        response.params?.id_token ||
        response.authentication?.idToken;
      const accessToken: string | undefined =
        response.authentication?.accessToken ||
        response.params?.access_token;

      logger.log('[ZURT Auth] idToken:', idToken ? 'YES' : 'NO', 'accessToken:', accessToken ? 'YES' : 'NO');

      // Step 1: Try POST /api/auth/google with idToken
      if (idToken) {
        try {
          logger.log('[ZURT Auth] Trying POST /auth/google...');
          const res = await fetch(`${API_BASE}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ idToken }),
          });
          if (res.ok) {
            const data = await res.json();
            const jwt = data.token ?? data.access_token ?? data.jwt;
            if (jwt) {
              logger.log('[ZURT Auth] /auth/google success');
              await saveToken(jwt);
              const restored = await restoreSession();
              if (restored) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                const route = await getPostAuthRoute();
                router.replace(route);
                return;
              }
            }
          }
          logger.log('[ZURT Auth] /auth/google status:', res.status);
        } catch (err: any) {
          logger.log('[ZURT Auth] /auth/google error:', err?.message);
        }
      }

      // Step 2: Fallback — get email from Google and POST /api/auth/login
      let googleEmail = '';

      // Try decoding id_token JWT payload for email
      if (idToken) {
        try {
          const payload = JSON.parse(atob(idToken.split('.')[1]));
          googleEmail = payload.email ?? '';
        } catch { /* ignore decode errors */ }
      }

      // If no email from id_token, try userinfo endpoint
      if (!googleEmail && accessToken) {
        try {
          const res = await fetch(GOOGLE_USERINFO_URL, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (res.ok) {
            const info = await res.json();
            googleEmail = info.email ?? '';
          }
        } catch { /* ignore */ }
      }

      if (googleEmail) {
        logger.log('[ZURT Auth] Trying POST /auth/login with email:', googleEmail);
        try {
          const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ email: googleEmail }),
          });
          if (res.ok) {
            const data = await res.json();
            const jwt = data.token ?? data.access_token ?? data.jwt;
            if (jwt) {
              logger.log('[ZURT Auth] /auth/login with email success');
              await saveToken(jwt);
              const restored = await restoreSession();
              if (restored) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                const route = await getPostAuthRoute();
                router.replace(route);
                return;
              }
            }
          }
        } catch (err: any) {
          logger.log('[ZURT Auth] /auth/login error:', err?.message);
        }
      }

      // All attempts failed
      logger.log('[ZURT Auth] All Google auth attempts failed');
      Alert.alert(t('common.error'), t('login.googleCreateAccount'));
    } catch (err: any) {
      logger.log('[ZURT Auth] handleGoogleAuth error:', err?.message ?? err);
      setError(t('login.googleUnavailable'));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleLogin = useCallback(async () => {
    Keyboard.dismiss();
    setError('');
    clearError();

    if (!googleRequest) {
      setError(t('login.googleUnavailable'));
      return;
    }

    setGoogleLoading(true);
    try {
      logger.log('[ZURT Google Auth] redirectUri:', GOOGLE_REDIRECT_URI);
      logger.log('[ZURT Google Auth] request URL:', googleRequest?.url?.substring(0, 120));
      await googlePromptAsync();
    } catch (err: any) {
      console.error('Google auth error:', err);
      logger.log('[ZURT Auth] googlePromptAsync error:', err?.message ?? err);
      setGoogleLoading(false);
      Alert.alert(
        t('common.error'),
        t('login.googleAuthError'),
        [{ text: 'OK' }],
      );
    }
  }, [googleRequest, googlePromptAsync, clearError, t]);

  // -------------------------------------------------------------------------
  // Email/password auth
  // -------------------------------------------------------------------------
  const handleLogin = useCallback(async () => {
    Keyboard.dismiss();
    setError('');
    clearError();

    if (!email.trim()) {
      setError(t('login.emailError'));
      return;
    }
    if (!password.trim()) {
      setError(t('login.passwordError'));
      return;
    }

    try {
      const success = await login(email.trim(), password);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const route = await getPostAuthRoute();
        router.replace(route);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(t('login.connectionError'));
    }
  }, [email, password, login, router, clearError, t]);

  const handleRegister = useCallback(async () => {
    Keyboard.dismiss();
    setError('');
    clearError();
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = t('login.nameRequired');
    } else if (fullName.trim().length < 2) {
      errors.fullName = t('login.nameTooShort');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errors.email = t('login.emailError');
    } else if (!emailRegex.test(email.trim())) {
      errors.email = t('login.emailInvalid');
    }

    if (!password.trim() || password.length < 6) {
      errors.password = t('login.passwordMinLength');
    }

    if (!confirmPassword.trim()) {
      errors.confirmPassword = t('login.confirmPasswordRequired');
    } else if (password !== confirmPassword) {
      errors.confirmPassword = t('login.passwordsDontMatch');
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      const success = await register(fullName.trim(), email.trim(), password);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const route = await getPostAuthRoute();
        router.replace(route);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(t('login.registerError'));
    }
  }, [fullName, email, password, confirmPassword, register, router, clearError, t]);

  const handleDemo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    loginDemo();
    router.replace('/(tabs)');
  }, [loginDemo, router]);

  const toggleMode = useCallback(() => {
    setError('');
    setFieldErrors({});
    clearError();
    setConfirmPassword('');
    setMode((m) => (m === 'login' ? 'register' : 'login'));
  }, [clearError]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/ZURT_logo_200x200_transparent.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.brandName}>ZURT</Text>
            <Text style={styles.brandSub}>Wealth Intelligence</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Google login button */}
            <TouchableOpacity
              style={[styles.googleButton, googleLoading && styles.googleButtonDisabled]}
              onPress={handleGoogleLogin}
              activeOpacity={0.7}
              disabled={googleLoading || isLoading}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color="#4285F4" style={{ marginRight: spacing.sm }} />
              ) : (
                <Text style={styles.googleIcon}>G</Text>
              )}
              <Text style={styles.googleButtonText}>
                {t('login.googleLogin')}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('login.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {mode === 'register' && (
              <>
                <Input
                  label={t('login.fullName')}
                  placeholder={t('login.yourName')}
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    setError('');
                    setFieldErrors((e) => ({ ...e, fullName: '' }));
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
                {fieldErrors.fullName ? (
                  <Text style={styles.fieldError}>{fieldErrors.fullName}</Text>
                ) : null}
              </>
            )}

            <Input
              label={t('login.email')}
              placeholder="seu@email.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError('');
                setFieldErrors((e) => ({ ...e, email: '' }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            {fieldErrors.email ? (
              <Text style={styles.fieldError}>{fieldErrors.email}</Text>
            ) : null}

            <Input
              label={t('login.password')}
              placeholder={mode === 'register' ? t('login.passwordMinLength') : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError('');
                setFieldErrors((e) => ({ ...e, password: '' }));
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              returnKeyType={mode === 'register' ? 'next' : 'done'}
              onSubmitEditing={mode === 'login' ? handleLogin : undefined}
              rightIcon={
                <Text style={styles.eyeIcon}>
                  {showPassword ? '\uD83D\uDC41\uFE0F' : '\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8\uFE0F'}
                </Text>
              }
              onRightIconPress={() => setShowPassword(!showPassword)}
            />
            {fieldErrors.password ? (
              <Text style={styles.fieldError}>{fieldErrors.password}</Text>
            ) : null}

            {mode === 'register' && (
              <>
                <Input
                  label={t('login.confirmPassword')}
                  placeholder={t('login.confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setError('');
                    setFieldErrors((e) => ({ ...e, confirmPassword: '' }));
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />
                {fieldErrors.confirmPassword ? (
                  <Text style={styles.fieldError}>{fieldErrors.confirmPassword}</Text>
                ) : null}
              </>
            )}

            {displayError ? (
              <Text style={styles.error}>{displayError}</Text>
            ) : null}

            <View style={styles.buttonContainer}>
              <Button
                title={mode === 'login' ? t('login.access') : t('login.createAccount')}
                onPress={mode === 'login' ? handleLogin : handleRegister}
                loading={isLoading}
                size="lg"
              />
            </View>

            <TouchableOpacity onPress={toggleMode} style={styles.switchMode}>
              <Text style={styles.switchModeText}>
                {mode === 'login' ? t('login.noAccount') : t('login.hasAccount')}
              </Text>
            </TouchableOpacity>

            {mode === 'login' && (
              <TouchableOpacity
                style={styles.biometricButton}
                activeOpacity={0.7}
                accessibilityLabel={t('biometric.authenticate')}
                onPress={() => router.push('/(auth)/biometric')}
              >
                <View style={styles.biometricCircle}>
                  <Text style={styles.biometricIcon}>{'\uD83D\uDC46'}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Demo link */}
          <View style={styles.demoContainer}>
            <TouchableOpacity onPress={handleDemo} style={styles.demoButton}>
              <Text style={styles.demoText}>{t('login.demo')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.section + 10,
  },
  logoImage: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: 4,
  },
  brandSub: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 4,
    letterSpacing: 2,
  },
  form: {
    width: '100%',
  },
  // -- Google button --
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#DADCE0',
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4285F4',
    marginRight: spacing.sm,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F1F1F',
  },
  // -- Divider --
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: colors.text.muted,
    paddingHorizontal: spacing.md,
  },
  // --
  error: {
    color: colors.negative,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  fieldError: {
    color: colors.negative,
    fontSize: 12,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    paddingLeft: 2,
  },
  buttonContainer: {
    marginTop: spacing.sm,
  },
  switchMode: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  switchModeText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '500',
  },
  biometricButton: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  biometricCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.accent + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricIcon: {
    fontSize: 28,
  },
  demoContainer: {
    alignItems: 'center',
    marginTop: spacing.section,
  },
  demoButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  demoText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  eyeIcon: {
    fontSize: 18,
  },
});
