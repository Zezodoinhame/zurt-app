import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Rect, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useSettingsStore } from '../src/stores/settingsStore';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { AppIcon } from '../src/hooks/useIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const ONBOARDING_KEY = 'zurt:onboarding_complete';

const PAGE_IDS = ['welcome', 'banks', 'ai', 'start'] as const;

// ===========================================================================
// OnboardingScreen
// ===========================================================================

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activePage, setActivePage] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const pageAnims = useRef(PAGE_IDS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    pageAnims.forEach((anim, i) => {
      if (i !== activePage) anim.setValue(0);
    });
    Animated.spring(pageAnims[activePage], {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [activePage, pageAnims]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActivePage(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const markDone = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // ignore
    }
  }, []);

  const handleConnectBank = useCallback(async () => {
    await markDone();
    router.replace('/connect-bank');
  }, [markDone, router]);

  const handleExplore = useCallback(async () => {
    await markDone();
    router.replace('/(tabs)');
  }, [markDone, router]);

  const handleSkip = useCallback(async () => {
    await markDone();
    router.replace('/(tabs)');
  }, [markDone, router]);

  const handleNext = useCallback(() => {
    if (activePage < PAGE_IDS.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activePage + 1, animated: true });
    }
  }, [activePage]);

  const isLastPage = activePage === PAGE_IDS.length - 1;

  // ---------------------------------------------------------------------------
  // Pagination dots
  // ---------------------------------------------------------------------------
  const PaginationDots = useCallback(
    ({ active }: { active: number }) => (
      <View style={styles.dotsRow}>
        {PAGE_IDS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === active
                ? { backgroundColor: '#00D4AA', width: 24 }
                : { backgroundColor: colors.border },
            ]}
          />
        ))}
      </View>
    ),
    [colors.border, styles],
  );

  // ---------------------------------------------------------------------------
  // Page renderers
  // ---------------------------------------------------------------------------
  const renderPage = useCallback(
    ({ index }: { item: string; index: number }) => {
      const opacity = pageAnims[index];
      const scale = pageAnims[index].interpolate({
        inputRange: [0, 1],
        outputRange: [0.85, 1],
      });

      if (index === 0) {
        // ----- SLIDE 1: Bem-vindo ao ZURT -----
        return (
          <View style={styles.page}>
            <View style={styles.pageCenter}>
              <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
                {/* ZURT Logo */}
                <View style={styles.logoGlow}>
                  <Svg width={80} height={80} viewBox="0 0 80 80">
                    <Defs>
                      <SvgGradient id="zurt-logo" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0%" stopColor="#00D4AA" />
                        <Stop offset="100%" stopColor="#00A888" />
                      </SvgGradient>
                    </Defs>
                    <Rect width={80} height={80} rx={24} fill="url(#zurt-logo)" />
                    <SvgText
                      x={40}
                      y={54}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontWeight="900"
                      fontSize={42}
                    >
                      Z
                    </SvgText>
                  </Svg>
                </View>

                <Text style={styles.title}>{t('onboarding.slide1Title')}</Text>
                <Text style={styles.subtitle}>{t('onboarding.slide1Subtitle')}</Text>
                <Text style={styles.desc}>{t('onboarding.slide1Desc')}</Text>

                <View style={styles.heroIconWrap}>
                  <AppIcon name="trending" size={56} color="#00D4AA" />
                </View>
              </Animated.View>
            </View>

            <View style={styles.footer}>
              <PaginationDots active={index} />
              <TouchableOpacity
                style={styles.nextBtn}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={styles.nextBtnText}>{t('onboarding.next')}</Text>
                <AppIcon name="chevron" size={16} color={colors.background} />
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      if (index === 1) {
        // ----- SLIDE 2: Conecte seus bancos -----
        return (
          <View style={styles.page}>
            <View style={styles.pageCenter}>
              <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
                <View style={[styles.iconCircle, { backgroundColor: '#3A86FF20', borderColor: '#3A86FF40' }]}>
                  <AppIcon name="bank" size={48} color="#3A86FF" />
                </View>

                <Text style={styles.title}>{t('onboarding.slide2Title')}</Text>
                <Text style={styles.desc}>{t('onboarding.slide2Desc')}</Text>

                {/* Bank icons row */}
                <View style={styles.bankRow}>
                  {['security', 'shield', 'lock'].map((icon, i) => (
                    <View key={i} style={styles.bankIconCircle}>
                      <AppIcon name={icon as any} size={20} color="#00D4AA" />
                    </View>
                  ))}
                </View>

                {/* Security text */}
                <View style={styles.securityRow}>
                  <AppIcon name="security" size={14} color="#00D4AA" />
                  <Text style={styles.securityText}>{t('onboarding.slide2Security')}</Text>
                </View>

                {/* Badge */}
                <View style={styles.secureBadge}>
                  <Text style={styles.secureBadgeText}>{t('onboarding.slide2Badge')}</Text>
                </View>
              </Animated.View>
            </View>

            <View style={styles.footer}>
              <PaginationDots active={index} />
              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: '#3A86FF' }]}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={styles.nextBtnText}>{t('onboarding.next')}</Text>
                <AppIcon name="chevron" size={16} color={colors.background} />
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      if (index === 2) {
        // ----- SLIDE 3: Inteligência com IA -----
        return (
          <View style={styles.page}>
            <View style={styles.pageCenter}>
              <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
                <View style={[styles.iconCircle, { backgroundColor: '#A855F720', borderColor: '#A855F740' }]}>
                  <AppIcon name="sparkle" size={48} color="#A855F7" />
                </View>

                <Text style={styles.title}>{t('onboarding.slide3Title')}</Text>
                <Text style={styles.desc}>{t('onboarding.slide3Desc')}</Text>

                {/* Feature pills */}
                <View style={styles.featurePills}>
                  {[
                    { icon: 'report' as const, label: 'PDF' },
                    { icon: 'notification' as const, label: 'Alertas' },
                    { icon: 'idea' as const, label: 'Insights' },
                  ].map((f, i) => (
                    <View key={i} style={styles.featurePill}>
                      <AppIcon name={f.icon} size={16} color="#A855F7" />
                      <Text style={styles.featurePillText}>{f.label}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.featureDesc}>{t('onboarding.slide3Features')}</Text>
              </Animated.View>
            </View>

            <View style={styles.footer}>
              <PaginationDots active={index} />
              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: '#A855F7' }]}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={styles.nextBtnText}>{t('onboarding.next')}</Text>
                <AppIcon name="chevron" size={16} color={colors.background} />
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      // ----- SLIDE 4: Vamos começar -----
      return (
        <View style={styles.page}>
          <View style={styles.pageCenter}>
            <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center', width: '100%' }}>
              <View style={[styles.iconCircle, { backgroundColor: '#00D4AA20', borderColor: '#00D4AA40' }]}>
                <AppIcon name="success" size={48} color="#00D4AA" />
              </View>

              <Text style={styles.title}>{t('onboarding.slide4Title')}</Text>
              <Text style={styles.desc}>{t('onboarding.slide4Desc')}</Text>

              {/* Primary CTA */}
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleConnectBank}
                activeOpacity={0.8}
              >
                <AppIcon name="bank" size={20} color={colors.background} />
                <Text style={styles.primaryBtnText}>{t('onboarding.slide4ConnectBank')}</Text>
              </TouchableOpacity>

              {/* Secondary CTA */}
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleExplore}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryBtnText}>{t('onboarding.slide4Explore')}</Text>
              </TouchableOpacity>

              <Text style={styles.hintText}>{t('onboarding.slide4Hint')}</Text>
            </Animated.View>
          </View>

          <View style={styles.footer}>
            <PaginationDots active={index} />
          </View>
        </View>
      );
    },
    [colors, pageAnims, t, handleNext, handleConnectBank, handleExplore, PaginationDots, styles],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom }]}>
      {/* Skip button (hidden on last page) */}
      {!isLastPage && (
        <TouchableOpacity
          style={[styles.skipBtn, { top: insets.top + spacing.sm }]}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        data={PAGE_IDS as unknown as string[]}
        renderItem={renderPage}
        keyExtractor={(item) => item}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />
    </View>
  );
}

// ===========================================================================
// Styles
// ===========================================================================

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // -- Skip button
    skipBtn: {
      position: 'absolute',
      right: spacing.xl,
      zIndex: 10,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    skipText: {
      color: colors.text.muted,
      fontSize: 14,
      fontWeight: '500',
    },

    // -- Page layout
    page: {
      width: SCREEN_WIDTH,
      flex: 1,
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xxxl,
    },
    pageCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // -- Logo (slide 1)
    logoGlow: {
      marginBottom: spacing.xxl,
      shadowColor: '#00D4AA',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    heroIconWrap: {
      marginTop: spacing.xxxl,
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#00D4AA12',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // -- Texts
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    subtitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#00D4AA',
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    desc: {
      fontSize: 15,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: spacing.md,
    },

    // -- Icon circle (slides 2, 3, 4)
    iconCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xxl,
      borderWidth: 2,
    },

    // -- Banks row (slide 2)
    bankRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.xxl,
      marginBottom: spacing.lg,
    },
    bankIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    securityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    securityText: {
      fontSize: 12,
      color: colors.text.secondary,
      flex: 1,
      textAlign: 'center',
    },
    secureBadge: {
      backgroundColor: '#00D4AA1A',
      borderWidth: 1,
      borderColor: '#00D4AA33',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
    },
    secureBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#00D4AA',
    },

    // -- Feature pills (slide 3)
    featurePills: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xxl,
      marginBottom: spacing.lg,
    },
    featurePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
    },
    featurePillText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.primary,
    },
    featureDesc: {
      fontSize: 13,
      color: colors.text.muted,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: spacing.lg,
    },

    // -- CTA buttons (slide 4)
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: '#00D4AA',
      width: '100%',
      paddingVertical: 16,
      borderRadius: 14,
      marginTop: spacing.xxxl,
    },
    primaryBtnText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: '700',
    },
    secondaryBtn: {
      width: '100%',
      paddingVertical: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.md,
    },
    secondaryBtnText: {
      color: colors.text.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    hintText: {
      fontSize: 12,
      color: colors.text.muted,
      textAlign: 'center',
      marginTop: spacing.lg,
    },

    // -- Footer (dots + next button)
    footer: {
      alignItems: 'center',
      paddingBottom: spacing.section,
    },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.xl,
      gap: spacing.sm,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    nextBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: '#00D4AA',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xxxl + spacing.xxxl,
      borderRadius: radius.full,
    },
    nextBtnText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: '700',
    },
  });
