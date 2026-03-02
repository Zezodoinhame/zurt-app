import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
  StyleSheet,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../stores/settingsStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

// ===== QUICK ACCESS =====
const QUICK_TOOLS = [
  { icon: 'calculator-outline', emoji: '\uD83D\uDCB0', name: 'Juros\nCompostos', route: '/compound', color: '#00D4AA' },
  { icon: 'bar-chart-outline', emoji: '\uD83D\uDCCA', name: 'CDB vs\nTesouro', route: '/tools/cdb-vs-tesouro', color: '#3B82F6' },
  { icon: 'receipt-outline', emoji: '\uD83C\uDFDB\uFE0F', name: 'IR\nAcoes', route: '/tax-dashboard', color: '#8B5CF6' },
  { icon: 'trending-up-outline', emoji: '\uD83D\uDCC8', name: 'Mercado', route: '/market', color: '#00D4AA' },
];

// ===== GROUPED TOOLS =====
interface ToolItem {
  icon: string;
  emoji: string;
  name: string;
  desc: string;
  route: string;
  color: string;
  badge?: string;
}

interface ToolSection {
  title: string;
  tools: ToolItem[];
}

const TOOL_SECTIONS: ToolSection[] = [
  {
    title: 'CALCULADORAS',
    tools: [
      { icon: 'calculator-outline', emoji: '\uD83D\uDCB0', name: 'Juros Compostos', desc: 'Simule rendimento com aportes mensais', route: '/compound', color: '#00D4AA' },
      { icon: 'bar-chart-outline', emoji: '\uD83D\uDCCA', name: 'CDB vs Tesouro Direto', desc: 'Compare rentabilidade liquida', route: '/tools/cdb-vs-tesouro', color: '#3B82F6' },
      { icon: 'receipt-outline', emoji: '\uD83C\uDFDB\uFE0F', name: 'IR sobre Acoes', desc: 'Calcule imposto swing e day trade', route: '/tax-dashboard', color: '#8B5CF6' },
      { icon: 'home-outline', emoji: '\uD83C\uDFE0', name: 'Financiamento', desc: 'SAC vs Price \u2014 compare parcelas', route: '/tools/financing', color: '#F59E0B', badge: 'NOVO' },
    ],
  },
  {
    title: 'MERCADO',
    tools: [
      { icon: 'trending-up-outline', emoji: '\uD83D\uDCC8', name: 'Mercado', desc: 'Cotacoes, ativos e watchlist', route: '/market', color: '#00D4AA' },
      { icon: 'logo-bitcoin', emoji: '\u20BF', name: 'Criptomoedas', desc: 'Bitcoin, Ethereum e mais', route: '/crypto', color: '#F59E0B' },
    ],
  },
  {
    title: 'DADOS',
    tools: [
      { icon: 'document-outline', emoji: '\uD83D\uDCC1', name: 'Exportar Carteira', desc: 'Download XLSX da sua carteira', route: '/tools/export-portfolio', color: '#3B82F6', badge: 'PRO' },
      { icon: 'list-outline', emoji: '\uD83D\uDCCB', name: 'Exportar Gastos', desc: 'CSV dos gastos dos cartoes', route: '/tools/export-expenses', color: '#8B5CF6', badge: 'PRO' },
    ],
  },
  {
    title: 'RELATORIOS',
    tools: [
      { icon: 'document-text-outline', emoji: '\uD83D\uDCC4', name: 'Relatorio PDF', desc: 'Relatorio completo da carteira', route: '/report', color: '#00D4AA' },
    ],
  },
  {
    title: 'SOCIAL',
    tools: [
      { icon: 'gift-outline', emoji: '\uD83C\uDF81', name: 'Convidar Amigos', desc: 'Compartilhe o ZURT e ganhe beneficios', route: '/tools/invite', color: '#EC4899' },
    ],
  },
];

// ===== COMPONENT =====

export function ToolsHub() {
  const [isOpen, setIsOpen] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const router = useRouter();
  const colors = useSettingsStore((s) => s.colors);
  const iconStyle = useSettingsStore((s) => s.iconStyle);

  // Keyboard detection — hide FAB when keyboard is open
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const openSheet = () => {
    setIsOpen(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 150,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setIsOpen(false));
  };

  const handleToolPress = (route: string) => {
    closeSheet();
    setTimeout(() => {
      router.push(route as any);
    }, 250);
  };

  const handleFabPress = () => {
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.timing(fabScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    openSheet();
  };

  const renderIcon = (tool: { icon: string; emoji: string; color: string }, size: number) => {
    if (iconStyle === 'emoji') {
      return <Text style={{ fontSize: size }}>{tool.emoji}</Text>;
    }
    return <Ionicons name={tool.icon as any} size={size} color={tool.color} />;
  };

  return (
    <>
      {/* ===== FAB BUTTON ===== */}
      {!isOpen && !keyboardVisible && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: Platform.OS === 'ios' ? 95 : 80,
            right: 16,
            zIndex: 999,
            transform: [{ scale: fabScale }],
          }}
        >
          <TouchableOpacity
            onPress={handleFabPress}
            activeOpacity={0.85}
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.accent,
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <Ionicons name="flash" size={26} color={colors.background} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ===== BOTTOM SHEET MODAL ===== */}
      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={closeSheet}
        statusBarTranslucent
      >
        {/* Backdrop */}
        <Animated.View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.6)',
            opacity: backdropAnim,
          }}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={closeSheet}
          />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: SHEET_HEIGHT,
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: colors.border,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleRow}>
              <Ionicons name="flash" size={20} color={colors.accent} />
              <Text style={[styles.sheetTitle, { color: colors.text.primary }]}>
                Ferramentas
              </Text>
            </View>
            <TouchableOpacity
              onPress={closeSheet}
              style={[styles.closeBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="close" size={16} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          >
            {/* Quick access row */}
            <View style={styles.quickRow}>
              {QUICK_TOOLS.map((tool, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleToolPress(tool.route)}
                  style={[
                    styles.quickCard,
                    {
                      backgroundColor: tool.color + '10',
                      borderColor: tool.color + '20',
                    },
                  ]}
                >
                  {renderIcon(tool, 22)}
                  <Text style={[styles.quickLabel, { color: tool.color }]}>
                    {tool.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Grouped tools */}
            {TOOL_SECTIONS.map((section, sIdx) => (
              <View key={sIdx} style={{ marginBottom: 16 }}>
                <Text style={[styles.sectionTitle, { color: colors.text.muted }]}>
                  {section.title}
                </Text>
                {section.tools.map((tool, tIdx) => (
                  <TouchableOpacity
                    key={tIdx}
                    onPress={() => handleToolPress(tool.route)}
                    style={[
                      styles.toolRow,
                      tIdx < section.tools.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.toolIcon, { backgroundColor: tool.color + '12' }]}>
                      {renderIcon(tool, 16)}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.toolNameRow}>
                        <Text style={[styles.toolName, { color: colors.text.primary }]}>
                          {tool.name}
                        </Text>
                        {tool.badge && (
                          <View
                            style={[
                              styles.toolBadge,
                              {
                                backgroundColor:
                                  tool.badge === 'PRO' ? colors.accent + '20' : '#F59E0B20',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.toolBadgeText,
                                {
                                  color: tool.badge === 'PRO' ? colors.accent : '#F59E0B',
                                },
                              ]}
                            >
                              {tool.badge}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.toolDesc, { color: colors.text.secondary }]}>
                        {tool.desc}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={colors.text.muted} />
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      </Modal>
    </>
  );
}

// ===== STYLES =====
const styles = StyleSheet.create({
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
  },
  toolIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolName: {
    fontSize: 14,
    fontWeight: '600',
  },
  toolBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  toolBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  toolDesc: {
    fontSize: 11,
    marginTop: 1,
  },
});
