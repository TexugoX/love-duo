import { Platform } from 'react-native';

export const Palette = {
  // Base warm light tones
  background: '#FFF8F3',
  surface: '#FFFFFF',
  surfaceSubtle: '#FDF0E8',
  surfaceAccent: '#FBE4D6',

  // Terracotta & Soft Peach brand colors
  primary: '#D97757',
  primaryPressed: '#C15F40',
  primarySoft: '#F8DDD0',
  secondary: '#E89B82',
  secondarySoft: '#FCEBE4',

  // Semantic accents
  success: '#5E8F6E',
  successSoft: '#E8F3EC',
  warning: '#D4923A',
  warningSoft: '#FCF2E1',
  danger: '#C85A5A',
  dangerSoft: '#FCEBEB',
  info: '#6A8CAF',
  infoSoft: '#EAF1F8',

  // Typography colors (warm charcoal/espresso)
  text: '#2F231E',
  textSecondary: '#746158',
  textMuted: '#A7948B',
  textOnPrimary: '#FFFFFF',

  // Borders & Dividers
  border: '#EFE1D7',
  borderStrong: '#E0CBBF',
  shadow: '#7A4C38',
} as const;

export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  full: 9999,
} as const;

export const Typography = {
  h1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
  },
  h2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500' as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  captionBold: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600' as const,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
} as const;

export const CardShadow = Platform.select({
  ios: {
    shadowColor: Palette.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
  },
  android: {
    elevation: 3,
  },
  default: {
    boxShadow: '0px 6px 18px rgba(122, 76, 56, 0.08)',
  },
});

export const Theme = {
  colors: Palette,
  spacing: Spacing,
  radius: Radius,
  typography: Typography,
  shadow: CardShadow,
} as const;
