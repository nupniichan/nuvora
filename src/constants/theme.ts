/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  // Periwinkle is the brand accent. Keep everyday surfaces neutral and
  // reserve semantic colors for amounts, chart data, and status feedback.
  primary: '#CCCCFF',
  primaryLight: '#EEEEFF',
  primaryDark: '#6464A8',
  primaryStrong: '#454580',
  accent: '#CCCCFF',
  accentLight: '#F0F0FF',
  accentDark: '#454580',
  primaryFaded: '#F0F0FF',
  primaryFadedDark: '#282744',

  income: '#28745B',
  incomeLight: '#E6F3EC',
  expense: '#B34F62',
  expenseLight: '#FAEAF0',
  transfer: '#486CA8',
  transferLight: '#EAF0FC',
  warning: '#96631E',
  success: '#28745B',
  error: '#BB4052',

  light: {
    text: '#272833',
    textSecondary: '#6F707D',
    background: '#F8F8FA',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#EEEEFF',
    surface: '#FFFFFF',
    border: '#E0E0E6',
    elevatedBorder: '#E8E8ED',
    overlay: 'rgba(32, 32, 51, 0.44)',
  },
  dark: {
    text: '#ECEDF5',
    textSecondary: '#9A9DB5',
    background: '#0F1019',
    backgroundElement: '#1C1D2E',
    backgroundSelected: '#2A2C40',
    surface: '#16172A',
    border: '#2E3048',
    elevatedBorder: '#34364F',
    overlay: 'rgba(0, 0, 0, 0.62)',
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

export const Radius = {
  small: 10,
  medium: 14,
  large: 20,
  xlarge: 28,
  pill: 999,
} as const;

export const Typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800' as const },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800' as const },
  section: { fontSize: 16, lineHeight: 22, fontWeight: '700' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
