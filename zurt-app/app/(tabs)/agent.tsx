import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  Keyboard,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { type ThemeColors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { useAgentStore, type ChatMessage } from '../../src/stores/agentStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { usePlanStore } from '../../src/stores/planStore';
import { UpgradeModal } from '../../src/components/shared/UpgradeGate';
import { UsageBadge } from '../../src/components/shared/UsageBadge';
import { AIMarkdown } from '../../src/components/shared/AIMarkdown';
import { AppIcon } from '../../src/hooks/useIcon';

// ===========================================================================
// Agent Avatar (gradient badge with sparkle)
// ===========================================================================

function AgentAvatar({ size = 32 }: { size?: number }) {
  const colors = useSettingsStore((s) => s.colors);
  return (
    <LinearGradient
      colors={[colors.accent, colors.accent + 'AA', colors.accent + '55']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppIcon name="sparkle" size={size * 0.5} color={colors.background} />
    </LinearGradient>
  );
}

// ===========================================================================
// Typing Indicator (pulsing dots)
// ===========================================================================

function TypingIndicator() {
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);
    a1.start();
    a2.start();
    a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -4, 0] }) },
    ],
  });

  return (
    <View style={styles.messageRow}>
      <View style={styles.avatarCol}>
        <AgentAvatar size={28} />
      </View>
      <View style={styles.aiBubble}>
        <View style={styles.typingDots}>
          <Animated.View style={[styles.dot, dotStyle(dot1)]} />
          <Animated.View style={[styles.dot, dotStyle(dot2)]} />
          <Animated.View style={[styles.dot, dotStyle(dot3)]} />
        </View>
      </View>
    </View>
  );
}

// ===========================================================================
// Welcome / Empty State
// ===========================================================================

function EmptyState({ t, onSuggestion }: { t: (k: string) => string; onSuggestion: (s: string) => void }) {
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const suggestions = [
    { icon: 'trending' as const, text: t('agent.suggestMarket') },
    { icon: 'chart' as const, text: t('agent.suggestPortfolio') },
    { icon: 'currency' as const, text: t('agent.suggestDollar') },
    { icon: 'gauge' as const, text: t('agent.suggestSelic') },
  ];

  return (
    <View style={styles.emptyState}>
      <Animated.View style={{ opacity: pulseAnim, marginBottom: spacing.xxl }}>
        <AgentAvatar size={72} />
      </Animated.View>
      <Text style={styles.emptyTitle}>{t('agent.emptyHello')}</Text>
      <Text style={styles.emptyDescription}>{t('agent.emptyDescription2')}</Text>

      <View style={styles.initialSuggestions}>
        {suggestions.map((s, i) => (
          <TouchableOpacity
            key={i}
            style={styles.suggestionCard}
            onPress={() => onSuggestion(s.text)}
            activeOpacity={0.7}
          >
            <View style={styles.suggestionCardIcon}>
              <AppIcon name={s.icon} size={18} color={colors.accent} />
            </View>
            <Text style={styles.suggestionCardText} numberOfLines={2}>{s.text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ===========================================================================
// Format timestamp
// ===========================================================================

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ===========================================================================
// Message Bubble
// ===========================================================================

function MessageBubble({ message, isLast }: {
  message: ChatMessage;
  isLast: boolean;
}) {
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isUser = message.role === 'user';

  return (
    <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
      {/* Avatar for AI */}
      {!isUser && (
        <View style={styles.avatarCol}>
          <AgentAvatar size={28} />
        </View>
      )}

      <View style={styles.bubbleCol}>
        <View style={isUser ? styles.userBubble : styles.aiBubble}>
          {isUser ? (
            <Text style={styles.userMessageText}>{message.content}</Text>
          ) : (
            <AIMarkdown content={message.content} />
          )}
        </View>

        {/* Timestamp */}
        <Text style={[styles.timestamp, isUser && styles.timestampUser]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </View>
  );
}

// ===========================================================================
// Bottom Suggestions (horizontal chips above input)
// ===========================================================================

function BottomSuggestions({ suggestions, onPress }: {
  suggestions: string[];
  onPress: (s: string) => void;
}) {
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!suggestions.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bottomSuggestionsScroll}
      contentContainerStyle={styles.bottomSuggestionsContent}
      keyboardShouldPersistTaps="handled"
    >
      {suggestions.map((s, i) => (
        <TouchableOpacity
          key={i}
          style={styles.bottomChip}
          onPress={() => onPress(s)}
          activeOpacity={0.7}
        >
          <Text style={styles.bottomChipText} numberOfLines={1}>{s}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ===========================================================================
// Agent Screen
// ===========================================================================

export default function AgentScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    messages,
    isLoading,
    error,
    rateLimited,
    loadInitialInsights,
    sendMessage,
    clearHistory,
  } = useAgentStore();

  const checkLimit = usePlanStore((s) => s.checkLimit);
  const incrementUsage = usePlanStore((s) => s.incrementUsage);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    loadInitialInsights();
  }, []);

  // Auto-scroll to end when messages change
  const scrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages, isLoading, scrollToEnd]);

  // Track keyboard visibility for dynamic padding
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      scrollToEnd();
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToEnd]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    if (!checkLimit('aiQueries')) {
      setShowUpgradeModal(true);
      return;
    }
    setInputText('');
    sendMessage(text);
    incrementUsage('aiQueries');
  }, [inputText, isLoading, sendMessage, checkLimit, incrementUsage]);

  const handleSuggestionPress = useCallback((text: string) => {
    if (isLoading) return;
    if (!checkLimit('aiQueries')) {
      setShowUpgradeModal(true);
      return;
    }
    sendMessage(text);
    incrementUsage('aiQueries');
  }, [isLoading, sendMessage, checkLimit, incrementUsage]);

  const handleClearHistory = useCallback(() => {
    Alert.alert(
      t('agent.clearTitle'),
      t('agent.clearMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('agent.clearConfirm'),
          style: 'destructive',
          onPress: () => clearHistory(),
        },
      ],
    );
  }, [t, clearHistory]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadInitialInsights();
    setIsRefreshing(false);
  }, [loadInitialInsights]);

  // Find last assistant message for suggestions
  const lastAiIndex = messages.reduce((acc, m, i) => (m.role === 'assistant' ? i : acc), -1);
  const lastAiSuggestions = lastAiIndex >= 0 ? messages[lastAiIndex]?.suggestions ?? [] : [];

  // Input bottom padding: small when keyboard open, safe area when closed
  const inputBottomPadding = keyboardVisible ? 8 : (insets.bottom > 0 ? 4 : 8);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <AgentAvatar size={36} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('agent.title')}</Text>
          <View style={styles.headerOnlineRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.headerOnlineText}>{t('agent.online')}</Text>
          </View>
        </View>
        <UsageBadge feature="aiQueries" compact />
        {messages.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearHistory}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <AppIcon name="delete" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.flex1}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
          onLayout={scrollToEnd}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
              progressBackgroundColor={colors.card}
            />
          }
        >
          {/* Empty state */}
          {messages.length === 0 && !isLoading && !error && !rateLimited && (
            <EmptyState t={t} onSuggestion={handleSuggestionPress} />
          )}

          {/* Rate limited */}
          {rateLimited && (
            <View style={styles.rateLimitCard}>
              <AppIcon name="warning" size={32} color={colors.warning} />
              <Text style={styles.rateLimitText}>{t('agent.rateLimited')}</Text>
            </View>
          )}

          {/* Error */}
          {error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={loadInitialInsights}
                activeOpacity={0.7}
              >
                <Text style={styles.retryText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Chat messages */}
          {messages.map((msg, idx) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isLast={idx === lastAiIndex}
            />
          ))}

          {/* Typing indicator */}
          {isLoading && <TypingIndicator />}
        </ScrollView>

        {/* Bottom suggestion chips (above input) */}
        {!isLoading && lastAiSuggestions.length > 0 && (
          <BottomSuggestions
            suggestions={lastAiSuggestions}
            onPress={handleSuggestionPress}
          />
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: inputBottomPadding }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder={t('agent.inputPlaceholder')}
              placeholderTextColor={colors.text.muted}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit
              editable={!rateLimited}
            />
            <TouchableOpacity style={styles.micButton} disabled activeOpacity={0.5}>
              <AppIcon name="radar" size={18} color={colors.text.muted + '60'} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            activeOpacity={0.7}
            disabled={!inputText.trim() || isLoading}
          >
            <LinearGradient
              colors={
                !inputText.trim() || isLoading
                  ? [colors.text.muted + '40', colors.text.muted + '40']
                  : [colors.accent, colors.accent + 'CC']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendButtonGradient}
            >
              <AppIcon name="send" size={18} color={colors.background} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <UpgradeModal
        feature="aiQueries"
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </View>
  );
}

// ===========================================================================
// Styles
// ===========================================================================

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    flex1: { flex: 1 },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: spacing.md,
    },
    headerCenter: { flex: 1 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
    headerOnlineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 6 },
    onlineDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.positive,
    },
    headerOnlineText: { fontSize: 12, color: colors.text.secondary },
    clearButton: { padding: spacing.xs },

    // Messages
    messagesContent: {
      padding: spacing.lg,
      paddingBottom: 8,
      flexGrow: 1,
    },
    messageRow: {
      flexDirection: 'row',
      marginBottom: spacing.lg,
      maxWidth: '85%',
    },
    messageRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },

    // Avatar
    avatarCol: { marginRight: spacing.sm, paddingTop: 2 },

    // Bubble column
    bubbleCol: { flex: 1 },

    // AI bubble
    aiBubble: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderTopLeftRadius: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: spacing.md,
      paddingHorizontal: spacing.lg,
    },

    // User bubble
    userBubble: {
      backgroundColor: colors.accent,
      borderRadius: radius.lg,
      borderTopRightRadius: 4,
      padding: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    userMessageText: { fontSize: 14, color: colors.background, lineHeight: 22 },

    // Timestamp
    timestamp: {
      fontSize: 10,
      color: colors.text.muted,
      marginTop: 4,
      marginLeft: spacing.xs,
    },
    timestampUser: { textAlign: 'right', marginRight: spacing.xs, marginLeft: 0 },

    // Typing indicator
    typingDots: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },

    // Empty state
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
    },
    emptyTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    emptyDescription: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: spacing.xxl,
      marginBottom: spacing.xxl,
    },
    initialSuggestions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    suggestionCard: {
      width: '46%',
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.sm,
    },
    suggestionCardIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.accent + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    suggestionCardText: {
      fontSize: 13,
      color: colors.text.primary,
      lineHeight: 18,
    },

    // Bottom suggestions (above input)
    bottomSuggestionsScroll: {
      maxHeight: 44,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    bottomSuggestionsContent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    bottomChip: {
      borderWidth: 1,
      borderColor: colors.accent + '50',
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      backgroundColor: colors.accent + '10',
    },
    bottomChipText: { fontSize: 12, color: colors.accent, fontWeight: '500' },

    // Rate limit
    rateLimitCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.warning,
      padding: spacing.xl,
      alignItems: 'center',
      marginBottom: spacing.lg,
      gap: spacing.md,
    },
    rateLimitText: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
    },

    // Error
    errorCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.negative,
      padding: spacing.xl,
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    errorText: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing.md },
    retryButton: {
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
    },
    retryText: { fontSize: 14, fontWeight: '600', color: colors.background },

    // Input bar
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      backgroundColor: colors.background,
      gap: spacing.sm,
    },
    inputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingRight: spacing.xs,
    },
    input: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
      fontSize: 14,
      color: colors.text.primary,
      maxHeight: 100,
    },
    micButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-end',
      marginBottom: 2,
    },
    sendButton: {
      marginBottom: Platform.OS === 'ios' ? 2 : 0,
    },
    sendButtonDisabled: { opacity: 0.5 },
    sendButtonGradient: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
