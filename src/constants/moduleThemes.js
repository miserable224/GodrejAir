/**
 * LedgerX module palettes — dark shell shared across ops modules.
 * Security (green), Housekeeping (amber), Water (sky).
 */
import { SEC as SECURITY, SEC_FONTS } from './securityTheme';

const shell = {
  bg: '#0b0e14',
  surface: '#161b22',
  surfaceRaised: '#1c2129',
  border: '#30363d',
  borderSubtle: '#21262d',
  text: '#f0f6fc',
  textMuted: '#9ca3af',
  textDim: '#6e7681',
  headerGradient: ['#161b22', '#0b0e14'],
};

export const SEC = {
  ...SECURITY,
  accent: SECURITY.green,
  accentDim: SECURITY.greenDim,
  accentBorder: SECURITY.greenBorder,
  saveAccent: SECURITY.green,
  saveOnAccent: SECURITY.bg,
};

export const HK = {
  ...shell,
  accent: '#f59e0b',
  accentDim: 'rgba(245, 158, 11, 0.14)',
  accentBorder: 'rgba(245, 158, 11, 0.4)',
  gold: '#f59e0b',
  goldDim: 'rgba(245, 158, 11, 0.12)',
  red: '#f87171',
  saveAccent: '#f59e0b',
  saveOnAccent: '#0b0e14',
  headerGradient: ['#1a1508', '#0b0e14'],
};

export const WATER = {
  ...shell,
  accent: '#38bdf8',
  accentDim: 'rgba(56, 189, 248, 0.14)',
  accentBorder: 'rgba(56, 189, 248, 0.4)',
  teal: '#38bdf8',
  tealDim: 'rgba(56, 189, 248, 0.12)',
  saveAccent: '#0ea5e9',
  saveOnAccent: '#0b0e14',
  headerGradient: ['#0c1929', '#0b0e14'],
};

export { SEC_FONTS };

export const MODULE_THEMES = { security: SEC, hk: HK, water: WATER };
