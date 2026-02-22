// =============================================================================
// ZURT - Connect Bank via Open Finance / Pluggy
// =============================================================================

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, Alert, Platform, Image, Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';
import {
  searchInstitutions, getConnectToken, createConnection, syncAllFinance,
} from '../src/services/api';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { AppIcon } from '../src/hooks/useIcon';
import { logger } from '../src/utils/logger';

interface InstitutionResult {
  id: string | number;
  name: string;
  imageUrl?: string;
  image_url?: string;
  logo?: string;
  primaryColor?: string;
  primary_color?: string;
  type?: string;
  country?: string;
}

type ScreenState = 'search' | 'connecting' | 'webview' | 'syncing' | 'success' | 'error';

export default function ConnectBankScreen() {
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [screenState, setScreenState] = useState<ScreenState>('search');
  const [searchText, setSearchText] = useState('');
  const [institutions, setInstitutions] = useState<InstitutionResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<InstitutionResult | null>(null);
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchCounterRef = useRef(0);
  const webViewRef = useRef<WebView>(null);

  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) { setInstitutions([]); setIsSearching(false); return; }
    setIsSearching(true);
    const currentCount = ++searchCounterRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        logger.log('[ConnectBank] Searching for:', text.trim());
        const results = await searchInstitutions(text.trim());
        // Only update if this is still the latest search
        if (currentCount === searchCounterRef.current) {
          logger.log('[ConnectBank] Results count:', results?.length ?? 0, 'for query:', text.trim());
          setInstitutions(results ?? []);
        }
      } catch (err) {
        logger.log('[ConnectBank] Search error:', err);
        if (currentCount === searchCounterRef.current) {
          setInstitutions([]);
        }
      } finally {
        if (currentCount === searchCounterRef.current) {
          setIsSearching(false);
        }
      }
    }, 300);
  }, []);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const handleSelectInstitution = useCallback(async (institution: InstitutionResult) => {
    Keyboard.dismiss();
    setSelectedInstitution(institution);
    setScreenState('connecting');
    setErrorMessage('');
    try {
      const token = await getConnectToken(String(institution.id));
      if (!token) throw new Error(t('connect.noTokenError'));
      setConnectToken(token);
      setScreenState('webview');
    } catch (err: any) {
      logger.log('[ConnectBank] getConnectToken error:', err);
      setErrorMessage(err?.message ?? t('connect.initiateError'));
      setScreenState('error');
    }
  }, [t]);

  const handleWebViewNavigationChange = useCallback(
    async (navState: WebViewNavigation) => {
      const { url } = navState;
      if (url.includes('success') || url.includes('item_id=') || url.includes('itemId=')) {
        setScreenState('syncing');
        let itemId: string | null = null;
        try {
          const urlObj = new URL(url);
          itemId = urlObj.searchParams.get('item_id') ?? urlObj.searchParams.get('itemId') ?? null;
        } catch {
          const match = url.match(/(?:item_id|itemId)=([^&]+)/);
          itemId = match?.[1] ?? null;
        }
        if (itemId) {
          try {
            await createConnection(itemId);
            await syncAllFinance();
            setScreenState('success');
          } catch (err: any) {
            logger.log('[ConnectBank] createConnection/sync error:', err);
            setErrorMessage(err?.message ?? t('connect.syncFailedLong'));
            setScreenState('error');
          }
        } else {
          try { await syncAllFinance(); setScreenState('success'); } catch { setScreenState('success'); }
        }
      }
      if (url.includes('close') || url.includes('cancel') || url.includes('error')) {
        if (screenState === 'webview') {
          setScreenState('search'); setConnectToken(null); setSelectedInstitution(null);
        }
      }
    }, [screenState, t],
  );

  const handleWebViewMessage = useCallback(
    async (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        const itemId = data?.itemId ?? data?.item_id ?? data?.item?.id;
        if (itemId) {
          setScreenState('syncing');
          try {
            await createConnection(String(itemId));
            await syncAllFinance();
            setScreenState('success');
          } catch (err: any) {
            logger.log('[ConnectBank] postMessage handler error:', err);
            setErrorMessage(err?.message ?? t('connect.syncFailedShort'));
            setScreenState('error');
          }
        }
        if (data?.event === 'close' || data?.event === 'cancel') {
          setScreenState('search'); setConnectToken(null); setSelectedInstitution(null);
        }
      } catch { /* ignore */ }
    }, [t],
  );

  const handleGoBack = useCallback(() => {
    if (screenState === 'webview') {
      Alert.alert(t('connect.cancelTitle'), t('connect.cancelMessage'), [
        { text: t('connect.continue'), style: 'cancel' },
        { text: t('connect.cancel'), style: 'destructive', onPress: () => {
          setScreenState('search'); setConnectToken(null); setSelectedInstitution(null);
        }},
      ]);
      return;
    }
    if (router.canGoBack()) { router.back(); } else { router.replace('/(tabs)'); }
  }, [screenState, router]);

  const handleDone = useCallback(() => {
    if (router.canGoBack()) { router.back(); } else { router.replace('/(tabs)'); }
  }, [router]);

  const handleRetry = useCallback(() => {
    setScreenState('search'); setConnectToken(null); setSelectedInstitution(null); setErrorMessage('');
  }, []);

  const getInstitutionLogo = (item: InstitutionResult): string | undefined =>
    item.imageUrl ?? item.image_url ?? item.logo;

  const getInstitutionColor = (item: InstitutionResult): string =>
    item.primaryColor ?? item.primary_color ?? colors.accent;

  const getInitials = (name: string): string =>
    name.split(' ').filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={handleGoBack} activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <AppIcon name="back" size={22} color={colors.text.primary} />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>
          {screenState === 'webview' ? selectedInstitution?.name ?? t('connect.title')
            : screenState === 'syncing' ? t('connect.syncingData')
              : screenState === 'success' ? t('connect.bankConnected') : t('connect.title')}
        </Text>
        {screenState === 'search' && <Text style={styles.headerSubtitle}>Open Finance</Text>}
      </View>
      <View style={styles.headerSpacer} />
    </View>
  );

  const renderSearch = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputWrapper}>
        <AppIcon name="search" size={16} color={colors.text.muted} />
        <TextInput style={styles.searchInput} placeholder={t('connect.searchPlaceholder')}
          placeholderTextColor={colors.text.muted} value={searchText} onChangeText={handleSearch}
          autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchText(''); setInstitutions([]); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <AppIcon name="close" size={14} color={colors.text.muted} />
          </TouchableOpacity>
        )}
      </View>
      {isSearching && (
        <View style={styles.searchingIndicator}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.searchingText}>{t('connect.searching')}</Text>
        </View>
      )}
    </View>
  );

  const renderInstitutionCard = ({ item }: { item: InstitutionResult }) => {
    const logo = getInstitutionLogo(item);
    const color = getInstitutionColor(item);
    return (
      <TouchableOpacity style={styles.institutionCard} onPress={() => handleSelectInstitution(item)} activeOpacity={0.7}>
        <View style={[styles.institutionLogoContainer, { backgroundColor: color + '20' }]}>
          {logo ? (
            <Image source={{ uri: logo }} style={styles.institutionLogo} resizeMode="contain" />
          ) : (
            <Text style={[styles.institutionInitials, { color }]}>{getInitials(item.name)}</Text>
          )}
        </View>
        <View style={styles.institutionInfo}>
          <Text style={styles.institutionName} numberOfLines={1}>{item.name}</Text>
          {item.type && <Text style={styles.institutionType}>{item.type}</Text>}
        </View>
        <AppIcon name="chevron" size={22} color={colors.text.muted} />
      </TouchableOpacity>
    );
  };

  const renderEmptySearch = () => {
    if (isSearching) return null;
    if (searchText.length === 0) {
      return (
        <View style={styles.emptyState}>
          <AppIcon name="bank" size={48} color={colors.accent} />
          <Text style={styles.emptyTitle}>{t('connect.connectYourBank')}</Text>
          <Text style={styles.emptyDescription}>
            {t('connect.connectDescription')}
          </Text>
          <View style={styles.featuresContainer}>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}><AppIcon name="security" size={18} color={colors.text.secondary} /></View>
              <Text style={styles.featureText}>{t('connect.bankEncryption')}</Text>
            </View>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}><AppIcon name="plug" size={18} color={colors.text.secondary} /></View>
              <Text style={styles.featureText}>{t('connect.autoSync')}</Text>
            </View>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}><AppIcon name="chart" size={18} color={colors.text.secondary} /></View>
              <Text style={styles.featureText}>{t('connect.investmentsAccountsCards')}</Text>
            </View>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}><AppIcon name="refresh" size={18} color={colors.text.secondary} /></View>
              <Text style={styles.featureText}>{t('connect.regulatedByCB')}</Text>
            </View>
          </View>
        </View>
      );
    }
    if (searchText.length >= 2 && institutions.length === 0) {
      return (
        <View style={styles.emptyState}>
          <AppIcon name="search" size={48} color={colors.text.secondary} />
          <Text style={styles.emptyTitle}>{t('connect.noResults')}</Text>
          <Text style={styles.emptyDescription}>
            {t('connect.noResultsFor')} "{searchText}". {t('connect.tryDifferent')}
          </Text>
        </View>
      );
    }
    return null;
  };

  const renderConnecting = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={styles.statusTitle}>{t('connect.preparingConnection')}</Text>
      <Text style={styles.statusDescription}>
        {t('connect.settingUp')}{' '}
        {selectedInstitution?.name ?? ''}.
      </Text>
    </View>
  );

  const renderWebView = () => {
    if (!connectToken) return null;
    const connectUrl = `https://connect.pluggy.ai/?connect_token=${connectToken}`;
    return (
      <View style={styles.webViewContainer}>
        <WebView ref={webViewRef} source={{ uri: connectUrl }} style={styles.webView}
          onNavigationStateChange={handleWebViewNavigationChange} onMessage={handleWebViewMessage}
          javaScriptEnabled domStorageEnabled startInLoadingState
          renderLoading={() => (
            <View style={styles.webViewLoading}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.webViewLoadingText}>{t('common.loading')}</Text>
            </View>
          )}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            logger.log('[ConnectBank] WebView error:', nativeEvent);
            setErrorMessage(t('connect.webviewLoadError'));
            setScreenState('error');
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            logger.log('[ConnectBank] WebView HTTP error:', nativeEvent.statusCode);
            if (nativeEvent.statusCode >= 400) {
              setErrorMessage(t('connect.webviewHttpError'));
              setScreenState('error');
            }
          }}
        />
      </View>
    );
  };

  const renderSyncing = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={styles.statusTitle}>{t('connect.syncingData')}</Text>
      <Text style={styles.statusDescription}>
        {t('connect.importingData')}{' '}
        {selectedInstitution?.name ?? ''}. {t('connect.mayTakeAMoment')}
      </Text>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.centerContainer}>
      <View style={styles.successIconContainer}>
        <AppIcon name="success" size={32} color={colors.accent} />
      </View>
      <Text style={styles.statusTitle}>{t('connect.bankConnected')}</Text>
      <Text style={styles.statusDescription}>
        {selectedInstitution?.name ?? ''} {t('connect.successDescription')}
      </Text>
      <TouchableOpacity style={styles.primaryButton} onPress={handleDone} activeOpacity={0.8}>
        <Text style={styles.primaryButtonText}>{t('connect.done')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderError = () => (
    <View style={styles.centerContainer}>
      <View style={styles.errorIconContainer}>
        <Text style={styles.errorIcon}>!</Text>
      </View>
      <Text style={styles.statusTitle}>{t('connect.connectionFailed')}</Text>
      <Text style={styles.statusDescription}>
        {errorMessage || t('connect.somethingWentWrong')}
      </Text>
      <TouchableOpacity style={styles.primaryButton} onPress={handleRetry} activeOpacity={0.8}>
        <Text style={styles.primaryButtonText}>{t('connect.tryAgain')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={handleDone} activeOpacity={0.8}>
        <Text style={styles.secondaryButtonText}>{t('connect.goBack')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {renderHeader()}
      {screenState === 'search' && (
        <>
          {renderSearch()}
          <FlatList data={institutions} keyExtractor={(item) => String(item.id)}
            renderItem={renderInstitutionCard} ListEmptyComponent={renderEmptySearch}
            contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false} />
        </>
      )}
      {screenState === 'connecting' && renderConnecting()}
      {screenState === 'webview' && renderWebView()}
      {screenState === 'syncing' && renderSyncing()}
      {screenState === 'success' && renderSuccess()}
      {screenState === 'error' && renderError()}
    </SafeAreaView>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backButton: {
    width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  backArrow: { fontSize: 24, color: colors.text.primary, marginTop: -2, fontWeight: '300' },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text.primary },
  headerSubtitle: { fontSize: 12, color: colors.accent, marginTop: 2, fontWeight: '500' },
  headerSpacer: { width: 36 },
  searchContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  searchInputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.input,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, height: 48,
  },
  searchIcon: { fontSize: 16, marginRight: spacing.sm },
  searchInput: {
    flex: 1, fontSize: 15, color: colors.text.primary, height: '100%',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  clearButton: { fontSize: 14, color: colors.text.muted, paddingLeft: spacing.sm },
  searchingIndicator: {
    flexDirection: 'row', alignItems: 'center', paddingTop: spacing.md, paddingLeft: spacing.xs,
  },
  searchingText: { fontSize: 13, color: colors.text.secondary, marginLeft: spacing.sm },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.section, flexGrow: 1 },
  institutionCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginTop: spacing.sm,
  },
  institutionLogoContainer: {
    width: 44, height: 44, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  institutionLogo: { width: 32, height: 32 },
  institutionInitials: { fontSize: 16, fontWeight: '700' },
  institutionInfo: { flex: 1, marginLeft: spacing.md },
  institutionName: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  institutionType: { fontSize: 12, color: colors.text.secondary, marginTop: 2, textTransform: 'capitalize' },
  chevron: { fontSize: 22, color: colors.text.muted, fontWeight: '300', marginLeft: spacing.sm },
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xxl, paddingTop: spacing.section,
  },
  emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
  emptyTitle: {
    fontSize: 20, fontWeight: '700', color: colors.text.primary,
    textAlign: 'center', marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: 14, color: colors.text.secondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xxl,
  },
  featuresContainer: {
    width: '100%', backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
  featureIcon: { marginRight: spacing.md, width: 28, alignItems: 'center' as const },
  featureText: { fontSize: 14, color: colors.text.secondary, flex: 1 },
  centerContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxxl,
  },
  statusTitle: {
    fontSize: 20, fontWeight: '700', color: colors.text.primary,
    textAlign: 'center', marginTop: spacing.xl, marginBottom: spacing.sm,
  },
  statusDescription: {
    fontSize: 14, color: colors.text.secondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xxl,
  },
  successIconContainer: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accent + '20',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.accent,
  },
  successIcon: { fontSize: 32, color: colors.accent, fontWeight: '700' },
  errorIconContainer: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.negative + '20',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.negative,
  },
  errorIcon: { fontSize: 32, color: colors.negative, fontWeight: '700' },
  primaryButton: {
    backgroundColor: colors.accent, paddingHorizontal: spacing.xxxl, paddingVertical: spacing.md,
    borderRadius: radius.md, minWidth: 200, alignItems: 'center', marginBottom: spacing.md,
  },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: colors.background },
  secondaryButton: {
    paddingHorizontal: spacing.xxxl, paddingVertical: spacing.md, borderRadius: radius.md,
    minWidth: 200, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '600', color: colors.text.secondary },
  webViewContainer: { flex: 1 },
  webView: { flex: 1, backgroundColor: colors.background },
  webViewLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background,
  },
  webViewLoadingText: { fontSize: 14, color: colors.text.secondary, marginTop: spacing.md },
});
