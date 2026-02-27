import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../../src/stores/settingsStore';

export default function FinancingScreen() {
  const router = useRouter();
  const colors = useSettingsStore((s) => s.colors);
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderWidth: 1, borderColor: colors.border,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary }}>
          Financiamento
        </Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>{'\uD83D\uDEA7'}</Text>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, textAlign: 'center' }}>
          Em desenvolvimento
        </Text>
        <Text style={{ fontSize: 13, color: colors.text.secondary, textAlign: 'center', marginTop: 8 }}>
          Esta ferramenta estara disponivel em breve
        </Text>
      </View>
    </View>
  );
}
