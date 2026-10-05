/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

const DANGER = '#D93025';

export type PaletteColors = {
  text: string;
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  textSecondary: string;
  /** Fill for primary buttons and selected states. */
  accent: string;
  /** Text and icons drawn on top of `accent`. */
  onAccent: string;
  /** The accent when used as text or an underline on the plain background. */
  accentText: string;
  danger: string;
  /** Unfilled part of rings and bars. */
  track: string;
};

export const Colors: { light: PaletteColors; dark: PaletteColors } = {
  light: {
    text: '#1D2A1F',
    background: '#E7ECDF',
    backgroundElement: '#F6F7F1',
    backgroundSelected: '#D5DDC9',
    textSecondary: '#637062',
    accent: '#2F5D3A',
    onAccent: '#ffffff',
    accentText: '#2F5D3A',
    danger: DANGER,
    track: '#D5DDC9',
  },
  dark: {
    text: '#EDF2E8',
    background: '#0F1511',
    backgroundElement: '#19221C',
    backgroundSelected: '#26322A',
    textSecondary: '#9DAA9A',
    accent: '#8FCB8B',
    onAccent: '#0F1511',
    accentText: '#8FCB8B',
    danger: DANGER,
    track: '#26322A',
  },
};

/** Corner sizes: soft, rounded cards with pill-shaped buttons. */
export const Radii = {
  /** Cards, panels, dialogs. */
  card: 24,
  /** Text inputs, dropdowns, menus. */
  control: 16,
  /** Buttons and the small action chips. */
  button: 999,
  /** The track and thumb of the segmented control. */
  segmentTrack: 999,
  segment: 999,
} as const;

export const RingColors = {
  light: {
    calories: '#C96A3E',
    protein: '#A94A6E',
    carbs: '#D1A23B',
    fat: '#5B88B5',
    fiber: '#4F8A5B',
    sugar: '#9A7DB8',
    sodium: '#4E9A9A',
    over: '#D93025',
    check: '#4F8A5B',
  },
  dark: {
    calories: '#E58A5C',
    protein: '#D8799C',
    carbs: '#E6BE5E',
    fat: '#86AEDB',
    fiber: '#8FCB8B',
    sugar: '#B9A0D6',
    sodium: '#78BDBD',
    over: '#FF6B5E',
    check: '#8FCB8B',
  },
} as const;

export type ThemeColor = keyof PaletteColors;

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
