import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore } from '../src/stores/settingsStore';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ONBOARDING_KEY = '@zurt:onboarding_done';

interface OnboardingPage {
  titleKey: string;
  descKey: string;
  icon: string;
  accentColor: string;
}

const PAGES: OnboardingPage[] = [
  { titleKey: 'onboarding.title1', descKey: 'onboarding.desc1', icon: '\u{1F4CA}', accentColor: '#00D4AA' },
  { titleKey: 'onboarding.title2', descKey: 'onboarding.desc2', icon: '\u2728',   accentColor: '#FFD93D' },
  { titleKey: 'onboarding.title3', descKey: 'onboarding.desc3', icon: '\u{1F4C8}', accentColor: '#45B7D1' },
  { titleKey: 'onboarding.title4', descKey: 'onboarding.desc4', icon: '\u{1F680}', accentColor: '#00D4AA' },
];

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
  const scrollRef = useRef<ScrollView>(null);

  // One Animated.Value per page for the icon fade/pulse
  const iconAnimations = useRef(
    PAGES.map(() => new Animated.Value(0))
  ).current;

  // Trigger the fade-in animation for the active page
  useEffect(() => {
    // Reset all animations
    iconAnimations.forEach((anim, i) => {
      if (i !== activePage) {
        anim.setValue(0);
      }
    });

    // Animate the active page icon
    Animated.timing(iconAnimations[activePage], {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      // Subtle pulse loop after fade-in
      Animated.loop(
        Animated.sequence([
          Animated.timing(iconAnimations[activePage], {
            toValue: 0.7,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(iconAnimations[activePage], {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, [activePage, iconAnimations]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const page = Math.round(offsetX / SCREEN_WIDTH);
      if (page !== activePage && page >= 0 && page < PAGES.length) {
        setActivePage(page);
      }
    },
    [activePage]
  );

  const markOnboardingDone = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // ignore
    }
  }, []);

  const handleSkip = useCallback(async () => {
    await markOnboardingDone();
    router.replace('/(auth)/login');
  }, [markOnboardingDone, router]);

  const handleNext = useCallback(() => {
    if (activePage < PAGES.length - 1) {
      scrollRef.current?.scrollTo({
        x: SCREEN_WIDTH * (activePage + 1),
        animated: true,
      });
    }
  }, [activePage]);

  const handleCreateAccount = useCallback(async () => {
    await markOnboardingDone();
    router.replace('/(auth)/login');
  }, [markOnboardingDone, router]);

  const handleAlreadyHaveAccount = useCallback(async () => {
    await markOnboardingDone();
    router.replace('/(auth)/login');
  }, [markOnboardingDone, router]);

  const isLastPage = activePage === PAGES.length - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Skip button — hidden on last page */}
      {!isLastPage && (
        <TouchableOpacity
          style={[styles.skipButton, { top: insets.top + spacing.sm }]}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      )}

      {/* Horizontal paging ScrollView */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        style={styles.scrollView}
      >
        {PAGES.map((page, index) => (
          <View key={index} style={styles.page}>
            <View style={styles.pageContent}>
              {/* Animated icon */}
              <Animated.Text
                style={[
                  styles.icon,
                  { opacity: iconAnimations[index] },
                ]}
              >
                {page.icon}
              </Animated.Text>

              {/* Title */}
              <Text style={styles.title}>{t(page.titleKey)}</Text>

              {/* Description */}
              <Text style={styles.description}>{t(page.descKey)}</Text>
            </View>

            {/* Page-specific bottom content */}
            <View style={styles.bottomSection}>
              {/* Page dots */}
              <View style={styles.dotsContainer}>
                {PAGES.map((_, dotIndex) => (
                  <View
                    key={dotIndex}
                    style={[
                      styles.dot,
                      dotIndex === index
                        ? { backgroundColor: page.accentColor }
                        : { backgroundColor: colors.border },
                    ]}
                  />
                ))}
              </View>

              {/* Buttons */}
              {index < PAGES.length - 1 ? (
                <TouchableOpacity
                  style={[styles.nextButton, { backgroundColor: page.accentColor }]}
                  onPress={handleNext}
                  activeOpacity={0.8}
                >
                  <Text style={styles.nextButtonText}>
                    {t('onboarding.next')} {'\u2192'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.lastPageButtons}>
                  <TouchableOpacity
                    style={[styles.createAccountButton, { backgroundColor: page.accentColor }]}
                    onPress={handleCreateAccount}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.createAccountText}>
                      {t('onboarding.createAccount')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleAlreadyHaveAccount}
                    activeOpacity={0.7}
                    style={styles.alreadyHaveAccountButton}
                  >
                    <Text style={[styles.alreadyHaveAccountText, { color: colors.accent }]}>
                      {t('onboarding.alreadyHaveAccount')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
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
    scrollView: {
      flex: 1,
    },
    skipButton: {
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
    page: {
      width: SCREEN_WIDTH,
      flex: 1,
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xxxl,
    },
    pageContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    icon: {
      fontSize: 72,
      marginBottom: spacing.xxxl,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    description: {
      fontSize: 16,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 24,
      paddingHorizontal: spacing.lg,
    },
    bottomSection: {
      alignItems: 'center',
      paddingBottom: spacing.section,
    },
    dotsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.xxl,
      gap: spacing.sm,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    nextButton: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xxxl,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nextButtonText: {
      color: '#080D14',
      fontSize: 16,
      fontWeight: '700',
    },
    lastPageButtons: {
      width: '100%',
      alignItems: 'center',
    },
    createAccountButton: {
      width: '100%',
      paddingVertical: spacing.lg,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    createAccountText: {
      color: '#080D14',
      fontSize: 17,
      fontWeight: '800',
    },
    alreadyHaveAccountButton: {
      marginTop: spacing.lg,
      paddingVertical: spacing.sm,
    },
    alreadyHaveAccountText: {
      fontSize: 15,
      fontWeight: '600',
    },
  });
