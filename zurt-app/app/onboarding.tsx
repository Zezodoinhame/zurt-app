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
import { useSettingsStore } from '../src/stores/settingsStore';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { AppIcon, type AppIconName } from '../src/hooks/useIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const ONBOARDING_KEY = 'zurt:onboarding_complete';

interface OnboardingPage {
  id: string;
  titleKey: string;
  descKey: string;
  iconName: AppIconName;
  accentColor: string;
}

const PAGES: OnboardingPage[] = [
  { id: '1', titleKey: 'onboarding.title1', descKey: 'onboarding.desc1', iconName: 'chart', accentColor: '#00D4AA' },
  { id: '2', titleKey: 'onboarding.title2', descKey: 'onboarding.desc2', iconName: 'sparkle', accentColor: '#A855F7' },
  { id: '3', titleKey: 'onboarding.title3', descKey: 'onboarding.desc3', iconName: 'family', accentColor: '#45B7D1' },
  { id: '4', titleKey: 'onboarding.title4', descKey: 'onboarding.desc4', iconName: 'rocket', accentColor: '#00D4AA' },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activePage, setActivePage] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Animated values per page for fade-in + scale
  const pageAnims = useRef(PAGES.map(() => new Animated.Value(0))).current;

  // Animate active page
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

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActivePage(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const markDone = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // ignore
    }
  }, []);

  const handleSkip = useCallback(async () => {
    await markDone();
    router.replace('/(auth)/login');
  }, [markDone, router]);

  const handleNext = useCallback(() => {
    if (activePage < PAGES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activePage + 1, animated: true });
    }
  }, [activePage]);

  const handleCreateAccount = useCallback(async () => {
    await markDone();
    router.replace('/(auth)/login');
  }, [markDone, router]);

  const handleLogin = useCallback(async () => {
    await markDone();
    router.replace('/(auth)/login');
  }, [markDone, router]);

  const isLastPage = activePage === PAGES.length - 1;

  const renderPage = useCallback(({ item, index }: { item: OnboardingPage; index: number }) => {
    const opacity = pageAnims[index];
    const scale = pageAnims[index].interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
    });

    return (
      <View style={styles.page}>
        {/* Gradient overlay effect */}
        <View style={styles.gradientTop} />

        <View style={styles.pageContent}>
          {/* Animated icon circle */}
          <Animated.View
            style={[
              styles.iconCircle,
              { backgroundColor: item.accentColor + '20', borderColor: item.accentColor + '40' },
              { opacity, transform: [{ scale }] },
            ]}
          >
            <AppIcon name={item.iconName} size={48} color={item.accentColor} />
          </Animated.View>

          {/* Title */}
          <Animated.Text style={[styles.title, { opacity }]}>
            {t(item.titleKey)}
          </Animated.Text>

          {/* Description */}
          <Animated.Text style={[styles.description, { opacity }]}>
            {t(item.descKey)}
          </Animated.Text>
        </View>

        {/* Bottom section */}
        <View style={styles.bottomSection}>
          {/* Dots */}
          <View style={styles.dotsContainer}>
            {PAGES.map((_, dotIndex) => (
              <View
                key={dotIndex}
                style={[
                  styles.dot,
                  dotIndex === index
                    ? { backgroundColor: item.accentColor, width: 24 }
                    : { backgroundColor: colors.border },
                ]}
              />
            ))}
          </View>

          {/* Buttons */}
          {index < PAGES.length - 1 ? (
            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: item.accentColor }]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>
                {t('onboarding.next')}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.lastPageButtons}>
              <TouchableOpacity
                style={[styles.createAccountButton, { backgroundColor: item.accentColor }]}
                onPress={handleCreateAccount}
                activeOpacity={0.8}
              >
                <Text style={styles.createAccountText}>
                  {t('onboarding.createAccount')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLogin}
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
    );
  }, [colors, pageAnims, t, handleNext, handleCreateAccount, handleLogin, styles]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Skip button */}
      {!isLastPage && (
        <TouchableOpacity
          style={[styles.skipButton, { top: insets.top + spacing.sm }]}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        data={PAGES}
        renderItem={renderPage}
        keyExtractor={(item) => item.id}
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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#080D14',
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
    gradientTop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 200,
      backgroundColor: '#0D1520',
      opacity: 0.5,
    },
    pageContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xxxl,
      borderWidth: 2,
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
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xxxl + spacing.xxxl,
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
