import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StyleSheet,
} from 'react-native';
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient,
  Stop,
  Rect,
  G,
  Ellipse,
} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../../stores/settingsStore';
import { usePlanStore, PLAN_INFO } from '../../stores/planStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.72;
const CARD_HEIGHT = 180;

// ---------------------------------------------------------------------------
// SVG Backgrounds
// ---------------------------------------------------------------------------

// Basico — geometric circles pattern
const BasicoSvg = () => (
  <Svg width={CARD_WIDTH} height={CARD_HEIGHT} style={StyleSheet.absoluteFill}>
    <Defs>
      <LinearGradient id="bgBasico" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#1E3A5F" />
        <Stop offset="1" stopColor="#0F1B2D" />
      </LinearGradient>
    </Defs>
    <Rect width={CARD_WIDTH} height={CARD_HEIGHT} rx={20} fill="url(#bgBasico)" />
    <Circle cx={CARD_WIDTH - 30} cy={30} r={60} fill="#3B82F6" opacity={0.12} />
    <Circle cx={CARD_WIDTH - 50} cy={50} r={40} fill="#3B82F6" opacity={0.08} />
    <Circle cx={CARD_WIDTH - 10} cy={CARD_HEIGHT - 20} r={35} fill="#60A5FA" opacity={0.1} />
    <Path
      d={`M0,${CARD_HEIGHT - 40} Q${CARD_WIDTH / 3},${CARD_HEIGHT - 70} ${CARD_WIDTH * 0.6},${CARD_HEIGHT - 30} T${CARD_WIDTH},${CARD_HEIGHT - 50}`}
      stroke="#3B82F6"
      strokeWidth={1}
      opacity={0.15}
      fill="none"
    />
    <Path
      d={`M0,${CARD_HEIGHT - 25} Q${CARD_WIDTH / 4},${CARD_HEIGHT - 55} ${CARD_WIDTH * 0.5},${CARD_HEIGHT - 20} T${CARD_WIDTH},${CARD_HEIGHT - 35}`}
      stroke="#60A5FA"
      strokeWidth={0.8}
      opacity={0.1}
      fill="none"
    />
  </Svg>
);

// Pro — dynamic wave mesh
const ProSvg = () => (
  <Svg width={CARD_WIDTH} height={CARD_HEIGHT} style={StyleSheet.absoluteFill}>
    <Defs>
      <LinearGradient id="bgPro" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#064E3B" />
        <Stop offset="1" stopColor="#0A1F1A" />
      </LinearGradient>
      <LinearGradient id="glowPro" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#00E99B" stopOpacity={0.3} />
        <Stop offset="1" stopColor="#00E99B" stopOpacity={0} />
      </LinearGradient>
    </Defs>
    <Rect width={CARD_WIDTH} height={CARD_HEIGHT} rx={20} fill="url(#bgPro)" />
    <Ellipse cx={CARD_WIDTH * 0.7} cy={-10} rx={120} ry={80} fill="url(#glowPro)" />
    <Path
      d={`M-10,${CARD_HEIGHT * 0.6} C${CARD_WIDTH * 0.2},${CARD_HEIGHT * 0.3} ${CARD_WIDTH * 0.4},${CARD_HEIGHT * 0.8} ${CARD_WIDTH * 0.6},${CARD_HEIGHT * 0.5} S${CARD_WIDTH * 0.9},${CARD_HEIGHT * 0.7} ${CARD_WIDTH + 10},${CARD_HEIGHT * 0.4}`}
      stroke="#00E99B"
      strokeWidth={1.5}
      opacity={0.2}
      fill="none"
    />
    <Path
      d={`M-10,${CARD_HEIGHT * 0.75} C${CARD_WIDTH * 0.15},${CARD_HEIGHT * 0.5} ${CARD_WIDTH * 0.35},${CARD_HEIGHT * 0.9} ${CARD_WIDTH * 0.55},${CARD_HEIGHT * 0.65} S${CARD_WIDTH * 0.85},${CARD_HEIGHT * 0.85} ${CARD_WIDTH + 10},${CARD_HEIGHT * 0.55}`}
      stroke="#34D399"
      strokeWidth={1}
      opacity={0.12}
      fill="none"
    />
    <Circle cx={CARD_WIDTH - 40} cy={CARD_HEIGHT - 30} r={25} fill="#00E99B" opacity={0.06} />
    <Circle cx={30} cy={20} r={3} fill="#00E99B" opacity={0.4} />
    <Circle cx={CARD_WIDTH - 60} cy={25} r={2} fill="#34D399" opacity={0.3} />
    <Circle cx={CARD_WIDTH * 0.5} cy={CARD_HEIGHT - 25} r={2.5} fill="#00E99B" opacity={0.35} />
  </Svg>
);

// Unlimited — aurora borealis / cosmic
const UnlimitedSvg = () => (
  <Svg width={CARD_WIDTH} height={CARD_HEIGHT} style={StyleSheet.absoluteFill}>
    <Defs>
      <LinearGradient id="bgUnlimited" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#2D1B69" />
        <Stop offset="1" stopColor="#13071E" />
      </LinearGradient>
      <LinearGradient id="aurora1" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#A855F7" stopOpacity={0.25} />
        <Stop offset="1" stopColor="#6366F1" stopOpacity={0} />
      </LinearGradient>
      <LinearGradient id="aurora2" x1="1" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#E879F9" stopOpacity={0.15} />
        <Stop offset="1" stopColor="#A855F7" stopOpacity={0} />
      </LinearGradient>
    </Defs>
    <Rect width={CARD_WIDTH} height={CARD_HEIGHT} rx={20} fill="url(#bgUnlimited)" />
    <Ellipse cx={CARD_WIDTH * 0.3} cy={-20} rx={150} ry={90} fill="url(#aurora1)" />
    <Ellipse cx={CARD_WIDTH * 0.8} cy={CARD_HEIGHT + 10} rx={100} ry={70} fill="url(#aurora2)" />
    <Path
      d={`M0,${CARD_HEIGHT * 0.5} Q${CARD_WIDTH * 0.25},${CARD_HEIGHT * 0.2} ${CARD_WIDTH * 0.5},${CARD_HEIGHT * 0.5} T${CARD_WIDTH},${CARD_HEIGHT * 0.3}`}
      stroke="#A855F7"
      strokeWidth={1}
      opacity={0.2}
      fill="none"
    />
    <Circle cx={50} cy={CARD_HEIGHT - 40} r={2} fill="#E879F9" opacity={0.5} />
    <Circle cx={CARD_WIDTH - 30} cy={40} r={1.5} fill="#C084FC" opacity={0.6} />
    <Circle cx={CARD_WIDTH * 0.4} cy={30} r={2} fill="#A855F7" opacity={0.4} />
    <Circle cx={CARD_WIDTH * 0.7} cy={CARD_HEIGHT - 35} r={1.8} fill="#E879F9" opacity={0.45} />
    <Circle cx={CARD_WIDTH * 0.15} cy={CARD_HEIGHT * 0.4} r={1.2} fill="#C084FC" opacity={0.35} />
  </Svg>
);

// Enterprise — golden luxury with diamond geometry
const EnterpriseSvg = () => (
  <Svg width={CARD_WIDTH} height={CARD_HEIGHT} style={StyleSheet.absoluteFill}>
    <Defs>
      <LinearGradient id="bgEnterprise" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#3D2E0A" />
        <Stop offset="1" stopColor="#1A1206" />
      </LinearGradient>
      <LinearGradient id="goldShine" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#F59E0B" stopOpacity={0.25} />
        <Stop offset="0.5" stopColor="#FBBF24" stopOpacity={0.1} />
        <Stop offset="1" stopColor="#F59E0B" stopOpacity={0} />
      </LinearGradient>
      <LinearGradient id="goldLine" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0" stopColor="#F59E0B" stopOpacity={0} />
        <Stop offset="0.5" stopColor="#FBBF24" stopOpacity={0.4} />
        <Stop offset="1" stopColor="#F59E0B" stopOpacity={0} />
      </LinearGradient>
    </Defs>
    <Rect width={CARD_WIDTH} height={CARD_HEIGHT} rx={20} fill="url(#bgEnterprise)" />
    {/* Gold diamond shape top-right */}
    <G opacity={0.15}>
      <Path d={`M${CARD_WIDTH - 60},10 L${CARD_WIDTH - 30},40 L${CARD_WIDTH - 60},70 L${CARD_WIDTH - 90},40 Z`} stroke="#F59E0B" strokeWidth={1.2} fill="none" />
      <Path d={`M${CARD_WIDTH - 60},20 L${CARD_WIDTH - 40},40 L${CARD_WIDTH - 60},60 L${CARD_WIDTH - 80},40 Z`} stroke="#FBBF24" strokeWidth={0.8} fill="none" />
    </G>
    {/* Subtle golden glow */}
    <Ellipse cx={CARD_WIDTH * 0.65} cy={-15} rx={130} ry={75} fill="url(#goldShine)" />
    {/* Horizontal gold lines */}
    <Rect x={0} y={CARD_HEIGHT * 0.45} width={CARD_WIDTH} height={0.8} fill="url(#goldLine)" />
    <Rect x={0} y={CARD_HEIGHT * 0.55} width={CARD_WIDTH} height={0.5} fill="url(#goldLine)" opacity={0.5} />
    {/* Gold particles */}
    <Circle cx={40} cy={25} r={1.5} fill="#FBBF24" opacity={0.5} />
    <Circle cx={CARD_WIDTH * 0.5} cy={CARD_HEIGHT - 30} r={2} fill="#F59E0B" opacity={0.4} />
    <Circle cx={CARD_WIDTH - 25} cy={CARD_HEIGHT - 45} r={1.2} fill="#FBBF24" opacity={0.35} />
    <Circle cx={CARD_WIDTH * 0.25} cy={CARD_HEIGHT - 20} r={1.8} fill="#F59E0B" opacity={0.3} />
    {/* Bottom-left corner accent */}
    <Path d={`M0,${CARD_HEIGHT - 50} Q${CARD_WIDTH * 0.15},${CARD_HEIGHT - 30} 0,${CARD_HEIGHT - 10}`} stroke="#F59E0B" strokeWidth={1} opacity={0.12} fill="none" />
    <Path d={`M10,${CARD_HEIGHT - 45} Q${CARD_WIDTH * 0.12},${CARD_HEIGHT - 28} 10,${CARD_HEIGHT - 10}`} stroke="#FBBF24" strokeWidth={0.6} opacity={0.08} fill="none" />
  </Svg>
);

// ---------------------------------------------------------------------------
// Plan card data (matches PLAN_INFO from planStore)
// ---------------------------------------------------------------------------

const PLANS = [
  {
    id: 'basic' as const,
    nameKey: 'plans.basic',
    priceLabel: `R$ ${PLAN_INFO.find((p) => p.tier === 'basic')?.price.toFixed(2).replace('.', ',') ?? '14,90'}`,
    periodKey: 'plans.perMonth',
    accentColor: '#3B82F6',
    featuresKey: 'plans.features.basicSummary',
    SvgBg: BasicoSvg,
  },
  {
    id: 'pro' as const,
    nameKey: 'plans.pro',
    priceLabel: `R$ ${PLAN_INFO.find((p) => p.tier === 'pro')?.price.toFixed(2).replace('.', ',') ?? '19,90'}`,
    periodKey: 'plans.perMonth',
    accentColor: '#00E99B',
    featuresKey: 'plans.features.proSummary',
    popular: true,
    SvgBg: ProSvg,
  },
  {
    id: 'unlimited' as const,
    nameKey: 'plans.unlimited',
    priceLabel: `R$ ${PLAN_INFO.find((p) => p.tier === 'unlimited')?.price.toFixed(2).replace('.', ',') ?? '49,90'}`,
    periodKey: 'plans.perMonth',
    accentColor: '#A855F7',
    featuresKey: 'plans.features.unlimitedSummary',
    SvgBg: UnlimitedSvg,
  },
  {
    id: 'enterprise' as const,
    nameKey: 'plans.enterprise',
    priceLabel: `R$ ${PLAN_INFO.find((p) => p.tier === 'enterprise')?.price.toFixed(2).replace('.', ',') ?? '499,90'}`,
    periodKey: 'plans.perMonth',
    accentColor: '#F59E0B',
    featuresKey: 'plans.features.enterpriseSummary',
    SvgBg: EnterpriseSvg,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlanCards() {
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const plan = usePlanStore((s) => s.plan);

  // Don't show cards if user already has a paid plan
  if (plan && plan !== 'free') {
    return (
      <TouchableOpacity
        onPress={() => router.push('/plans')}
        style={[styles.activeBanner, { backgroundColor: colors.card, borderColor: '#00E99B33' }]}
        activeOpacity={0.7}
      >
        <View style={styles.activeBannerLeft}>
          <Text style={styles.activeBannerEmoji}>✅</Text>
          <View>
            <Text style={[styles.activePlanName, { color: '#00E99B' }]}>
              {t('home.planActive').replace('{plan}', plan.charAt(0).toUpperCase() + plan.slice(1))}
            </Text>
            <Text style={[styles.activePlanSub, { color: colors.text.secondary }]}>
              {t('home.manageSub')}
            </Text>
          </View>
        </View>
        <Text style={[styles.activePlanChevron, { color: colors.text.secondary }]}>›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          {t('home.choosePlan')}
        </Text>
        <TouchableOpacity onPress={() => router.push('/plans')}>
          <Text style={styles.viewAll}>{t('home.viewAllPlans')}</Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal plan cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 12}
      >
        {PLANS.map((p) => (
          <TouchableOpacity
            key={p.id}
            activeOpacity={0.85}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/plans');
            }}
            style={styles.card}
          >
            <p.SvgBg />

            {/* POPULAR badge */}
            {p.popular && (
              <View style={[styles.popularBadge, { backgroundColor: p.accentColor }]}>
                <Text style={styles.popularText}>{t('plans.mostPopular').toUpperCase()}</Text>
              </View>
            )}

            {/* Content */}
            <View style={styles.cardContent}>
              <View>
                <Text style={styles.planName}>{t(p.nameKey)}</Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.price, { color: p.accentColor }]}>{p.priceLabel}</Text>
                  <Text style={styles.period}>{t(p.periodKey)}</Text>
                </View>
              </View>

              <Text style={styles.features}>{t(p.featuresKey)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  viewAll: {
    fontSize: 13,
    color: '#00E99B',
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.5,
  },
  cardContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  planName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 26,
    fontWeight: '900',
  },
  period: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 3,
  },
  features: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 17,
  },

  // Active plan banner
  activeBanner: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  activeBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activeBannerEmoji: {
    fontSize: 20,
  },
  activePlanName: {
    fontSize: 15,
    fontWeight: '700',
  },
  activePlanSub: {
    fontSize: 12,
  },
  activePlanChevron: {
    fontSize: 18,
  },
});
