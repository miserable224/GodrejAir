/**
 * LedgerX-inspired palette for the Security module.
 * Dark dashboard: green = positive/LIVE, red = shortage, gold = active, teal = tags.
 */
export const SEC = {
  bg: '#0b0e14',
  surface: '#161b22',
  surfaceRaised: '#1c2129',
  border: '#30363d',
  borderSubtle: '#21262d',

  text: '#f0f6fc',
  textMuted: '#9ca3af',
  textDim: '#6e7681',

  green: '#4ade80',
  greenDim: 'rgba(74, 222, 128, 0.14)',
  greenBorder: 'rgba(74, 222, 128, 0.35)',

  red: '#f87171',
  redDim: 'rgba(248, 113, 113, 0.14)',
  redBorder: 'rgba(248, 113, 113, 0.35)',

  gold: '#eab308',
  goldDim: 'rgba(234, 179, 8, 0.12)',
  goldBorder: 'rgba(234, 179, 8, 0.55)',

  teal: '#2dd4bf',
  tealDim: 'rgba(45, 212, 191, 0.14)',

  purple: '#7c3aed',
  purpleBg: 'rgba(59, 7, 100, 0.45)',
  purpleBorder: 'rgba(124, 58, 237, 0.4)',

  headerGradient: ['#161b22', '#0b0e14'],
};

export const SEC_FONTS = {
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: SEC.text,
  },
  modalHint: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    color: SEC.textMuted,
  },
};

/** Shared placeholder color for security form fields */
export const SEC_PLACEHOLDER = SEC.textDim;
