import { Platform } from 'react-native';

/** Login-screen palette — used app-wide for a consistent dark UI. */
export const DARK = {
  bg: '#070A10',
  card: '#0E1219',
  cardHighlight: '#141A24',
  input: '#161C28',
  inputBorder: '#252D3D',
  label: '#6B7280',
  text: '#F9FAFB',
  muted: '#9CA3AF',
  teal: '#3EE8C5',
  tealDim: 'rgba(62, 232, 197, 0.15)',
  yellow: '#F2C94C',
  yellowBright: '#FFE566',
  error: '#FCA5A5',
  warn: '#FCD34D',
  gradient: ['#00F5D4', '#4F8EF7', '#A855F7', '#F472B6'],
};

export const COLORS = {
  primary: DARK.teal,
  primaryLight: DARK.teal,
  primaryDark: DARK.bg,
  accent: DARK.yellow,
  accentLight: DARK.yellowBright,
  accentDark: '#C9A227',

  secondary: '#4F8EF7',
  secondaryLight: 'rgba(79, 142, 247, 0.2)',
  secondaryDark: '#3B6FD4',

  background: DARK.bg,
  surface: DARK.card,
  cardBg: DARK.cardHighlight,
  darkCard: DARK.card,

  textPrimary: DARK.text,
  textSecondary: DARK.muted,
  textLight: DARK.label,
  textWhite: '#FFFFFF',

  success: '#34D399',
  warning: DARK.warn,
  danger: '#F87171',
  info: '#60A5FA',

  gradientPrimary: DARK.gradient,
  gradientCard: [DARK.card, DARK.cardHighlight],
  gradientHero: [DARK.bg, DARK.card, DARK.cardHighlight],
  gradientTeal: [DARK.teal, '#4F8EF7'],

  adminHeaderGradient: [DARK.bg, DARK.card, DARK.cardHighlight],
  residentHeaderSolid: DARK.card,

  border: DARK.inputBorder,
  shadow: 'rgba(0, 0, 0, 0.35)',
  overlay: 'rgba(7, 10, 16, 0.75)',
  white: '#FFFFFF',
  black: '#000000',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  light: 'System',
};

export const SIZES = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,

  radiusXs: 4,
  radiusSm: 10,
  radiusMd: 14,
  radiusLg: 18,
  radiusXl: 22,
  radiusFull: 999,

  fontXs: 11,
  fontSm: 13,
  fontMd: 15,
  fontLg: 17,
  fontXl: 20,
  fontXxl: 24,
  fontTitle: 28,
  fontHero: 34,

  iconSm: 16,
  iconMd: 22,
  iconLg: 28,
  iconXl: 36,
};

export const SHADOWS = {
  small: Platform.select({
    web: { boxShadow: '0 2px 12px rgba(0, 0, 0, 0.25)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
    },
  }),
  medium: Platform.select({
    web: { boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 245, 212, 0.06)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 6,
    },
  }),
  large: Platform.select({
    web: { boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35), 0 0 32px rgba(168, 85, 247, 0.08)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
      elevation: 10,
    },
  }),
};

export function getProgressBarColor(percent) {
  const p = typeof percent === 'number' && !Number.isNaN(percent) ? percent : 0;
  if (p > 80) return COLORS.success;
  if (p > 60) return COLORS.warning;
  if (p > 30) return DARK.yellow;
  return COLORS.danger;
}

/** Split brand wordmark (login style). */
export const brandTextStyles = {
  row: { flexDirection: 'row', alignItems: 'center' },
  godrej: {
    fontSize: 22,
    fontWeight: '800',
    color: DARK.teal,
    letterSpacing: -0.5,
  },
  air: {
    fontSize: 22,
    fontWeight: '800',
    color: DARK.text,
    letterSpacing: -0.5,
  },
};
