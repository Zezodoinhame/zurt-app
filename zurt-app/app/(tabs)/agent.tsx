import React, { useEffect, useRef, useCallback, useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { useAgentStore, type ChatMessage } from '../../src/stores/agentStore';
import { useSettingsStore } from '../../src/stores/settingsStore';

// ===========================================================================
// Typing Indicator
// ===========================================================================

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ]),
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, []);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }],
  });

  return (
    <View style={styles.typingContainer}>
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
// Message Bubble
// ===========================================================================

function MessageBubble({ message, onSuggestionPress }: {
  message: ChatMessage;
  onSuggestionPress: (text: string) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
      <View style={[
        isUser ? styles.userBubble : styles.aiBubble,
      ]}>
        <Text style={[styles.messageText, isUser && styles.userMessageText]}>
          {message.content}
        </Text>
      </View>
      {!isUser && message.suggestions && message.suggestions.length > 0 && (
        <View style={styles.suggestionsRow}>
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
        </View>
      )}
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

  const {
    messages,
    isLoading,
    error,
    rateLimited,
    loadInitialInsights,
    sendMessage,
  } = useAgentStore();

  useEffect(() => {
    loadInitialInsights();
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
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

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>&#x2728;</Text>
        <View>
          <Text style={styles.headerTitle}>{t('agent.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('agent.subtitle')}</Text>
        </View>
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
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>&#x2728;</Text>
              <Text style={styles.emptyTitle}>{t('agent.emptyTitle')}</Text>
              <Text style={styles.emptyDescription}>{t('agent.emptyDescription')}</Text>
            </View>
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
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onSuggestionPress={handleSuggestionPress}
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex1: {
    flex: 1,
  },

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
  headerIcon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // Messages
  messagesContent: {
    padding: spacing.xl,
    paddingBottom: spacing.md,
    flexGrow: 1,
  },
  messageRow: {
    marginBottom: spacing.lg,
    maxWidth: '85%',
  },
  messageRowUser: {
    alignSelf: 'flex-end',
  },

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

  messageText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 22,
  },
  userMessageText: {
    color: colors.background,
  },

  // Suggestions
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  suggestionChip: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  suggestionText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '500',
  },

  // Typing indicator
  typingContainer: {
    marginBottom: spacing.lg,
    maxWidth: '85%',
  },
  typingDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
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
  },

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
  rateLimitIcon: {
    fontSize: 32,
    marginBottom: spacing.md,
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
  errorText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background,
  },

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
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendIcon: {
    fontSize: 18,
    color: colors.background,
  },
});
