/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const AppPalette = {
  void: '#080710',
  surface: '#0F0D16',
  elevated: '#1E1830',
  muted: '#534A70',
  accent: '#7F77B2',
  text: '#CECBDD',
  success: '#8BE9A8',
  danger: '#FF7A9E',
};

const tintColorLight = AppPalette.accent;
const tintColorDark = AppPalette.text;

export const Colors = {
  light: {
    text: AppPalette.text,
    background: AppPalette.void,
    tint: tintColorLight,
    icon: AppPalette.muted,
    tabIconDefault: AppPalette.muted,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: AppPalette.text,
    background: AppPalette.void,
    tint: tintColorDark,
    icon: AppPalette.muted,
    tabIconDefault: AppPalette.muted,
    tabIconSelected: tintColorDark,
  },
};

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
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
