// screens/CardsScreen.tsx
// Tela principal de Cartões — estilo Apple Wallet
// Stack empilhado → toque expande → painel de detalhes

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CreditCardVisual from '../components/cards/CreditCardVisual';
import CardDetailPanel from '../components/cards/CardDetailPanel';
import MiniCardRow from '../components/cards/MiniCardRow';
import SpendingCategories from '../components/cards/SpendingCategories';
import { DEMO_CARDS, DEMO_SPENDING } from '../data/cardsData';
import { formatBRL } from '../utils/formatters';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_H = 210;
const COLLAPSED_VISIBLE = 72; // Quanto de cada cartão aparece no stack

type Tab = 'cartoes' | 'categorias';

export default function CardsScreen() {
  const insets = useSafeAreaInsets();
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('cartoes');
  const [hideValues, setHideValues] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // ── Cálculos consolidados ──
  const totalFaturas = DEMO_CARDS.reduce((s, c) => s + c.faturaAtual, 0);
  const totalLimite = DEMO_CARDS.reduce((s, c) => s + c.limiteTotal, 0);
  const totalUsado = DEMO_CARDS.reduce((s, c) => s + c.limiteUsado, 0);
  const totalDisponivel = totalLimite - totalUsado;
  const pctGeral = totalUsado / totalLimite;

  // ── Handlers ──
  const handleCardPress = (cardId: string) => {
    if (expandedCardId === cardId) {
      setExpandedCardId(null);
    } else {
      setExpandedCardId(cardId);
      // Scroll to top quando expande
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  };

  const mask = (val: string) => hideValues ? 'R$ ••••••' : val;

  // ── Render Stack View (Apple Wallet) ──
  const renderStackView = () => (
    <View style={styles.stackContainer}>
      {DEMO_CARDS.map((card, index) => {
        const marginTop = index === 0 ? 0 : -(CARD_H - COLLAPSED_VISIBLE);

        return (
          <TouchableOpacity
            key={card.id}
            activeOpacity={0.9}
            onPress={() => handleCardPress(card.id)}
            style={[styles.stackCard, {
              marginTop,
              zIndex: index + 1,
            }]}
          >
            <CreditCardVisual card={card} />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ── Render Expanded View ──
  const renderExpandedView = () => {
    const selectedCard = DEMO_CARDS.find(c => c.id === expandedCardId);
    if (!selectedCard) return null;

    const otherCards = DEMO_CARDS.filter(c => c.id !== expandedCardId);

    return (
      <View>
        {/* Cartão selecionado */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setExpandedCardId(null)}
          style={styles.expandedCard}
        >
          <CreditCardVisual card={selectedCard} />
        </TouchableOpacity>

        {/* Painel de detalhes */}
        <View style={styles.detailPanelWrapper}>
          <CardDetailPanel card={selectedCard} hideValues={hideValues} />
        </View>

        {/* Outros cartões */}
        {otherCards.length > 0 && (
          <View style={styles.otherCardsSection}>
            <Text style={styles.otherCardsTitle}>Outros cartões</Text>
            {otherCards.map((card) => (
              <MiniCardRow
                key={card.id}
                card={card}
                onPress={() => handleCardPress(card.id)}
                hideValues={hideValues}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Cartões</Text>
            <Text style={styles.headerSubtitle}>
              {DEMO_CARDS.length} cartões • {mask(formatBRL(totalFaturas))} em faturas
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setHideValues(!hideValues)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={hideValues ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color="#fff"
              />
            </TouchableOpacity>
            <LinearGradient
              colors={['#0066FF', '#00AAFF']}
              style={styles.zurtBadge}
            >
              <Text style={styles.zurtBadgeText}>Z</Text>
            </LinearGradient>
          </View>
        </View>

        {/* ── Resumo consolidado ── */}
        <View style={styles.summaryWrapper}>
          <LinearGradient
            colors={['#1a1a2e', '#2d2d50']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <View style={styles.summaryTop}>
              <View>
                <Text style={styles.summaryLabel}>Total em faturas</Text>
                <Text style={styles.summaryValue}>{mask(formatBRL(totalFaturas))}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.summaryLabel}>Disponível</Text>
                <Text style={[styles.summarySecondary, { color: '#2ED573' }]}>
                  {mask(formatBRL(totalDisponivel))}
                </Text>
              </View>
            </View>

            {/* Barra geral */}
            <View style={styles.summaryBarSection}>
              <View style={styles.summaryBarLabels}>
                <Text style={styles.summaryBarText}>
                  {(pctGeral * 100).toFixed(0)}% do limite total
                </Text>
                <Text style={styles.summaryBarText}>
                  {mask(formatBRL(totalLimite))}
                </Text>
              </View>
              <View style={styles.summaryBarBg}>
                <LinearGradient
                  colors={['#2ED573', '#00AAFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.summaryBarFill, { width: `${pctGeral * 100}%` }]}
                />
              </View>
            </View>

            {/* Mini badges dos bancos */}
            <View style={styles.bankBadges}>
              {DEMO_CARDS.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.bankBadge}
                  onPress={() => handleCardPress(c.id)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={[c.gradientColors[0], c.gradientColors[1]]}
                    style={styles.bankBadgeIcon}
                  >
                    <Text style={[styles.bankBadgeIconText, { color: c.textColor }]}>
                      {c.bancoAbrev.slice(0, 1)}
                    </Text>
                  </LinearGradient>
                  <Text style={styles.bankBadgeText}>
                    {c.banco.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* ── Tabs ── */}
        <View style={styles.tabsWrapper}>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'cartoes' && styles.tabActive]}
              onPress={() => setActiveTab('cartoes')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'cartoes' && styles.tabTextActive]}>
                Cartões
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'categorias' && styles.tabActive]}
              onPress={() => setActiveTab('categorias')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'categorias' && styles.tabTextActive]}>
                Categorias
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Content ── */}
        <View style={styles.content}>
          {activeTab === 'cartoes' && (
            expandedCardId ? renderExpandedView() : renderStackView()
          )}

          {activeTab === 'categorias' && (
            <SpendingCategories
              categories={DEMO_SPENDING}
              hideValues={hideValues}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zurtBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zurtBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },

  // Summary Card
  summaryWrapper: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 20,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  summarySecondary: {
    fontSize: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  summaryBarSection: {
    marginBottom: 14,
  },
  summaryBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryBarText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  summaryBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  summaryBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  bankBadges: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    flexWrap: 'wrap',
  },
  bankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  bankBadgeIcon: {
    width: 14,
    height: 14,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankBadgeIconText: {
    fontSize: 7,
    fontWeight: '700',
  },
  bankBadgeText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },

  // Tabs
  tabsWrapper: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // Content
  content: {
    paddingHorizontal: 20,
  },

  // Stack
  stackContainer: {
    alignItems: 'center',
  },
  stackCard: {
    alignSelf: 'center',
  },

  // Expanded
  expandedCard: {
    alignSelf: 'center',
  },
  detailPanelWrapper: {
    marginTop: 0,
    marginBottom: 16,
  },
  otherCardsSection: {
    marginTop: 4,
  },
  otherCardsTitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 12,
    paddingLeft: 4,
  },
});
