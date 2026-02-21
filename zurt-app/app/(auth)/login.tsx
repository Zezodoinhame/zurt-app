import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
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
import { colors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { useAuthStore } from '../../src/stores/authStore';
import { Button } from '../../src/components/ui/Button';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { Input } from '../../src/components/ui/Input';
import { saveToken } from '../../src/services/api';

WebBrowser.maybeCompleteAuthSession();

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://zurt.com.br/api';

// Google OAuth - web client ID from .env
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/userinfo/v2/me';

type Mode = 'login' | 'register';

// ===========================================================================
// LoginScreen
// ===========================================================================

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, register, loginDemo, restoreSession, isLoading, error: storeError, clearError } = useAuthStore();
  const { t } = useSettingsStore();

  const [mode, setMode] = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const displayError = error || storeError || '';

  // -------------------------------------------------------------------------
  // Google Auth via expo-auth-session (direct, no backend redirect)
  // -------------------------------------------------------------------------
  const hasGoogleClientId = !!GOOGLE_WEB_CLIENT_ID;

  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
    scopes: ['profile', 'email'],
  });

  // Handle Google OAuth response
  useEffect(() => {
    if (!googleResponse) return;

    if (googleResponse.type === 'success') {
      const auth = googleResponse.authentication;
      if (auth) {
        handleGoogleAuth(auth);
      } else {
        // No authentication object — try extracting from params (id_token flow)
        const idToken = googleResponse.params?.id_token;
        const accessTokenParam = googleResponse.params?.access_token;
        if (idToken || accessTokenParam) {
          handleGoogleAuth({ accessToken: accessTokenParam ?? '', idToken: idToken });
        } else {
          console.log('[ZURT Auth] Google OAuth success but no tokens');
          setGoogleLoading(false);
          setError(t('login.googleUnavailable'));
        }
      }
    } else if (googleResponse.type === 'error') {
      console.log('[ZURT Auth] Google OAuth error:', 'error' in googleResponse ? googleResponse.error : '');
      setGoogleLoading(false);
      setError(t('login.googleUnavailable'));
    } else {
      // cancel or dismiss
      console.log('[ZURT Auth] Google OAuth:', googleResponse.type);
      setGoogleLoading(false);
    }
  }, [googleResponse]);

  const handleGoogleAuth = async (authentication: { accessToken: string; idToken?: string }) => {
    const { accessToken } = authentication;
    console.log('[ZURT Auth] Google auth success, accessToken:', accessToken ? 'YES' : 'NO');

    try {
      // Step 1: Get Google user email
      let googleEmail = '';

      if (accessToken) {
        try {
          const res = await fetch(GOOGLE_USERINFO_URL, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (res.ok) {
            const info = await res.json();
            googleEmail = info.email ?? '';
            console.log('[ZURT Auth] Google user email:', googleEmail);
          }
        } catch (err: any) {
          console.log('[ZURT Auth] Failed to fetch Google userinfo:', err?.message);
        }
      }

      if (!googleEmail) {
        setError(t('login.googleUnavailable'));
        return;
      }

      // Step 2: Try POST /api/auth/login with Google email
      console.log('[ZURT Auth] Trying POST /auth/login with Google email...');
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: googleEmail }),
      });

      if (res.ok) {
        const data = await res.json();
        const jwtToken = data.token ?? data.access_token ?? data.jwt;
        if (jwtToken) {
          console.log('[ZURT Auth] Login with Google email success');
          await saveToken(jwtToken);
          const restored = await restoreSession();
          if (restored) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/(tabs)');
            return;
          }
        }
      }

      // User doesn't exist in backend — show "create account first" message
      console.log('[ZURT Auth] User not found in backend, status:', res.status);
      Alert.alert(t('common.error'), t('login.googleCreateAccount'));
    } catch (err: any) {
      console.log('[ZURT Auth] handleGoogleAuth error:', err?.message ?? err);
      setError(t('login.googleUnavailable'));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleLogin = useCallback(() => {
    Keyboard.dismiss();
    setError('');
    clearError();

    if (!hasGoogleClientId || !googleRequest) {
      Alert.alert(t('common.error'), t('login.googleUnavailable'));
      return;
    }

    setGoogleLoading(true);
    googlePromptAsync();
  }, [hasGoogleClientId, googleRequest, googlePromptAsync, clearError, t]);

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
        router.replace('/(tabs)');
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

    if (!fullName.trim()) {
      setError(t('login.nameError'));
      return;
    }
    if (!email.trim()) {
      setError(t('login.emailError'));
      return;
    }
    if (!password.trim() || password.length < 6) {
      setError(t('login.passwordMinLength'));
      return;
    }

    try {
      const success = await register(fullName.trim(), email.trim(), password);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(t('login.registerError'));
    }
  }, [fullName, email, password, register, router, clearError, t]);

  const handleDemo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    loginDemo();
    router.replace('/(tabs)');
  }, [loginDemo, router]);

  const toggleMode = useCallback(() => {
    setError('');
    clearError();
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
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>Z</Text>
            </View>
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
              <Text style={styles.googleButtonText}>{t('login.googleLogin')}</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('login.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {mode === 'register' && (
              <Input
                label={t('login.fullName')}
                placeholder={t('login.yourName')}
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  setError('');
                }}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
              />
            )}

            <Input
              label={t('login.email')}
              placeholder="seu@email.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            <Input
              label={t('login.password')}
              placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError('');
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={mode === 'login' ? handleLogin : handleRegister}
              rightIcon={
                <Text style={styles.eyeIcon}>
                  {showPassword ? '\uD83D\uDC41\uFE0F' : '\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8\uFE0F'}
                </Text>
              }
              onRightIconPress={() => setShowPassword(!showPassword)}
            />

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
                accessibilityLabel="Autenticar com biometria"
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

const styles = StyleSheet.create({
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
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#060A0F',
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
