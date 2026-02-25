import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { type ThemeColors } from '../../theme/colors';
import { useSettingsStore } from '../../stores/settingsStore';

interface AIMarkdownProps {
  content: string;
}

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

export function AIMarkdown({ content }: AIMarkdownProps) {
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createMarkdownStyles(colors), [colors]);

  return <Markdown style={styles}>{content}</Markdown>;
}
