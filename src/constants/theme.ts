/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  primary: '#CCCCFF',
  primaryLight: '#E0E0FF',
  primaryDark: '#9999FF',
  accent: '#F89E62',
  accentLight: '#FFC49B',
  primaryFaded: '#F2F2FF',
  primaryFadedDark: '#202040',

  income: '#4CAF7D',
  expense: '#E57373',
  transfer: '#64B5F6',
  warning: '#FFB74D',
  success: '#66BB6A',
  error: '#EF5350',

  light: {
    text: '#1A1C2E',
    textSecondary: '#6B6E82',
    background: '#F8F8FC',
    backgroundElement: '#EEEFF6',
    backgroundSelected: '#E0E2F0',
    surface: '#FFFFFF',
    border: '#D8DAE8',
  },
  dark: {
    text: '#ECEDF5',
    textSecondary: '#9A9DB5',
    background: '#0F1019',
    backgroundElement: '#1C1D2E',
    backgroundSelected: '#2A2C40',
    surface: '#16172A',
    border: '#2E3048',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
