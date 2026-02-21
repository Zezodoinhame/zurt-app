import { TextStyle } from 'react-native';

export const typography = {
  hero: {
    fontSize: 32,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 16,
  },
  micro: {
    fontSize: 10,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 14,
  },
  number: {
    fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
  },
} as const;

export type Typography = typeof typography;
