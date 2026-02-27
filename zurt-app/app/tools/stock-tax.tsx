import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  LayoutAnimation,
  UIManager,
  Clipboard,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../../src/stores/settingsStore';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// =============================================================================
// Formatting
// =============================================================================

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtPct = (v: number) => `${(v * 100).toFixed(0)}%`;

const parseBRL = (raw: string): number => {
  const cleaned = raw.replace(/[^\d,.-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

// =============================================================================
// Calculation
// =============================================================================

type OpType = 'swing' | 'daytrade';

interface CalcInput {
  tipo: OpType;
  precoCompra: number;
  precoVenda: number;
  quantidade: number;
  totalVendasMes: number;
  prejuizoAcumulado: number;
}

interface CalcResult {
  valorCompra: number;
  valorVenda: number;
  lucroBruto: number;
  prejuizoGerado: number;
  prejuizoCompensado: number;
  baseCalculo: number;
  aliquota: number;
  irDevido: number;
  irrfFonte: number;
  irAPagar: number;
  isento: boolean;
  motivoIsencao: string | null;
}

function calcularIR(input: CalcInput): CalcResult {
  const valorCompra = input.precoCompra * input.quantidade;
  const valorVenda = input.precoVenda * input.quantidade;
  const lucroBruto = valorVenda - valorCompra;

  // Loss — no tax
  if (lucroBruto <= 0) {
    return {
      valorCompra,
      valorVenda,
      lucroBruto,
      prejuizoGerado: Math.abs(lucroBruto),
      prejuizoCompensado: 0,
      baseCalculo: 0,
      aliquota: input.tipo === 'swing' ? 0.15 : 0.20,
      irDevido: 0,
      irrfFonte: 0,
      irAPagar: 0,
      isento: false,
      motivoIsencao: null,
    };
  }

  // Offset prior losses
  const prejuizoCompensado = Math.min(input.prejuizoAcumulado, lucroBruto);
  const baseCalculo = lucroBruto - prejuizoCompensado;

  if (input.tipo === 'swing') {
    if (input.totalVendasMes <= 20000) {
      return {
        valorCompra,
        valorVenda,
        lucroBruto,
        prejuizoGerado: 0,
        prejuizoCompensado,
        baseCalculo,
        aliquota: 0.15,
        irDevido: 0,
        irrfFonte: 0,
        irAPagar: 0,
        isento: true,
        motivoIsencao: 'Vendas no mes abaixo de R$ 20.000,00',
      };
    }

    const irDevido = baseCalculo * 0.15;
    return {
      valorCompra,
      valorVenda,
      lucroBruto,
      prejuizoGerado: 0,
      prejuizoCompensado,
      baseCalculo,
      aliquota: 0.15,
      irDevido,
      irrfFonte: 0,
      irAPagar: irDevido,
      isento: false,
      motivoIsencao: null,
    };
  }

  // Day Trade
  const aliquota = 0.20;
  const irDevido = baseCalculo * aliquota;
  const irrfFonte = valorVenda * 0.01;
  const irAPagar = Math.max(0, irDevido - irrfFonte);

  return {
    valorCompra,
    valorVenda,
    lucroBruto,
    prejuizoGerado: 0,
    prejuizoCompensado,
    baseCalculo,
    aliquota,
    irDevido,
    irrfFonte,
    irAPagar,
    isento: false,
    motivoIsencao: null,
  };
}

// =============================================================================
// Component
// =============================================================================

export default function StockTaxScreen() {
  const router = useRouter();
  const colors = useSettingsStore((s) => s.colors);
  const insets = useSafeAreaInsets();

  // Form state
  const [tipo, setTipo] = useState<OpType>('swing');
  const [precoCompra, setPrecoCompra] = useState('');
  const [precoVenda, setPrecoVenda] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [totalVendasMes, setTotalVendasMes] = useState('');
  const [prejuizoAcumulado, setPrejuizoAcumulado] = useState('');
  const [result, setResult] = useState<CalcResult | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const canCalculate =
    parseBRL(precoCompra) > 0 &&
    parseBRL(precoVenda) > 0 &&
    parseInt(quantidade, 10) > 0;

  const handleToggle = useCallback(
    (t: OpType) => {
      if (t !== tipo) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTipo(t);
        setResult(null);
      }
    },
    [tipo],
  );

  const handleCalculate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const input: CalcInput = {
      tipo,
      precoCompra: parseBRL(precoCompra),
      precoVenda: parseBRL(precoVenda),
      quantidade: parseInt(quantidade, 10) || 0,
      totalVendasMes: tipo === 'swing' ? parseBRL(totalVendasMes) : 0,
      prejuizoAcumulado: parseBRL(prejuizoAcumulado),
    };

    const res = calcularIR(input);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setResult(res);

    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [tipo, precoCompra, precoVenda, quantidade, totalVendasMes, prejuizoAcumulado, fadeAnim]);

  const handleClear = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPrecoCompra('');
    setPrecoVenda('');
    setQuantidade('');
    setTotalVendasMes('');
    setPrejuizoAcumulado('');
    setResult(null);
  }, []);

  const handleCopyDarf = useCallback(() => {
    Clipboard.setString('6015');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('', 'Codigo DARF copiado');
  }, []);

  // Styles (inline to use dynamic colors)
  const s = {
    bg: { flex: 1 as const, backgroundColor: colors.background },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    title: { fontSize: 18, fontWeight: '700' as const, color: colors.text.primary },
    clearBtn: { paddingHorizontal: 12, paddingVertical: 6 },
    clearText: { fontSize: 13, fontWeight: '600' as const, color: colors.accent },
    scroll: { paddingHorizontal: 20, paddingBottom: 40 },
    toggleRow: {
      flexDirection: 'row' as const,
      backgroundColor: colors.elevated || colors.card,
      borderRadius: 12,
      padding: 4,
      marginBottom: 20,
    },
    toggleBtn: {
      flex: 1,
      alignItems: 'center' as const,
      paddingVertical: 10,
      borderRadius: 10,
    },
    toggleBtnActive: { backgroundColor: colors.accent },
    toggleText: { fontSize: 14, fontWeight: '600' as const, color: colors.text.secondary },
    toggleTextActive: { color: colors.background },
    label: { fontSize: 13, fontWeight: '600' as const, color: colors.text.secondary, marginBottom: 6 },
    input: {
      height: 50,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      color: colors.text.primary,
      fontSize: 16,
      marginBottom: 16,
    },
    inputDisabled: { opacity: 0.35 },
    hint: { fontSize: 11, color: colors.text.muted, marginTop: -12, marginBottom: 16 },
    calcBtn: {
      backgroundColor: colors.accent,
      borderRadius: 14,
      height: 52,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: 20,
    },
    calcBtnDisabled: { opacity: 0.4 },
    calcBtnText: { fontSize: 16, fontWeight: '700' as const, color: colors.background },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      marginBottom: 16,
    },
    resultSection: { marginBottom: 16 },
    resultLabel: { fontSize: 12, color: colors.text.muted, marginBottom: 4 },
    resultValue: { fontSize: 14, fontWeight: '600' as const, color: colors.text.primary },
    resultPositive: { color: '#00D4AA' },
    resultNegative: { color: '#FF4D4D' },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
    badge: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      backgroundColor: '#00D4AA15',
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    badgeText: { fontSize: 13, fontWeight: '600' as const, color: '#00D4AA', flex: 1 },
    irBig: { fontSize: 28, fontWeight: '800' as const, marginTop: 4 },
    darfCard: {
      borderWidth: 1,
      borderStyle: 'dashed' as const,
      borderColor: colors.accent + '40',
      borderRadius: 12,
      padding: 14,
      marginTop: 4,
    },
    darfRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: 8,
    },
    darfLabel: { fontSize: 12, color: colors.text.muted },
    darfValue: { fontSize: 14, fontWeight: '600' as const, color: colors.text.primary },
    tipCard: {
      flexDirection: 'row' as const,
      gap: 8,
      backgroundColor: '#3B82F610',
      borderRadius: 10,
      padding: 12,
      marginTop: 12,
    },
    tipText: { fontSize: 12, color: colors.text.secondary, flex: 1 },
    banner: {
      borderWidth: 1,
      borderColor: colors.accent + '20',
      borderRadius: 14,
      padding: 14,
      marginBottom: 20,
      flexDirection: 'row' as const,
      gap: 10,
      alignItems: 'flex-start' as const,
    },
    bannerTitle: { fontSize: 13, fontWeight: '700' as const, color: colors.text.primary, marginBottom: 4 },
    bannerDesc: { fontSize: 11, color: colors.text.secondary, lineHeight: 16 },
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <View style={[s.bg, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={s.title}>IR sobre Acoes</Text>
        </View>
        <TouchableOpacity onPress={handleClear} style={s.clearBtn}>
          <Text style={s.clearText}>Limpar</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 56}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Toggle */}
          <View style={s.toggleRow}>
            <TouchableOpacity
              style={[s.toggleBtn, tipo === 'swing' && s.toggleBtnActive]}
              onPress={() => handleToggle('swing')}
              activeOpacity={0.7}
            >
              <Text style={[s.toggleText, tipo === 'swing' && s.toggleTextActive]}>
                Swing Trade
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toggleBtn, tipo === 'daytrade' && s.toggleBtnActive]}
              onPress={() => handleToggle('daytrade')}
              activeOpacity={0.7}
            >
              <Text style={[s.toggleText, tipo === 'daytrade' && s.toggleTextActive]}>
                Day Trade
              </Text>
            </TouchableOpacity>
          </View>

          {/* Inputs */}
          <Text style={s.label}>Preco medio de compra</Text>
          <TextInput
            style={s.input}
            placeholder="R$ 0,00"
            placeholderTextColor={colors.text.muted}
            keyboardType="decimal-pad"
            value={precoCompra}
            onChangeText={setPrecoCompra}
          />

          <Text style={s.label}>Preco de venda</Text>
          <TextInput
            style={s.input}
            placeholder="R$ 0,00"
            placeholderTextColor={colors.text.muted}
            keyboardType="decimal-pad"
            value={precoVenda}
            onChangeText={setPrecoVenda}
          />

          <Text style={s.label}>Quantidade de acoes</Text>
          <TextInput
            style={s.input}
            placeholder="0"
            placeholderTextColor={colors.text.muted}
            keyboardType="number-pad"
            value={quantidade}
            onChangeText={setQuantidade}
          />

          <Text style={s.label}>Total de vendas no mes (todas as acoes)</Text>
          <TextInput
            style={[s.input, tipo === 'daytrade' && s.inputDisabled]}
            placeholder="R$ 0,00"
            placeholderTextColor={colors.text.muted}
            keyboardType="decimal-pad"
            value={totalVendasMes}
            onChangeText={setTotalVendasMes}
            editable={tipo === 'swing'}
          />
          <Text style={s.hint}>
            {tipo === 'swing'
              ? 'Se vendeu menos de R$ 20.000 no mes, ha isencao'
              : 'Day Trade nao tem isencao por volume de vendas'}
          </Text>

          <Text style={s.label}>Prejuizo acumulado a compensar (opcional)</Text>
          <TextInput
            style={s.input}
            placeholder="R$ 0,00"
            placeholderTextColor={colors.text.muted}
            keyboardType="decimal-pad"
            value={prejuizoAcumulado}
            onChangeText={setPrejuizoAcumulado}
          />
          <Text style={s.hint}>Prejuizos de meses anteriores podem ser abatidos</Text>

          {/* Calculate */}
          <TouchableOpacity
            style={[s.calcBtn, !canCalculate && s.calcBtnDisabled]}
            onPress={handleCalculate}
            disabled={!canCalculate}
            activeOpacity={0.7}
          >
            <Text style={s.calcBtnText}>Calcular IR</Text>
          </TouchableOpacity>

          {/* Banner */}
          <View style={s.banner}>
            <Text style={{ fontSize: 20 }}>{'\u2728'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.bannerTitle}>Em breve: calculo automatico</Text>
              <Text style={s.bannerDesc}>
                Com a integracao B3, o ZURT vai calcular seu IR automaticamente a partir de todas as suas operacoes.
              </Text>
            </View>
          </View>

          {/* Result */}
          {result && (
            <Animated.View style={{ opacity: fadeAnim }}>
              <View style={s.card}>
                {/* Operation summary */}
                <View style={s.resultSection}>
                  <Text style={s.resultLabel}>RESUMO DA OPERACAO</Text>
                  <Text style={s.resultValue}>
                    Compra: {parseInt(quantidade, 10) || 0} acoes x{' '}
                    {fmtBRL(parseBRL(precoCompra))} = {fmtBRL(result.valorCompra)}
                  </Text>
                  <Text style={[s.resultValue, { marginTop: 4 }]}>
                    Venda: {parseInt(quantidade, 10) || 0} acoes x{' '}
                    {fmtBRL(parseBRL(precoVenda))} = {fmtBRL(result.valorVenda)}
                  </Text>
                </View>

                <View style={s.divider} />

                {/* Gross result */}
                <View style={s.resultSection}>
                  <Text style={s.resultLabel}>RESULTADO BRUTO</Text>
                  <Text
                    style={[
                      s.resultValue,
                      { fontSize: 18, fontWeight: '700' },
                      result.lucroBruto >= 0 ? s.resultPositive : s.resultNegative,
                    ]}
                  >
                    {result.lucroBruto >= 0 ? 'Lucro bruto: ' : 'Prejuizo: '}
                    {fmtBRL(result.lucroBruto)}
                  </Text>
                </View>

                {/* Loss offset */}
                {result.prejuizoCompensado > 0 && (
                  <>
                    <View style={s.divider} />
                    <View style={s.resultSection}>
                      <Text style={s.resultLabel}>COMPENSACAO DE PREJUIZO</Text>
                      <Text style={s.resultValue}>
                        Prejuizo compensado: -{fmtBRL(result.prejuizoCompensado)}
                      </Text>
                      <Text style={[s.resultValue, { marginTop: 4 }]}>
                        Base de calculo: {fmtBRL(result.baseCalculo)}
                      </Text>
                    </View>
                  </>
                )}

                <View style={s.divider} />

                {/* Exemption (swing only) */}
                {result.isento && (
                  <View style={s.badge}>
                    <Text style={{ fontSize: 16 }}>{'\u2705'}</Text>
                    <Text style={s.badgeText}>
                      ISENTO {'\u2014'} Vendas no mes abaixo de R$ 20.000
                    </Text>
                  </View>
                )}

                {tipo === 'swing' && !result.isento && result.lucroBruto > 0 && (
                  <View style={[s.resultSection, { marginBottom: 8 }]}>
                    <Text style={[s.resultValue, { fontSize: 12, color: colors.text.muted }]}>
                      Vendas no mes: {fmtBRL(parseBRL(totalVendasMes))} {'\u2014'} acima do limite de isencao
                    </Text>
                  </View>
                )}

                {/* IR calculation */}
                <View style={s.resultSection}>
                  <Text style={s.resultLabel}>CALCULO DO IR</Text>
                  <Text style={s.resultValue}>Aliquota: {fmtPct(result.aliquota)}</Text>

                  {tipo === 'daytrade' && result.lucroBruto > 0 && (
                    <>
                      <Text style={[s.resultValue, { marginTop: 4 }]}>
                        IR bruto: {fmtBRL(result.irDevido)}
                      </Text>
                      <Text style={[s.resultValue, { marginTop: 4 }]}>
                        IRRF retido na fonte (1%): {fmtBRL(result.irrfFonte)}
                      </Text>
                    </>
                  )}

                  <Text
                    style={[
                      s.irBig,
                      result.irAPagar > 0 ? s.resultNegative : s.resultPositive,
                    ]}
                  >
                    {tipo === 'daytrade' && result.lucroBruto > 0
                      ? `IR a pagar: ${fmtBRL(result.irAPagar)}`
                      : `IR devido: ${fmtBRL(result.irAPagar)}`}
                  </Text>
                </View>

                {/* DARF info */}
                {result.irAPagar > 0 && (
                  <>
                    <View style={s.divider} />
                    <Text style={[s.resultLabel, { marginBottom: 8 }]}>DARF</Text>
                    <View style={s.darfCard}>
                      <View style={s.darfRow}>
                        <Text style={s.darfLabel}>Codigo DARF</Text>
                        <TouchableOpacity
                          onPress={handleCopyDarf}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        >
                          <Text style={s.darfValue}>6015</Text>
                          <Ionicons name="copy-outline" size={14} color={colors.text.muted} />
                        </TouchableOpacity>
                      </View>
                      <View style={s.darfRow}>
                        <Text style={s.darfLabel}>Vencimento</Text>
                        <Text style={s.darfValue}>Ultimo dia util do mes seguinte</Text>
                      </View>
                      <View style={[s.darfRow, { marginBottom: 0 }]}>
                        <Text style={s.darfLabel}>Valor</Text>
                        <Text style={[s.darfValue, { color: '#FF4D4D', fontWeight: '700' }]}>
                          {fmtBRL(result.irAPagar)}
                        </Text>
                      </View>
                    </View>
                  </>
                )}

                {/* Loss tip */}
                {result.lucroBruto < 0 && (
                  <View style={s.tipCard}>
                    <Text style={{ fontSize: 14 }}>{'\uD83D\uDCA1'}</Text>
                    <Text style={s.tipText}>
                      Este prejuizo pode ser compensado em operacoes futuras do mesmo tipo
                      ({tipo === 'swing' ? 'swing trade' : 'day trade'}).
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
