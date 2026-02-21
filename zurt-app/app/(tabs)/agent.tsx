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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import { type ThemeColors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { useAgentStore, type ChatMessage } from '../../src/stores/agentStore';
import { useSettingsStore } from '../../src/stores/settingsStore';

// ===========================================================================
// Markdown Styles (dynamic theme)
// ===========================================================================

const createMarkdownStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    body: { color: colors.text.primary, fontSize: 14, lineHeight: 22 },
    heading1: { color: colors.text.primary, fontSize: 20, fontWeight: '700' as const, marginBottom: 8 },
    heading2: { color: colors.text.primary, fontSize: 18, fontWeight: '600' as const, marginBottom: 6 },
    heading3: { color: colors.accent, fontSize: 16, fontWeight: '600' as const, marginBottom: 4 },
    strong: { color: colors.text.primary, fontWeight: '700' as const },
    em: { color: colors.text.secondary, fontStyle: 'italic' as const },
    bullet_list: { marginLeft: 8 },
    ordered_list: { marginLeft: 8 },
    list_item: { marginBottom: 4 },
    code_inline: { backgroundColor: colors.cardAlt, color: colors.accent, paddingHorizontal: 4, borderRadius: 4, fontSize: 13 },
    code_block: { backgroundColor: colors.cardAlt, padding: 12, borderRadius: 8, marginVertical: 8 },
    fence: { backgroundColor: colors.cardAlt, padding: 12, borderRadius: 8, marginVertical: 8 },
    blockquote: { borderLeftColor: colors.accent, borderLeftWidth: 3, paddingLeft: 12, marginVertical: 8, backgroundColor: colors.card },
    link: { color: colors.accent },
    hr: { backgroundColor: colors.border, height: 1, marginVertical: 12 },
    table: { borderColor: colors.border },
    thead: { backgroundColor: colors.cardAlt },
    th: { color: colors.text.primary, fontWeight: '600' as const, padding: 8 },
    td: { color: colors.text.primary, padding: 8, borderColor: colors.border },
    paragraph: { marginTop: 0, marginBottom: 8 },
  });

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
        <View style={styles.avatar}><Text style={styles.avatarText}>&#x2728;</Text></View>
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
// Animated Empty State
// ===========================================================================

function EmptyState({ t, onSuggestion }: { t: (k: string) => string; onSuggestion: (s: string) => void }) {
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const fadeAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0.4, duration: 2000, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const initialSuggestions = [
    t('agent.suggestMarket'),
    t('agent.suggestPortfolio'),
    t('agent.suggestDollar'),
    t('agent.suggestSelic'),
  ];

  return (
    <View style={styles.emptyState}>
      <Animated.Text style={[styles.emptyIcon, { opacity: fadeAnim }]}>&#x2728;</Animated.Text>
      <Text style={styles.emptyTitle}>{t('agent.emptyHello')}</Text>
      <Text style={styles.emptyDescription}>{t('agent.emptyDescription2')}</Text>
      <View style={styles.initialSuggestions}>
        {initialSuggestions.map((s, i) => (
          <TouchableOpacity
            key={i}
            style={styles.initialChip}
            onPress={() => onSuggestion(s)}
            activeOpacity={0.7}
          >
            <Text style={styles.initialChipText}>{s}</Text>
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

function MessageBubble({ message, onSuggestionPress, isLast }: {
  message: ChatMessage;
  onSuggestionPress: (text: string) => void;
  isLast: boolean;
}) {
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const markdownStyles = useMemo(() => createMarkdownStyles(colors), [colors]);

  const isUser = message.role === 'user';

  return (
    <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
      {/* Avatar for AI */}
      {!isUser && (
        <View style={styles.avatarCol}>
          <View style={styles.avatar}><Text style={styles.avatarText}>&#x2728;</Text></View>
        </View>
      )}

      <View style={styles.bubbleCol}>
        <View style={isUser ? styles.userBubble : styles.aiBubble}>
          {isUser ? (
            <Text style={styles.userMessageText}>{message.content}</Text>
          ) : (
            <Markdown style={markdownStyles}>{message.content}</Markdown>
          )}
        </View>

        {/* Timestamp */}
        <Text style={[styles.timestamp, isUser && styles.timestampUser]}>
          {formatTime(message.timestamp)}
        </Text>

        {/* Suggestion chips (only on last AI message) */}
        {!isUser && isLast && message.suggestions && message.suggestions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.suggestionsScroll}
            contentContainerStyle={styles.suggestionsRow}
          >
            {message.suggestions.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggestionChip}
                onPress={() => onSuggestionPress(s)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

// ===========================================================================
// Agent Screen
// ===========================================================================

export default function AgentScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState('');
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

  useEffect(() => {
    loadInitialInsights();
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  }, [messages, isLoading]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    setInputText('');
    sendMessage(text);
  }, [inputText, isLoading, sendMessage]);

  const handleSuggestionPress = useCallback((text: string) => {
    if (isLoading) return;
    sendMessage(text);
  }, [isLoading, sendMessage]);

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

  // Find last assistant message index
  const lastAiIndex = messages.reduce((acc, m, i) => (m.role === 'assistant' ? i : acc), -1);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>&#x2728;</Text>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('agent.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('agent.subtitle')}</Text>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearHistory}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.clearIcon}>&#x1F5D1;&#xFE0F;</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.flex1}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Empty state */}
          {messages.length === 0 && !isLoading && !error && !rateLimited && (
            <EmptyState t={t} onSuggestion={handleSuggestionPress} />
          )}

          {/* Rate limited */}
          {rateLimited && (
            <View style={styles.rateLimitCard}>
              <Text style={styles.rateLimitIcon}>&#x26A0;&#xFE0F;</Text>
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
              onSuggestionPress={handleSuggestionPress}
              isLast={idx === lastAiIndex}
            />
          ))}

          {/* Typing indicator */}
          {isLoading && <TypingIndicator />}
        </ScrollView>

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
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
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            activeOpacity={0.7}
            disabled={!inputText.trim() || isLoading}
          >
            <Text style={styles.sendIcon}>&#x27A4;</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
      paddingBottom: spacing.lg,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    headerIcon: { fontSize: 28, marginRight: spacing.md },
    headerCenter: { flex: 1 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
    headerSubtitle: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
    clearButton: { padding: spacing.xs },
    clearIcon: { fontSize: 20 },

    // Messages
    messagesContent: {
      padding: spacing.lg,
      paddingBottom: spacing.md,
      flexGrow: 1,
    },
    messageRow: {
      flexDirection: 'row',
      marginBottom: spacing.lg,
      maxWidth: '88%',
    },
    messageRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },

    // Avatar
    avatarCol: { marginRight: spacing.sm, paddingTop: 2 },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.accent + '20',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontSize: 14 },

    // Bubble column
    bubbleCol: { flex: 1 },

    // AI bubble
    aiBubble: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
      padding: spacing.lg,
    },

    // User bubble
    userBubble: {
      backgroundColor: colors.accent,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    userMessageText: { fontSize: 14, color: colors.background, lineHeight: 22 },

    // Timestamp
    timestamp: {
      fontSize: 10,
      color: colors.text.muted,
      marginTop: 4,
      marginLeft: spacing.sm,
    },
    timestampUser: { textAlign: 'right', marginRight: spacing.sm, marginLeft: 0 },

    // Suggestions
    suggestionsScroll: { marginTop: spacing.sm },
    suggestionsRow: { gap: spacing.xs, paddingRight: spacing.md },
    suggestionChip: {
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
    },
    suggestionText: { fontSize: 12, color: colors.accent, fontWeight: '500' },

    // Typing indicator
    typingDots: { flexDirection: 'row', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },

    // Empty state
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyIcon: { fontSize: 56, marginBottom: spacing.xl },
    emptyTitle: {
      fontSize: 20,
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
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.xl,
    },
    initialSuggestions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    initialChip: {
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: radius.full,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: colors.accent + '10',
    },
    initialChipText: { fontSize: 13, color: colors.accent, fontWeight: '500' },

    // Rate limit
    rateLimitCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.warning,
      padding: spacing.xl,
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    rateLimitIcon: { fontSize: 32, marginBottom: spacing.md },
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
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      borderTopWidth: 0.5,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    input: {
      flex: 1,
      backgroundColor: colors.input,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: 14,
      color: colors.text.primary,
      maxHeight: 100,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: spacing.sm,
    },
    sendButtonDisabled: { opacity: 0.4 },
    sendIcon: { fontSize: 18, color: colors.background },
  });
