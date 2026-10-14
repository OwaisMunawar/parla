/**
 * Design tokens. Components read semantic roles (`surface`, `textMuted`),
 * never palette values, so light and dark differ only in this file.
 */
const palette = {
  cream: '#FBF8F3',
  paper: '#FFFFFF',
  sand: '#F1ECE3',
  ink: '#1B1736',
  inkSoft: '#5D5880',
  inkFaint: '#8E89AD',
  night: '#14122B',
  nightRaised: '#1E1A3B',
  nightSunken: '#0D0B1F',
  moon: '#F4F1FF',
  moonSoft: '#B4ADD6',
  moonFaint: '#7D77A3',
  violet: '#6C4DFF',
  violetSoft: '#ECE7FF',
  violetNight: '#9E8BFF',
  violetDeep: '#2C2563',
  ember: '#FF7A2F',
  emberSoft: '#FFE9DC',
  emberDeep: '#4A2412',
  mint: '#12A874',
  mintSoft: '#DCF5EA',
  mintDeep: '#0D3A2B',
  honey: '#E2950A',
  honeySoft: '#FCEFD2',
  honeyDeep: '#45320B',
  rose: '#E5484D',
  roseSoft: '#FCE2E3',
  roseDeep: '#4D1619',
} as const;

export type ColorRoles = {
  background: string;
  surface: string;
  surfaceSunken: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  flame: string;
  flameSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  scrim: string;
  shadow: string;
};

const light: ColorRoles = {
  background: palette.cream,
  surface: palette.paper,
  surfaceSunken: palette.sand,
  border: 'rgba(27, 23, 54, 0.08)',
  text: palette.ink,
  textMuted: palette.inkSoft,
  textFaint: palette.inkFaint,
  accent: palette.violet,
  accentSoft: palette.violetSoft,
  onAccent: '#FFFFFF',
  flame: palette.ember,
  flameSoft: palette.emberSoft,
  success: palette.mint,
  successSoft: palette.mintSoft,
  warning: palette.honey,
  warningSoft: palette.honeySoft,
  danger: palette.rose,
  dangerSoft: palette.roseSoft,
  scrim: 'rgba(20, 18, 43, 0.45)',
  shadow: 'rgba(27, 23, 54, 0.10)',
};

const dark: ColorRoles = {
  background: palette.night,
  surface: palette.nightRaised,
  surfaceSunken: palette.nightSunken,
  border: 'rgba(244, 241, 255, 0.08)',
  text: palette.moon,
  textMuted: palette.moonSoft,
  textFaint: palette.moonFaint,
  accent: palette.violetNight,
  accentSoft: palette.violetDeep,
  onAccent: '#14122B',
  flame: '#FF8A45',
  flameSoft: palette.emberDeep,
  success: '#3BD19A',
  successSoft: palette.mintDeep,
  warning: '#F2B33D',
  warningSoft: palette.honeyDeep,
  danger: '#FF6B70',
  dangerSoft: palette.roseDeep,
  scrim: 'rgba(0, 0, 0, 0.6)',
  shadow: 'rgba(0, 0, 0, 0.4)',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const typography = {
  hero: { fontSize: 56, lineHeight: 60, fontWeight: '900', letterSpacing: -1.5 },
  display: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.6 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.3 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400', letterSpacing: 0 },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600', letterSpacing: 0 },
  target: { fontSize: 22, lineHeight: 31, fontWeight: '600', letterSpacing: -0.2 },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '500', letterSpacing: 0 },
  caption: { fontSize: 13, lineHeight: 17, fontWeight: '500', letterSpacing: 0.1 },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 1 },
} as const;

export type TypographyVariant = keyof typeof typography;

export const motion = {
  fast: 160,
  base: 240,
  slow: 420,
  spring: { damping: 16, stiffness: 220, mass: 0.9 },
  bouncy: { damping: 10, stiffness: 180, mass: 0.8 },
} as const;

export type Theme = {
  scheme: 'light' | 'dark';
  colors: ColorRoles;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  motion: typeof motion;
};

export const themes: Record<Theme['scheme'], Theme> = {
  light: { scheme: 'light', colors: light, spacing, radii, typography, motion },
  dark: { scheme: 'dark', colors: dark, spacing, radii, typography, motion },
};
