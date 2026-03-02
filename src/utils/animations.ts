import { Easing } from 'react-native';

// Spring configs
export const springConfig = {
  gentle: { damping: 20, stiffness: 150, mass: 1 },
  bouncy: { damping: 12, stiffness: 200, mass: 0.8 },
  stiff: { damping: 26, stiffness: 300, mass: 1 },
} as const;

// Timing configs
export const timingConfig = {
  fast: { duration: 200, easing: Easing.out(Easing.cubic) },
  normal: { duration: 350, easing: Easing.out(Easing.cubic) },
  slow: { duration: 500, easing: Easing.out(Easing.cubic) },
  smooth: { duration: 600, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
} as const;

// Stagger delay for list items
export function staggerDelay(index: number, baseDelay = 50): number {
  return index * baseDelay;
}

// Shimmer animation - continuous loop position
export const SHIMMER_DURATION = 1500;
