// =============================================================================
// ZURT - Connect Bank via Pluggy Connect (WebView)
// Replicates web flow: list connections → connect new → WebView → sync
// =============================================================================

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';
import {
  fetchConnections, getConnectToken, createConnection,
  syncConnection, deleteConnection, syncAllFinance,
} from '../src/services/api';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { AppIcon } from '../src/hooks/useIcon';
import { logger } from '../src/utils/logger';

// =============================================================================
// Types
// =============================================================================

interface Connection {
  id: string;
  itemId?: string;
  connectorName?: string;
  connector_name?: string;
  institutionName?: string;
  institution_name?: string;
  name?: string;
  status?: string;
  lastSync?: string;
  last_sync?: string;
  updatedAt?: string;
  updated_at?: string;
  imageUrl?: string;
  image_url?: string;
  logo?: string;
}

type ScreenState = 'list' | 'connecting' | 'webview' | 'syncing';

// =============================================================================
// Helpers
// =============================================================================

const getConnectionName = (c: Connection): string =>
  c.connectorName ?? c.connector_name ?? c.institutionName ?? c.institution_name ?? c.name ?? 'Bank';

const getConnectionLogo = (c: Connection): string | undefined =>
  c.imageUrl ?? c.image_url ?? c.logo;

const getConnectionStatus = (c: Connection): string =>
  (c.status ?? 'connected').toLowerCase();

const getLastSync = (c: Connection): string | undefined =>
  c.lastSync ?? c.last_sync ?? c.updatedAt ?? c.updated_at;

const getInitials = (name: string): string =>
  name.split(' ').filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2);

// =============================================================================
// Injected JS to bridge Pluggy widget postMessage → RN WebView onMessage
// =============================================================================

const INJECTED_JS = `
(function() {
  var origPostMessage = window.postMessage;
  window.postMessage = function(data) {
    try {
      window.ReactNativeWebView.postMessage(typeof data === 'string' ? data : JSON.stringify(data));
    } catch(e) {}
    return origPostMessage.apply(window, arguments);
  };

  window.addEventListener('message', function(event) {
    try {
      var d = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
      window.ReactNativeWebView.postMessage(d);
    } catch(e) {}
  });
})();
true;
`;

// =============================================================================
// Screen
// =============================================================================

export default function ConnectBankScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [screenState, setScreenState] = useState<ScreenState>('list');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const completedRef = useRef(false);
  const webViewRef = useRef<WebView>(null);

  // ---------------------------------------------------------------------------
  // Load connections
  // ---------------------------------------------------------------------------

  const loadConnections = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await fetchConnections();
      setConnections(Array.isArray(data) ? data : []);
    } catch (err) {
      logger.log('[ConnectBank] fetchConnections error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadConnections(true);
  }, [loadConnections]);

  // ---------------------------------------------------------------------------
  // Connect new bank
  // ---------------------------------------------------------------------------

  const handleConnectNew = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScreenState('connecting');
    completedRef.current = false;
    try {
      const token = await getConnectToken();
      if (!token) throw new Error(t('connect.noTokenError'));
      setConnectToken(token);
      setScreenState('webview');
    } catch (err: any) {
      logger.log('[ConnectBank] getConnectToken error:', err);
      Alert.alert(t('connect.connectionFailed'), err?.message ?? t('connect.initiateError'));
      setScreenState('list');
    }
  }, [t]);

  // ---------------------------------------------------------------------------
  // Pluggy success handler
  // ---------------------------------------------------------------------------

  const handlePluggySuccess = useCallback(async (itemId: string) => {
    if (completedRef.current) return;
    completedRef.current = true;
    setScreenState('syncing');
    logger.log('[ConnectBank] Pluggy success, itemId:', itemId);
    try {
      await createConnection(itemId);
      await syncAllFinance();
    } catch (err: any) {
      logger.log('[ConnectBank] createConnection/sync error:', err);
    } finally {
      setScreenState('list');
      loadConnections();
    }
  }, [loadConnections]);

  // ---------------------------------------------------------------------------
  // WebView message handler
  // ---------------------------------------------------------------------------

  const handleWebViewMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const raw = event.nativeEvent.data;
        let data: any;
        try { data = JSON.parse(raw); } catch { data = { message: raw }; }
        logger.log('[ConnectBank] WebView message:', data?.event ?? data);

        if (completedRef.current) return;

        // Extract itemId from various Pluggy message formats
        let itemId: string | null =
          data?.itemId ?? data?.item_id ?? data?.item?.id ?? null;

        // Check message/url params format
        if (!itemId && data?.message && typeof data.message === 'string') {
          const params = new URLSearchParams(data.message.replace(/^\?/, ''));
          itemId = params.get('item_id') ?? params.get('itemId') ?? null;
          const itemStatus = params.get('item_status');
          const execStatus = params.get('execution_status');
          if (itemStatus === 'UPDATING' || execStatus === 'LOGIN_IN_PROGRESS') return;
        }

        if (itemId) {
          handlePluggySuccess(String(itemId));
          return;
        }

        // Handle close/cancel
        if (data?.event === 'close' || data?.event === 'cancel' ||
            data?.event === 'EXIT' || data?.event === 'CLOSE') {
          setScreenState('list');
          setConnectToken(null);
        }
      } catch { /* ignore parse errors */ }
    }, [handlePluggySuccess],
  );

  // ---------------------------------------------------------------------------
  // WebView navigation handler (fallback for URL-based callbacks)
  // ---------------------------------------------------------------------------

  const handleWebViewNavigation = useCallback(
    (navState: { url: string }) => {
      const { url } = navState;
      if (completedRef.current) return;

      const hasItemId = url.includes('item_id=') || url.includes('itemId=');
      const isUpdating = url.includes('item_status=UPDATING') || url.includes('execution_status=LOGIN_IN_PROGRESS');

      if (hasItemId && !isUpdating) {
        let itemId: string | null = null;
        try {
          const urlObj = new URL(url);
          itemId = urlObj.searchParams.get('item_id') ?? urlObj.searchParams.get('itemId') ?? null;
        } catch {
          const match = url.match(/(?:item_id|itemId)=([^&]+)/);
          itemId = match?.[1] ?? null;
        }
        if (itemId) handlePluggySuccess(itemId);
      }

      if (!completedRef.current && (url.includes('/close') || url.includes('/cancel'))) {
        setScreenState('list');
        setConnectToken(null);
      }
    }, [handlePluggySuccess],
  );

  // ---------------------------------------------------------------------------
  // Per-connection sync
  // ---------------------------------------------------------------------------

  const handleSync = useCallback(async (connectionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSyncingId(connectionId);
    try {
      await syncConnection(connectionId);
      await syncAllFinance();
      await loadConnections(true);
    } catch (err: any) {
      logger.log('[ConnectBank] syncConnection error:', err);
      Alert.alert(t('connect.error'), err?.message ?? t('connect.syncFailedShort'));
    } finally {
      setSyncingId(null);
    }
  }, [loadConnections, t]);

  // ---------------------------------------------------------------------------
  // Per-connection delete
  // ---------------------------------------------------------------------------

  const handleDelete = useCallback((connection: Connection) => {
    const name = getConnectionName(connection);
    Alert.alert(
      t('connect.deleteTitle'),
      `${t('connect.deleteMessage')} ${name}?`,
      [
        { text: t('connect.cancel'), style: 'cancel' },
        {
          text: t('connect.delete'), style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              await deleteConnection(connection.id);
              setConnections((prev) => prev.filter((c) => c.id !== connection.id));
            } catch (err: any) {
              logger.log('[ConnectBank] deleteConnection error:', err);
              Alert.alert(t('connect.error'), err?.message ?? t('connect.somethingWentWrong'));
            }
          },
        },
      ],
    );
  }, [t]);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const handleGoBack = useCallback(() => {
    if (screenState === 'webview') {
      Alert.alert(t('connect.cancelTitle'), t('connect.cancelMessage'), [
        { text: t('connect.continue'), style: 'cancel' },
        {
          text: t('connect.cancel'), style: 'destructive',
          onPress: () => { setScreenState('list'); setConnectToken(null); },
        },
      ]);
      return;
    }
    if (router.canGoBack()) { router.back(); } else { router.replace('/(tabs)'); }
  }, [screenState, router, t]);

  // ---------------------------------------------------------------------------
  // Status badge
  // ---------------------------------------------------------------------------

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case 'connected':
      case 'updated':
        return { label: t('connect.statusConnected'), bg: colors.positive + '20', color: colors.positive };
      case 'pending':
      case 'updating':
      case 'login_in_progress':
        return { label: t('connect.statusPending'), bg: colors.warning + '20', color: colors.warning };
      case 'needs_reauth':
      case 'waiting_user_input':
      case 'outdated':
        return { label: t('connect.statusReauth'), bg: '#FF8C00' + '20', color: '#FF8C00' };
      default:
        return { label: t('connect.statusError'), bg: colors.negative + '20', color: colors.negative };
    }
  }, [colors, t]);

  // ---------------------------------------------------------------------------
  // Format last sync date
  // ---------------------------------------------------------------------------

  const formatLastSync = useCallback((dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return t('connect.justNow');
      if (diffMin < 60) return `${diffMin}min`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d`;
    } catch { return null; }
  }, [t]);

  // ---------------------------------------------------------------------------
  // Render: Connection card
  // ---------------------------------------------------------------------------

  const renderConnectionCard = useCallback(({ item }: { item: Connection }) => {
    const name = getConnectionName(item);
    const logo = getConnectionLogo(item);
    const status = getConnectionStatus(item);
    const badge = getStatusBadge(status);
    const lastSync = formatLastSync(getLastSync(item));
    const isSyncing = syncingId === item.id;

    return (
      <View style={styles.connectionCard}>
        <View style={styles.connectionRow}>
          <View style={[styles.connectionLogo, { backgroundColor: accentColor + '15' }]}>
            {logo ? (
              <View style={styles.connectionLogoImg}>
                <Text style={[styles.connectionInitials, { color: accentColor }]}>{getInitials(name)}</Text>
              </View>
            ) : (
              <Text style={[styles.connectionInitials, { color: accentColor }]}>{getInitials(name)}</Text>
            )}
          </View>
          <View style={styles.connectionInfo}>
            <Text style={styles.connectionName} numberOfLines={1}>{name}</Text>
            <View style={styles.connectionMeta}>
              <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
              </View>
              {lastSync && (
                <Text style={styles.lastSyncText}>{t('connect.lastSync')} {lastSync}</Text>
              )}
            </View>
          </View>
        </View>
        <View style={styles.connectionActions}>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.border }]}
            onPress={() => handleSync(item.id)}
            disabled={isSyncing}
            activeOpacity={0.7}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={accentColor} />
            ) : (
              <AppIcon name="refresh" size={16} color={accentColor} />
            )}
            <Text style={[styles.actionText, { color: accentColor }]}>
              {isSyncing ? t('connect.syncingData') : t('connect.sync')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.negative + '40' }]}
            onPress={() => handleDelete(item)}
            activeOpacity={0.7}
          >
            <AppIcon name="close" size={14} color={colors.negative} />
            <Text style={[styles.actionText, { color: colors.negative }]}>{t('connect.delete')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [styles, colors, accentColor, syncingId, handleSync, handleDelete, getStatusBadge, formatLastSync, t]);

  // ---------------------------------------------------------------------------
  // Render: Empty state
  // ---------------------------------------------------------------------------

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <AppIcon name="bank" size={48} color={accentColor} />
        <Text style={styles.emptyTitle}>{t('connect.noConnections')}</Text>
        <Text style={styles.emptyDescription}>{t('connect.noConnectionsDesc')}</Text>
      </View>
    );
  }, [isLoading, styles, accentColor, t]);

  // ---------------------------------------------------------------------------
  // Render: WebView
  // ---------------------------------------------------------------------------

  const renderWebView = () => {
    if (!connectToken) return null;
    const connectUrl = `https://connect.pluggy.ai/?connect_token=${connectToken}`;
    return (
      <View style={styles.webViewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: connectUrl }}
          style={styles.webView}
          injectedJavaScript={INJECTED_JS}
          onNavigationStateChange={handleWebViewNavigation}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.webViewLoading}>
              <ActivityIndicator size="large" color={accentColor} />
              <Text style={styles.loadingText}>{t('connect.connecting')}</Text>
            </View>
          )}
          onError={(e) => {
            logger.log('[ConnectBank] WebView error:', e.nativeEvent);
            Alert.alert(t('connect.connectionFailed'), t('connect.webviewLoadError'));
            setScreenState('list');
          }}
          onHttpError={(e) => {
            if (e.nativeEvent.statusCode >= 400) {
              logger.log('[ConnectBank] WebView HTTP error:', e.nativeEvent.statusCode);
              Alert.alert(t('connect.connectionFailed'), t('connect.webviewHttpError'));
              setScreenState('list');
            }
          }}
        />
      </View>
    );
  };

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <AppIcon name="back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {screenState === 'webview' ? t('connect.connectYourBank') : t('connect.title')}
          </Text>
          {screenState === 'list' && <Text style={styles.headerSubtitle}>Open Finance</Text>}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* List screen */}
      {(screenState === 'list') && (
        <View style={{ flex: 1 }}>
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={accentColor} />
            </View>
          ) : (
            <FlatList
              data={connections}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderConnectionCard}
              ListEmptyComponent={renderEmpty}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor={accentColor}
                  colors={[accentColor]}
                />
              }
              ListFooterComponent={<View style={{ height: insets.bottom + 100 }} />}
            />
          )}
          {/* Connect new bank FAB */}
          <View style={[styles.fabContainer, { bottom: insets.bottom + 24 }]}>
            <TouchableOpacity
              style={[styles.fab, { backgroundColor: accentColor }]}
              onPress={handleConnectNew}
              activeOpacity={0.8}
            >
              <AppIcon name="add" size={20} color="#FFF" />
              <Text style={styles.fabText}>{t('connect.connectNewBank')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Connecting state */}
      {screenState === 'connecting' && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={styles.connectingText}>{t('connect.preparingConnection')}</Text>
        </View>
      )}

      {/* WebView */}
      {screenState === 'webview' && renderWebView()}

      {/* Syncing state */}
      {screenState === 'syncing' && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={styles.connectingText}>{t('connect.syncingData')}</Text>
          <Text style={styles.syncSubtext}>{t('connect.mayTakeAMoment')}</Text>
        </View>
      )}
    </View>
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
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text.primary },
  headerSubtitle: { fontSize: 12, color: colors.accent, marginTop: 2, fontWeight: '500' },
  headerSpacer: { width: 36 },

  // List
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, flexGrow: 1 },
  connectionCard: {
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  connectionRow: { flexDirection: 'row', alignItems: 'center' },
  connectionLogo: {
    width: 44, height: 44, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  connectionLogoImg: {
    width: 44, height: 44, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  connectionInitials: { fontSize: 16, fontWeight: '700' },
  connectionInfo: { flex: 1, marginLeft: spacing.md },
  connectionName: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  connectionMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: spacing.sm },
  statusBadge: {
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: radius.full,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  lastSyncText: { fontSize: 11, color: colors.text.muted },
  connectionActions: {
    flexDirection: 'row', gap: spacing.sm,
    marginTop: spacing.sm, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.sm, borderRadius: radius.sm,
    borderWidth: 1, gap: 6,
  },
  actionText: { fontSize: 13, fontWeight: '600' },

  // Empty state
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xxl, paddingTop: spacing.section,
  },
  emptyTitle: {
    fontSize: 20, fontWeight: '700', color: colors.text.primary,
    textAlign: 'center', marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: 14, color: colors.text.secondary, textAlign: 'center', lineHeight: 20,
  },

  // FAB
  fabContainer: {
    position: 'absolute', left: 0, right: 0,
    alignItems: 'center',
  },
  fab: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: radius.full, gap: spacing.sm,
    elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4,
  },
  fabText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  // Center / loading
  centerContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxxl,
  },
  connectingText: {
    fontSize: 16, fontWeight: '600', color: colors.text.primary,
    textAlign: 'center', marginTop: spacing.lg,
  },
  syncSubtext: {
    fontSize: 14, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.sm,
  },
  loadingText: {
    fontSize: 14, color: colors.text.secondary, marginTop: spacing.md,
  },

  // WebView
  webViewContainer: { flex: 1 },
  webView: { flex: 1, backgroundColor: colors.background },
  webViewLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background,
  },
});
