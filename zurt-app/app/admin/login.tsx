import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { saveAdminSession } from './data/adminAuth';

const C = {
  bg: '#080D14',
  card: '#0F1520',
  border: '#1E2A3A',
  accent: '#00D4AA',
  text: '#E8ECF0',
  textSec: '#8B95A5',
  negative: '#FF6B6B',
};

export default function AdminLoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Preencha todos os campos');
      return;
    }
    setLoading(true);
    setError('');

    const emailInput = email.trim().toLowerCase();
    const passwordInput = password.trim();

    console.log('[AdminLogin] attempt:', emailInput);

    if (emailInput === 'admin@zurt.com' && passwordInput === 'basketball@0615') {
      try {
        await saveAdminSession();
        console.log('[AdminLogin] session saved OK');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/admin/panel');
      } catch (e) {
        console.log('[AdminLogin] saveSession error:', e);
        setError('Erro ao salvar sessao');
      } finally {
        setLoading(false);
      }
    } else {
      console.log('[AdminLogin] credentials mismatch');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Credenciais invalidas');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top + 24 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Administracao</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Shield icon */}
        <View style={styles.shieldContainer}>
          <View style={styles.shieldCircle}>
            <Ionicons name="shield-checkmark" size={40} color={C.accent} />
          </View>
        </View>

        <Text style={styles.title}>Painel Admin</Text>
        <Text style={styles.subtitle}>
          Acesso restrito a administradores
        </Text>

        {/* Email field */}
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={18} color={C.textSec} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email do admin"
            placeholderTextColor={C.textSec}
            value={email}
            onChangeText={(v) => { setEmail(v); setError(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Password field */}
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={18} color={C.textSec} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Senha"
            placeholderTextColor={C.textSec}
            value={password}
            onChangeText={(v) => { setPassword(v); setError(''); }}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textSec} />
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={14} color={C.negative} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Login button */}
        <TouchableOpacity
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              <Ionicons name="log-in-outline" size={18} color="#000" />
              <Text style={styles.loginBtnText}>Entrar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    marginTop: -60,
  },
  shieldContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  shieldCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.accent + '15',
    borderWidth: 2,
    borderColor: C.accent + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: C.textSec,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: C.text,
  },
  eyeBtn: {
    padding: 6,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 13,
    color: C.negative,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.accent,
    height: 52,
    borderRadius: 12,
    marginTop: 8,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});
