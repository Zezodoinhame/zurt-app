import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { useAuthStore } from '../../src/stores/authStore';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, register, loginDemo, isLoading, error: storeError, clearError } = useAuthStore();

  const [mode, setMode] = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const displayError = error || storeError || '';

  const handleLogin = useCallback(async () => {
    Keyboard.dismiss();
    setError('');
    clearError();

    if (!email.trim()) {
      setError('Digite seu email');
      return;
    }
    if (!password.trim()) {
      setError('Digite sua senha');
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
      setError('Erro de conexao. Tente novamente.');
    }
  }, [email, password, login, router, clearError]);

  const handleRegister = useCallback(async () => {
    Keyboard.dismiss();
    setError('');
    clearError();

    if (!fullName.trim()) {
      setError('Digite seu nome completo');
      return;
    }
    if (!email.trim()) {
      setError('Digite seu email');
      return;
    }
    if (!password.trim() || password.length < 6) {
      setError('Senha deve ter no minimo 6 caracteres');
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
      setError('Erro ao criar conta. Tente novamente.');
    }
  }, [fullName, email, password, register, router, clearError]);

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
            <Text style={styles.brandName}>
              ZURT
            </Text>
            <Text style={styles.brandSub}>
              Wealth Intelligence
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {mode === 'register' && (
              <Input
                label="Nome completo"
                placeholder="Seu nome"
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
              label="Email"
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
              label="Senha"
              placeholder="••••••••"
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
              <Text style={styles.error}>
                {displayError}
              </Text>
            ) : null}

            <View style={styles.buttonContainer}>
              <Button
                title={mode === 'login' ? 'Acessar' : 'Criar conta'}
                onPress={mode === 'login' ? handleLogin : handleRegister}
                loading={isLoading}
                size="lg"
              />
            </View>

            <TouchableOpacity onPress={toggleMode} style={styles.switchMode}>
              <Text style={styles.switchModeText}>
                {mode === 'login'
                  ? 'Nao tem conta? Cadastre-se'
                  : 'Ja tem conta? Entrar'}
              </Text>
            </TouchableOpacity>

            {mode === 'login' && (
              <TouchableOpacity
                style={styles.biometricButton}
                activeOpacity={0.7}
                accessibilityLabel="Autenticar com biometria"
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
              <Text style={styles.demoText}>Modo demonstracao</Text>
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
